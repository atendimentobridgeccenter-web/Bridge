// Supabase Edge Function: stripe-webhook-handler — Enterprise Edition
// Runtime: Deno
//
// ── Arquitectura de segurança e resiliência ──────────────────────────────────
//
//  LAYER 1 — Autenticidade (Stripe-Signature)
//    Toda requisição é verificada com constructEventAsync antes de qualquer
//    processamento. Payload adulterado ou sem assinatura → 400 imediato.
//
//  LAYER 2 — Idempotência (stripe_events table)
//    Antes de processar: SELECT para verificar se o evento já foi processado.
//    Depois de conceder acesso: INSERT na tabela de idempotência.
//    O registo SÓ é gravado após o acesso ser efectivamente concedido.
//    Se a gravação falhar com 23505 (PK conflict) → delivery concorrente,
//    estado já correcto, retorna 200 sem re-processar.
//
//  LAYER 3 — Autorização (service_role + RLS)
//    user_access é inserido exclusivamente via service_role.
//    Nenhum cliente pode chamar esta função directamente.
//    RLS bloqueia qualquer tentativa client-side.
//
//  LAYER 4 — Resiliência (Stripe retry protocol)
//    Qualquer erro ANTES de gravar o registo de idempotência retorna 500.
//    O Stripe re-tenta automaticamente com back-off exponencial.
//    O retry encontrará o mesmo caminho e concluirá correctamente.
//    O upsert em user_access é safe para re-execuções (onConflict: ignore).
//
// ── Fluxo de um evento checkout.session.completed ────────────────────────────
//
//   1. Verificar Stripe-Signature        → 400 se inválida
//   2. Filtrar tipo do evento            → 200 se não for checkout.session.completed
//   3. Verificar idempotência            → 200 se evento já processado
//   4. Validar metadata (email, product) → 422 se dados ausentes
//   5. Verificar produto no DB           → 422 se produto não existe
//   6. Localizar ou criar Auth user      → 500 se falha (Stripe retenta)
//   7. Gravar user_access (upsert)       → 500 se falha (Stripe retenta)
//   8. Confirmar o lead em public.leads  → 500 se falha, SEM marcar o evento (Stripe retenta)
//   9. Marcar evento como processado     → 200 se OK, 200 se PK conflict
//  10. Gerar magic link (best-effort)    → fire-and-forget
//  11. Retornar 200
//
// NOTA (OS-008): o antigo STEP 10, que actualizava a tabela legada
// `bridge_leads`, foi removido. `bridge_leads` é do fluxo antigo (FormRunner)
// e está trancada para escrita (migration 033) — não há mais nenhum lead
// activo nela para esta função actualizar.
//
// NOTA (OS-003): este endpoint concentra a confirmação do lead porque o
// `stripe-webhook` e este `-handler` liam o mesmo STRIPE_WEBHOOK_SECRET do
// projeto — mas cada endpoint do Stripe tem o seu próprio signing secret, então
// na prática só um dos dois validava a assinatura. O `stripe-webhook` foi
// marcado como descontinuado; esta função passou a ser a única fonte de
// confirmação de pagamento do lado do servidor.

import Stripe from 'npm:stripe@14'
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'

// ── Environment secrets ───────────────────────────────────────────────────────
// Lidos uma vez no cold-start. Se algum estiver ausente, a função falha com log
// claro antes de qualquer requisição.

const STRIPE_SECRET_KEY     = Deno.env.get('STRIPE_SECRET_KEY')        ?? ''
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')     ?? ''
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')              ?? ''
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SITE_URL              = Deno.env.get('SITE_URL')                  ?? 'http://localhost:5173'

// Validação de secrets na inicialização — falha antes de servir qualquer pedido
const MISSING = [
  !STRIPE_SECRET_KEY     && 'STRIPE_SECRET_KEY',
  !STRIPE_WEBHOOK_SECRET && 'STRIPE_WEBHOOK_SECRET',
  !SUPABASE_URL          && 'SUPABASE_URL',
  !SUPABASE_SERVICE_KEY  && 'SUPABASE_SERVICE_ROLE_KEY',
].filter(Boolean)

if (MISSING.length > 0) {
  console.error('[webhook] FATAL: Missing required secrets:', MISSING.join(', '))
}

// ── Clients ───────────────────────────────────────────────────────────────────

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion:  '2024-04-10',
  httpClient:  Stripe.createFetchHttpClient(),
})

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Localiza usuário por email usando a API GoTrue admin com search param.
// Evita carregar todos os utilizadores em memória (O(n) → O(1)).
async function findUserByEmail(email: string): Promise<string | null> {
  const url = new URL(`${SUPABASE_URL}/auth/v1/admin/users`)
  url.searchParams.set('filter', `email=="${email}"`)
  url.searchParams.set('per_page', '10')

  const res = await fetch(url.toString(), {
    headers: {
      apikey:        SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  })

  if (!res.ok) {
    console.warn('[webhook] GoTrue user search returned non-200:', res.status)
    return null
  }

  const data = await res.json() as { users?: { id: string; email: string }[] }
  const match = (data.users ?? []).find(
    u => u.email?.toLowerCase() === email.toLowerCase()
  )
  return match?.id ?? null
}

// Confirma o pagamento do lead em public.leads (OS-003). Nunca lança — toda
// falha é capturada e reportada como { ok: false } para o caller decidir o
// status HTTP. Três caminhos, nesta ordem:
//   1. metadata.lead_id, se presente e existente.
//   2. fallback: lead 'pending' mais recente com o mesmo email + product_id.
//   3. nenhum lead existe → cria um já pago, com o nome disponível (`opts.name`;
//      sem ele, a migration 022 grava "Sem nome — revisar" no rascunho do
//      aluno). O pagamento existe, o lead não pode sumir: insere como
//      'pending' e só então atualiza para 'confirmed', porque o gatilho da
//      migration 022 só dispara em UPDATE, nunca em INSERT que já nasce
//      confirmado.
async function confirmLead(
  supabaseAdmin: SupabaseClient,
  opts: { leadId: string | null; email: string; name: string | null; productId: string; sessionId: string },
): Promise<{ ok: boolean; leadId?: string }> {
  const patch = {
    payment_status:    'confirmed',
    stripe_session_id: opts.sessionId,
    paid_at:            new Date().toISOString(),
  }

  try {
    // ── Caminho 1: lead_id explícito ────────────────────────────────────────
    if (opts.leadId) {
      const { data: updated, error: updErr } = await supabaseAdmin
        .from('leads')
        .update(patch)
        .eq('id', opts.leadId)
        .neq('payment_status', 'confirmed')
        .select('id')

      if (updErr) {
        console.error('[webhook] confirmLead: update por lead_id falhou:', { leadId: opts.leadId, error: updErr.message })
        return { ok: false }
      }

      if (updated && updated.length > 0) {
        return { ok: true, leadId: updated[0].id }
      }

      // 0 linhas afetadas: ou já estava confirmed (idempotente, sucesso),
      // ou o id não existe (dado estranho) — recheca antes de decidir.
      const { data: existing, error: checkErr } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('id', opts.leadId)
        .maybeSingle()

      if (checkErr) {
        console.error('[webhook] confirmLead: recheck por lead_id falhou:', { leadId: opts.leadId, error: checkErr.message })
        return { ok: false }
      }

      if (existing) {
        // Já confirmado por uma entrega anterior do mesmo evento — idempotente.
        return { ok: true, leadId: existing.id }
      }

      console.warn('[webhook] confirmLead: lead_id não encontrado, tentando fallback por email+produto:', { leadId: opts.leadId })
    }

    // ── Caminho 2: fallback por email (case-insensitive) + produto ──────────
    // `ilike` trata `%` e `_` como curingas do próprio operador — um e-mail com
    // `_` (comum: joao_silva@…) casaria com qualquer outro e-mail que tenha
    // qualquer caractere naquela posição, podendo atribuir o pagamento ao lead
    // de outra pessoa. Escapamos antes de montar o padrão (Gate 2, OS-003).
    const escapedEmail = opts.email.replace(/[\\%_]/g, c => '\\' + c)

    const { data: candidate, error: findErr } = await supabaseAdmin
      .from('leads')
      .select('id')
      .ilike('email', escapedEmail)
      .eq('product_id', opts.productId)
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (findErr) {
      console.error('[webhook] confirmLead: busca por email+produto falhou:', { email: opts.email, productId: opts.productId, error: findErr.message })
      return { ok: false }
    }

    if (candidate) {
      const { error: updErr2 } = await supabaseAdmin
        .from('leads')
        .update(patch)
        .eq('id', candidate.id)
        .neq('payment_status', 'confirmed')

      if (updErr2) {
        console.error('[webhook] confirmLead: update do fallback falhou:', { leadId: candidate.id, error: updErr2.message })
        return { ok: false }
      }
      return { ok: true, leadId: candidate.id }
    }

    // ── Caminho 3: nenhum lead existe — cria um já pago ──────────────────────
    const { data: created, error: createErr } = await supabaseAdmin
      .from('leads')
      .insert({
        email:          opts.email,
        name:           opts.name,
        product_id:     opts.productId,
        payment_status: 'pending',
        qualified:      true,
      })
      .select('id')
      .single()

    if (createErr || !created) {
      console.error('[webhook] confirmLead: criação do lead falhou:', { email: opts.email, productId: opts.productId, error: createErr?.message })
      return { ok: false }
    }

    // UPDATE separado do INSERT de propósito: o gatilho da 022 só dispara em
    // "after update of payment_status", não num insert que já nasce 'confirmed'.
    const { error: confirmErr } = await supabaseAdmin
      .from('leads')
      .update(patch)
      .eq('id', created.id)

    if (confirmErr) {
      console.error('[webhook] confirmLead: confirmação do lead recém-criado falhou:', { leadId: created.id, error: confirmErr.message })
      return { ok: false }
    }

    console.log('[webhook] confirmLead: nenhum lead prévio — criado e confirmado:', { leadId: created.id, email: opts.email, productId: opts.productId })
    return { ok: true, leadId: created.id }
  } catch (err) {
    console.error('[webhook] confirmLead: erro inesperado:', err)
    return { ok: false }
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {

  // ── LAYER 1: Autenticidade ────────────────────────────────────────────────

  if (MISSING.length > 0) {
    return json({ error: 'Webhook misconfigured — check function secrets' }, 500)
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    console.warn('[webhook] Rejected: missing Stripe-Signature header')
    return json({ error: 'Missing Stripe-Signature header' }, 400)
  }

  // Lemos o body como texto RAW antes de qualquer parse.
  // constructEventAsync exige o payload bruto para validar a assinatura HMAC.
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[webhook] Signature verification FAILED:', msg)
    return json({ error: 'Invalid or tampered Stripe signature' }, 400)
  }

  // ── Filtro de tipo ────────────────────────────────────────────────────────

  if (event.type !== 'checkout.session.completed') {
    console.log('[webhook] Event ignored (not checkout.session.completed):', event.type, event.id)
    return json({ received: true, skipped: event.type }, 200)
  }

  const session   = event.data.object as Stripe.Checkout.Session
  const eventId   = event.id
  const sessionId = session.id

  // ── LAYER 2: Idempotência — CHECK ────────────────────────────────────────
  // O registo só existe se o evento foi processado com sucesso anteriormente.

  const { data: existingEvent, error: idempotencyReadErr } = await supabaseAdmin
    .from('stripe_events')
    .select('stripe_event_id, processed_at')
    .eq('stripe_event_id', eventId)
    .maybeSingle()

  if (idempotencyReadErr) {
    // DB error ao verificar idempotência — falha segura: não processa, retorna 500
    console.error('[webhook] Failed to check idempotency table:', {
      eventId,
      error: idempotencyReadErr.message,
    })
    return json({ error: 'Idempotency check failed' }, 500)
  }

  if (existingEvent) {
    console.log('[webhook] Idempotency hit — already processed:', {
      eventId,
      processedAt: existingEvent.processed_at,
    })
    return json({ received: true, idempotent: true, event_id: eventId }, 200)
  }

  // ── LAYER 4: Extracção e validação de metadata ────────────────────────────

  const email     = session.customer_details?.email ?? session.customer_email ?? null
  const productId = session.metadata?.product_id ?? null

  // lead_id, lead_email e lead_name vêm do create-checkout-session; '' conta
  // como ausente (create-checkout-session sempre manda a chave, mesmo vazia).
  const rawLeadId    = session.metadata?.lead_id ?? ''
  const leadId       = rawLeadId.trim() !== '' ? rawLeadId.trim() : null
  const rawLeadEmail = session.metadata?.lead_email ?? ''
  const leadEmailRaw = rawLeadEmail.trim() !== '' ? rawLeadEmail.trim() : null
  const rawLeadName  = session.metadata?.lead_name ?? ''
  // Nome do lead (formulário) tem prioridade; senão o nome que o Stripe
  // coletou no Checkout. Usado só se um lead novo precisar ser criado
  // (caminho 3 do confirmLead) — string vazia conta como ausente.
  const leadName     = rawLeadName.trim() !== ''
    ? rawLeadName.trim()
    : (session.customer_details?.name?.trim() || null)

  console.log('[webhook] Processing event:', {
    eventId,
    sessionId,
    email:     email     ?? '[MISSING]',
    productId: productId ?? '[MISSING]',
  })

  if (!email) {
    console.error('[webhook] CANNOT_PROCESS: Missing customer email:', {
      eventId,
      sessionId,
      customerDetails: session.customer_details,
      metadata:        session.metadata,
      resolution:      'Ensure the checkout was created with customer_email or that Stripe collected it',
    })
    // 422: re-tentar não vai ajudar — dados estruturalmente inválidos
    return json({ error: 'Missing customer email — access not granted' }, 422)
  }

  if (!productId) {
    console.error('[webhook] CANNOT_PROCESS: Missing product_id in session metadata:', {
      eventId,
      sessionId,
      metadata:   session.metadata,
      resolution: 'Ensure create-checkout-session sets metadata.product_id',
    })
    return json({ error: 'Missing product_id in metadata — access not granted' }, 422)
  }

  // ── Verificação do produto no DB ──────────────────────────────────────────

  const { data: product, error: prodErr } = await supabaseAdmin
    .from('products')
    .select('id, name, slug')
    .eq('id', productId)
    .single()

  if (prodErr || !product) {
    console.error('[webhook] Product not found in DB:', {
      productId,
      eventId,
      error: prodErr?.message,
    })
    // 422: produto genuinamente inexistente — retry não ajuda
    return json({ error: 'Product not found — access not granted' }, 422)
  }

  // ── LAYER 3: Localizar ou criar Auth user ─────────────────────────────────
  // Estratégia: tenta criar primeiro (path mais comum para novos clientes).
  // Se falhar por utilizador existente, localiza via GoTrue search API (O(1)).

  let userId:    string
  let isNewUser: boolean = false

  const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm:  true,
    user_metadata:  {
      source:     'stripe_checkout',
      product_id: productId,
    },
  })

  if (createdUser?.user) {
    userId    = createdUser.user.id
    isNewUser = true
    console.log('[webhook] New Auth user created:', { userId, email })
  } else {
    // Utilizador já existe — localiza pelo email
    console.log('[webhook] createUser returned error (user likely exists):', {
      email,
      errorMessage: createErr?.message,
    })

    // Tentativa 1: GoTrue search API (rápido, O(1))
    const foundId = await findUserByEmail(email)

    if (foundId) {
      userId = foundId
      console.log('[webhook] Existing user found via GoTrue search:', { userId, email })
    } else {
      // Tentativa 2: fallback paginado (último recurso)
      console.warn('[webhook] GoTrue search returned no result — falling back to listUsers:', email)
      const { data: userList, error: listErr } = await supabaseAdmin.auth.admin.listUsers()

      if (listErr) {
        console.error('[webhook] CRITICAL: listUsers failed:', { email, error: listErr.message })
        return json({ error: 'Cannot locate user account — will retry' }, 500)
      }

      const found = userList?.users?.find(
        (u: { email?: string; id: string }) => u.email?.toLowerCase() === email.toLowerCase()
      )

      if (!found) {
        console.error('[webhook] CRITICAL: User not found by any method:', {
          email,
          createErrMsg: createErr?.message,
        })
        return json({ error: 'Cannot create or locate user account — will retry' }, 500)
      }

      userId = found.id
      console.log('[webhook] Existing user found via listUsers fallback:', { userId, email })
    }
  }

  // ── LAYER 3: Gravar user_access — ponto crítico ───────────────────────────
  // Este é o único caminho pelo qual o acesso pode ser concedido (RLS enforced).
  // upsert com onConflict garante safe re-execução em caso de retry do Stripe.

  const { error: accessErr } = await supabaseAdmin
    .from('user_access')
    .upsert(
      {
        user_id:           userId,
        product_id:        productId,
        purchased_at:      new Date().toISOString(),
        stripe_session_id: sessionId,
      },
      { onConflict: 'user_id,product_id' },
    )

  if (accessErr) {
    console.error('[webhook] CRITICAL: user_access grant FAILED:', {
      userId,
      productId,
      sessionId,
      email,
      errorMessage: accessErr.message,
      errorCode:    accessErr.code,
      action:       'Stripe will retry — idempotency record NOT written yet, retry is safe',
    })
    // Retorna 500 → Stripe re-tenta → idempotência não foi gravada → retry processa normalmente
    return json({ error: 'Failed to grant product access — will retry' }, 500)
  }

  console.log('[webhook] user_access granted:', { userId, productId, email, sessionId })

  // ── STEP 8: Confirmar o lead em public.leads — ponto crítico ─────────────
  // E-mail do lead (formulário) tem prioridade sobre o e-mail que o Stripe
  // coletou no Checkout — podem ser pessoas diferentes (quem paga ≠ quem se
  // inscreve). `email` já foi validado como não-nulo acima.
  const leadEmail = leadEmailRaw ?? email

  const leadResult = await confirmLead(supabaseAdmin, {
    leadId,
    email:     leadEmail,
    name:      leadName,
    productId,
    sessionId,
  })

  if (!leadResult.ok) {
    console.error('[webhook] CRITICAL: confirmLead FAILED — lead not confirmed:', {
      eventId,
      sessionId,
      leadId,
      email: leadEmail,
      productId,
      action: 'Stripe will retry — stripe_events NOT written yet, retry is safe. user_access já foi concedido.',
    })
    // Retorna 500 → Stripe re-tenta. stripe_events ainda não foi gravado, então
    // o retry refaz este passo (user_access é idempotente via upsert).
    return json({ error: 'Failed to confirm lead — will retry' }, 500)
  }

  console.log('[webhook] Lead confirmado em public.leads:', { leadId: leadResult.leadId, email: leadEmail, productId })

  // ── LAYER 2: Idempotência — MARK ─────────────────────────────────────────
  // Escrito SOMENTE APÓS o acesso ser concedido com sucesso.
  // Satisfaz a constraint: "Só grave como processado se o acesso foi garantido."

  const { error: markErr } = await supabaseAdmin
    .from('stripe_events')
    .insert({
      stripe_event_id: eventId,
      type:            event.type,
      payload:         session as unknown as Record<string, unknown>,
    })

  if (markErr) {
    if (markErr.code === '23505') {
      // PK conflict: delivery concorrente já marcou o evento — estado correcto
      console.log('[webhook] Concurrent delivery: event already marked by parallel handler:', eventId)
    } else {
      // Falha ao gravar idempotência mas acesso JÁ foi concedido
      // Log de auditoria crítico — admin deve monitorizar para re-tentativas futuras
      console.error('[webhook] WARNING: Access granted but idempotency record FAILED:', {
        eventId,
        errorMessage: markErr.message,
        errorCode:    markErr.code,
        userId,
        productId,
        email,
        action: 'Monitor Stripe dashboard for manual retries of this event. user_access upsert is safe.',
      })
      // Retorna 200 mesmo assim — o cliente TEM acesso, não podemos causar mais retries
    }
  }

  // ── STEP 10: Gerar magic link de boas-vindas (best-effort) ───────────────
  // Não-crítico: o utilizador já tem acesso e pode fazer login normalmente.
  // Em produção: substituir o console.log por chamada ao seu email provider
  // (Resend, SendGrid, Postmark, etc.).

  try {
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type:  'magiclink',
      email,
      options: { redirectTo: `${SITE_URL}/my-products` },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      console.warn('[webhook] Magic link generation failed (non-critical):', {
        email,
        error: linkErr?.message,
      })
    } else {
      // ── PRODUÇÃO: substitua por chamada ao email provider ──────────────
      //
      // Exemplo com Resend:
      //
      // await fetch('https://api.resend.com/emails', {
      //   method:  'POST',
      //   headers: {
      //     Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     from:    'Bridge <noreply@seudominio.com>',
      //     to:      [email],
      //     subject: `Seu acesso ao ${product.name} foi liberado!`,
      //     html: `
      //       <h2>Bem-vindo ao ${product.name}!</h2>
      //       <p>Clique no link abaixo para acessar:</p>
      //       <a href="${linkData.properties.action_link}">Acessar meu produto</a>
      //     `,
      //   }),
      // })

      // Nunca logar o action_link: é um link de login válido — qualquer um
      // com acesso aos logs entraria direto na conta do aluno.
      console.log('[webhook] Magic link gerado (não enviado):', { email })
    }
  } catch (magicLinkErr) {
    console.warn('[webhook] Magic link step threw (non-critical):', magicLinkErr)
  }

  // ── STEP 11: Sucesso ──────────────────────────────────────────────────────

  console.log('[webhook] Event fully processed:', {
    eventId,
    sessionId,
    email,
    productId,
    productName: product.name,
    userId,
    isNewUser,
  })

  return json({
    received:    true,
    event_id:    eventId,
    user_id:     userId,
    product_id:  productId,
    is_new_user: isNewUser,
  }, 200)
})

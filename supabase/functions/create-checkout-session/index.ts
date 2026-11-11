// Supabase Edge Function: create-checkout-session
// Runtime: Deno
//
// Security model:
//   1. Receive { productId, priceId?, priceIds?, email, name, lead? }
//      - priceIds[] (array) is used by FormRunner (multi-item pricing engine)
//      - priceId  (single) is used by QuizzRunner (single selection)
//      Both formats are supported; priceIds takes precedence.
//      - lead? is an optional, server-validated block (answers, utm_*, referrer).
//      - Nenhum leadId é lido do corpo da requisição (OS-004): o id do lead
//        nasce aqui, com a service_role, nunca no navegador.
//   2. Load the product from DB using service role key (bypasses RLS)
//   3. Build the set of ALLOWED price IDs server-side:
//        a. product.price_id_stripe  (the main price)
//        b. Every priceId in form_logic_config (FormSchema: allowed_price_ids)
//        c. Every optionPrice in form_logic_config (FormNode: nodes[*].optionPrices)
//   4. Reject with 403 if any submitted priceId is not in the allowed set.
//   5. Reaproveitar (OS-014) ou criar o lead 'pending' em public.leads com a
//      service_role — antes da sessão existir, para que todo pagamento tenha
//      lead. Se já existe um lead 'none' recente (≤2h) do mesmo e-mail
//      (comparação exata em minúsculas, feita no servidor — nunca ilike) e
//      produto — ex.: o formulário já gravou respostas no resumo do fim
//      (QuizzRunner) — promove-o para 'pending' em vez de criar um segundo
//      lead duplicado. Falha aqui → 500, sem criar a sessão.
//   6. Retrieve the first Stripe Price to determine mode (payment vs subscription).
//   7. Create Stripe Checkout Session — line_items reference Prices by ID only.
//      No unit_amount is ever passed from the frontend. metadata.lead_id é o id
//      do lead criado no passo 5 (nunca o do cliente).
//   8. Return { url, leadId } — leadId é novo; quem só lê url continua igual.

import Stripe from 'npm:stripe@14'
import { createClient } from 'npm:@supabase/supabase-js@2'

// ── Clients ───────────────────────────────────────────────────

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')             ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

// ── Types ─────────────────────────────────────────────────────

interface OptionPrice {
  priceId:  string
  label:    string
  amount:   number
  currency: string
}

interface FormNode {
  id:                     string
  type:                   string
  options:                string[]
  optionPrices?:          Record<string, OptionPrice>
  logicJumps:             unknown[]
  stripeCheckoutPriceId?: string
}

// Bloco opcional enviado pelo formulário ao criar a sessão. Só estes campos —
// nenhum dado de pagamento, nenhum leadId (OS-004).
interface LeadInput {
  answers?:      Record<string, unknown>
  utm_source?:   string
  utm_medium?:   string
  utm_campaign?: string
  utm_term?:     string
  utm_content?:  string
  referrer?:     string
}

interface SanitizedLeadFields {
  answers:      Record<string, unknown>
  utm_source:   string | null
  utm_medium:   string | null
  utm_campaign: string | null
  utm_term:     string | null
  utm_content:  string | null
  referrer:     string | null
}

// ── Helpers ───────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// String vazia (ou não-string) vira null antes de gravar — mesma regra do
// front (src/lib/emptyToNull.ts), reimplementada aqui porque Edge Functions
// (Deno) não importam de src/.
function emptyToNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function clipText(value: unknown, maxLength: number): string | null {
  const s = emptyToNull(value)
  return s ? s.slice(0, maxLength) : null
}

// Valida e limita o bloco opcional `lead` do corpo da requisição. Aceita só
// os campos abaixo — nada de pagamento, nada de leadId do cliente (OS-004).
function sanitizeLeadInput(lead: unknown): SanitizedLeadFields {
  const l: LeadInput = (lead && typeof lead === 'object' && !Array.isArray(lead))
    ? lead as LeadInput
    : {}

  const rawAnswers = (l.answers && typeof l.answers === 'object' && !Array.isArray(l.answers))
    ? l.answers
    : {}

  // Limite de tamanho razoável: mesma exposição do INSERT público de hoje
  // (qualquer um pode inserir um lead), só não a agrava com payloads enormes.
  const answers = JSON.stringify(rawAnswers).length <= 20_000 ? rawAnswers : {}

  return {
    answers,
    utm_source:   clipText(l.utm_source,   300),
    utm_medium:   clipText(l.utm_medium,   300),
    utm_campaign: clipText(l.utm_campaign, 300),
    utm_term:     clipText(l.utm_term,     300),
    utm_content:  clipText(l.utm_content,  300),
    referrer:     clipText(l.referrer,     2000),
  }
}

function buildAllowedPriceIds(product: {
  price_id_stripe:   string | null
  form_logic_config: unknown
  checkout_config:   unknown
}): Set<string> {
  const allowed = new Set<string>()

  if (product.price_id_stripe) {
    allowed.add(product.price_id_stripe)
  }

  // Extra prices configured in checkout_config.extra_price_ids
  const checkoutCfg = product.checkout_config as Record<string, unknown> | null
  if (Array.isArray(checkoutCfg?.extra_price_ids)) {
    for (const pid of checkoutCfg.extra_price_ids as string[]) {
      if (pid) allowed.add(pid)
    }
  }

  const cfg = product.form_logic_config as Record<string, unknown> | null

  // FormSchema format: explicit allowed_price_ids whitelist
  if (Array.isArray(cfg?.allowed_price_ids)) {
    for (const pid of cfg.allowed_price_ids as string[]) {
      if (pid) allowed.add(pid)
    }
  }

  // FormNode format: walk nodes and collect all priceIds
  if (Array.isArray(cfg?.nodes)) {
    for (const node of cfg.nodes as FormNode[]) {
      // option prices (from radio/select questions)
      if (node.optionPrices) {
        for (const op of Object.values(node.optionPrices)) {
          if (op?.priceId) allowed.add(op.priceId)
        }
      }
      // stripe-checkout node price override
      if (node.stripeCheckoutPriceId) {
        allowed.add(node.stripeCheckoutPriceId)
      }
    }
  }

  return allowed
}

// ── Handler ───────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    // ── 1. Parse payload ────────────────────────────────────────
    // priceIds[] comes from FormRunner (multi-item pricing engine)
    // priceId (single) comes from QuizzRunner (single option selection)
    // Nenhum leadId é lido do cliente (OS-004) — nasce no passo 5, aqui no servidor.
    const { productId, priceId, priceIds: priceIdsArr, email, name, successPath, lead } = await req.json() as {
      productId:    string
      priceId?:     string
      priceIds?:    string[]
      email?:       string
      name?:        string
      successPath?: string
      lead?:        unknown
    }

    const resolvedPriceIds: string[] = priceIdsArr?.length
      ? priceIdsArr
      : priceId ? [priceId] : []

    if (!productId || resolvedPriceIds.length === 0) {
      return json({ error: 'productId and at least one priceId are required.' }, 400)
    }

    for (const pid of resolvedPriceIds) {
      if (!pid.startsWith('price_')) {
        return json({ error: `Invalid priceId format: ${pid}` }, 400)
      }
    }

    // ── 2. Load product from DB ─────────────────────────────────
    const { data: product, error: dbErr } = await supabaseAdmin
      .from('products')
      .select('id, name, price_id_stripe, form_logic_config, checkout_config, status')
      .eq('id', productId)
      .single()

    if (dbErr || !product) {
      return json({ error: 'Product not found.' }, 404)
    }

    if (product.status === 'archived') {
      return json({ error: 'Product is no longer available.' }, 403)
    }

    // ── 3. Validate every priceId server-side ───────────────────
    const allowed = buildAllowedPriceIds(product)
    const invalid = resolvedPriceIds.filter(p => !allowed.has(p))

    if (invalid.length > 0) {
      console.error(
        `[create-checkout-session] Rejected price_ids=[${invalid.join(', ')}] for productId="${productId}". Allowed: [${[...allowed].join(', ')}]`
      )
      return json({ error: 'One or more price IDs are not available for this product.' }, 403)
    }

    // ── 4. Reaproveitar lead 'none' do formulário (OS-014) ou criar novo ─
    const leadFields = sanitizeLeadInput(lead)
    const normalizedEmail = emptyToNull(email)?.toLowerCase() ?? null

    let leadId: string | null = null
    let leadPath: 'reaproveitado' | 'criado' = 'criado'

    if (normalizedEmail) {
      // Igualdade exata em minúsculas, nunca ilike (evita varrer por
      // wildcard e evita pegar lead de outra pessoa). A comparação é feita
      // aqui, em memória, sobre um conjunto já estreito: mesmo produto,
      // só 'none', só os últimos 2h.
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

      const { data: candidates, error: findErr } = await supabaseAdmin
        .from('leads')
        .select('id, name, utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer, answers, email')
        .eq('product_id', productId)
        .eq('payment_status', 'none')
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: false })
        .limit(50)

      if (findErr) {
        console.error('[create-checkout-session] Lead reuse lookup failed (falling back to insert):', {
          productId,
          error: findErr.message,
        })
      }

      const existingLead = candidates?.find(
        c => typeof c.email === 'string' && c.email.toLowerCase() === normalizedEmail,
      )

      if (existingLead) {
        const hasAnswers = existingLead.answers && typeof existingLead.answers === 'object'
          && Object.keys(existingLead.answers as Record<string, unknown>).length > 0

        const patch: Record<string, unknown> = {
          payment_status: 'pending',
          name:           existingLead.name         ?? emptyToNull(name),
          utm_source:     existingLead.utm_source    ?? leadFields.utm_source,
          utm_medium:     existingLead.utm_medium    ?? leadFields.utm_medium,
          utm_campaign:   existingLead.utm_campaign  ?? leadFields.utm_campaign,
          utm_term:       existingLead.utm_term      ?? leadFields.utm_term,
          utm_content:    existingLead.utm_content   ?? leadFields.utm_content,
          referrer:       existingLead.referrer      ?? leadFields.referrer,
          answers:        hasAnswers ? existingLead.answers : leadFields.answers,
        }

        const { data: updated, error: updErr } = await supabaseAdmin
          .from('leads')
          .update(patch)
          .eq('id', existingLead.id)
          .eq('payment_status', 'none') // guarda contra corrida entre duas abas
          .select('id')

        if (updErr) {
          console.error('[create-checkout-session] Lead reuse update failed (falling back to insert):', {
            leadId: existingLead.id,
            error: updErr.message,
          })
        } else if (updated && updated.length > 0) {
          leadId   = updated[0].id as string
          leadPath = 'reaproveitado'
        }
        // updated.length === 0 → outra aba já promoveu esse lead (corrida);
        // cai no INSERT normal abaixo, sem reaproveitar.
      }
    }

    if (!leadId) {
      // Sempre cria aqui quando não há lead para reaproveitar — todo
      // pagamento tem lead, e o id vem do servidor. Falha aqui → 500 e
      // nenhuma sessão é criada (sem lead não há como confirmar o
      // pagamento depois, no webhook da OS-003).
      const { data: leadRow, error: leadErr } = await supabaseAdmin
        .from('leads')
        .insert({
          product_id:     productId,
          email:          emptyToNull(email),
          name:           emptyToNull(name),
          payment_status: 'pending',
          ...leadFields,
        })
        .select('id')
        .single()

      if (leadErr || !leadRow) {
        console.error('[create-checkout-session] Failed to create lead:', {
          productId,
          error: leadErr?.message,
        })
        return json({ error: 'Failed to register lead — checkout not created.' }, 500)
      }

      leadId = leadRow.id as string
    }

    console.log('[create-checkout-session] Lead path:', { leadId, path: leadPath })

    // ── 5. Determine checkout mode from first price ─────────────
    const firstPrice = await stripe.prices.retrieve(resolvedPriceIds[0])
    const mode: 'payment' | 'subscription' =
      firstPrice.type === 'recurring' ? 'subscription' : 'payment'

    // ── 6. Create Stripe Checkout Session ───────────────────────
    const siteUrl = Deno.env.get('SITE_URL') ?? req.headers.get('origin') ?? 'http://localhost:5173'

    // Use caller-supplied successPath (relative, e.g. /apply?product=slug&payment_done=1)
    // so the form can resume after the user returns from Stripe.
    const validSuccessPath =
      typeof successPath === 'string' &&
      successPath.startsWith('/') &&
      !successPath.includes('://') &&
      successPath.length < 1000
        ? successPath
        : null
    const successUrl = validSuccessPath
      ? `${siteUrl}${validSuccessPath}`
      : `${siteUrl}/obrigado?session_id={CHECKOUT_SESSION_ID}`

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: resolvedPriceIds.map(price => ({ price, quantity: 1 })),

      ...(email ? { customer_email: email } : {}),

      metadata: {
        product_id: productId,
        lead_name:  name  ?? '',
        lead_email: email ?? '',
        lead_id:    leadId,
      },

      success_url: successUrl,
      cancel_url:  `${siteUrl}/`,

      allow_promotion_codes: true,
    })

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL.')
    }

    // ── 7. Return URL + session ID + leadId ───────────────────────
    // leadId é novo (OS-004); quem só lê `url` continua funcionando igual.
    return json({ url: session.url, sessionId: session.id, leadId })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error.'
    console.error('[create-checkout-session]', message)
    return json({ error: message }, 500)
  }
})

// Supabase Edge Function: stripe-webhook-handler
// Runtime: Deno (edge)
//
// Fluxo de segurança:
//   1. Verifica assinatura Stripe-Signature ANTES de qualquer processamento.
//      → Rejeita imediatamente qualquer payload sem assinatura válida.
//   2. Processa apenas checkout.session.completed.
//   3. Extrai product_id dos metadata da sessão.
//   4. Cria o usuário no Supabase Auth se não existir.
//   5. Insere user_access via service_role (única forma permitida pelo RLS).
//   6. Gera magic link e simula envio de e-mail de boas-vindas.

import Stripe from 'npm:stripe@14'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')              ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'stripe-signature, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // ── 1. Signature verification ─────────────────────────────────
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    console.warn('[webhook] Missing Stripe-Signature header')
    return json({ error: 'Missing signature' }, 401)
  }

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET)
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err)
    return json({ error: 'Invalid signature' }, 403)
  }

  // ── 2. Only handle checkout.session.completed ─────────────────
  if (event.type !== 'checkout.session.completed') {
    return json({ received: true, skipped: event.type }, 200)
  }

  const session = event.data.object as Stripe.Checkout.Session

  const email      = session.customer_details?.email ?? session.customer_email
  const productId  = session.metadata?.product_id
  const leadId     = session.metadata?.lead_id

  if (!email || !productId) {
    console.error('[webhook] Missing email or product_id in session metadata', {
      sessionId: session.id,
      metadata:  session.metadata,
    })
    return json({ error: 'Missing metadata' }, 422)
  }

  // ── 3. Verify product exists ──────────────────────────────────
  const { data: product, error: prodErr } = await supabaseAdmin
    .from('products')
    .select('id, name, slug')
    .eq('id', productId)
    .single()

  if (prodErr || !product) {
    console.error('[webhook] Product not found:', productId)
    return json({ error: 'Product not found' }, 404)
  }

  // ── 4. Find or create Supabase Auth user ──────────────────────
  let userId: string

  const { data: existingList } = await supabaseAdmin.auth.admin.listUsers()
  const existing = existingList?.users?.find(u => u.email === email)

  if (existing) {
    userId = existing.id
    console.log('[webhook] Existing user found:', userId)
  } else {
    // Create user — they'll receive a magic link to set their password
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,   // mark as confirmed immediately
      user_metadata: { source: 'stripe_webhook', product_id: productId },
    })

    if (createErr || !newUser.user) {
      console.error('[webhook] Failed to create user:', createErr)
      return json({ error: 'Failed to create user' }, 500)
    }
    userId = newUser.user.id
    console.log('[webhook] New user created:', userId)
  }

  // ── 5. Grant access (INSERT via service_role — only path RLS allows) ──
  const { error: accessErr } = await supabaseAdmin
    .from('user_access')
    .upsert({
      user_id:           userId,
      product_id:        productId,
      purchased_at:      new Date().toISOString(),
      stripe_session_id: session.id,
    }, { onConflict: 'user_id,product_id' })

  if (accessErr) {
    console.error('[webhook] Failed to grant access:', accessErr)
    return json({ error: 'Failed to grant access' }, 500)
  }

  // ── 6. Update lead if we have one ────────────────────────────
  if (leadId) {
    await supabaseAdmin
      .from('bridge_leads')
      .update({ stripe_session_id: session.id, completed: true })
      .eq('id', leadId)
  }

  // ── 7. Send welcome magic link ────────────────────────────────
  const origin = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type:          'magiclink',
    email,
    options: {
      redirectTo: `${origin}/my-products`,
    },
  })

  if (!linkErr && linkData?.properties?.action_link) {
    // In production: send via Resend / SendGrid / etc.
    // For now, log the magic link (replace with your email provider)
    console.log('[webhook] Magic link for', email, ':', linkData.properties.action_link)

    // Example with Resend (uncomment and add RESEND_API_KEY secret):
    // await fetch('https://api.resend.com/emails', {
    //   method:  'POST',
    //   headers: {
    //     'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    //     'Content-Type':  'application/json',
    //   },
    //   body: JSON.stringify({
    //     from:    'Bridge <noreply@seudominio.com>',
    //     to:      [email],
    //     subject: `🎉 Seu acesso ao ${product.name} foi liberado!`,
    //     html: `
    //       <h2>Bem-vindo ao ${product.name}!</h2>
    //       <p>Seu pagamento foi confirmado. Clique no link abaixo para acessar:</p>
    //       <a href="${linkData.properties.action_link}" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">
    //         Acessar meu produto
    //       </a>
    //     `,
    //   }),
    // })
  }

  console.log('[webhook] Access granted successfully:', { email, productId, userId })
  return json({ received: true, user_id: userId, product_id: productId }, 200)
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

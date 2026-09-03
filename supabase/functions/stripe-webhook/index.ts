// Supabase Edge Function: stripe-webhook
// Runtime: Deno
//
// Recebe eventos do Stripe e atualiza status de pagamento nos leads.
// Evento tratado: checkout.session.completed
//
// Configuração necessária no painel do Stripe:
//   Developers → Webhooks → Add endpoint
//   URL: https://hwiwijrdnmsgnhuortiq.supabase.co/functions/v1/stripe-webhook
//   Event: checkout.session.completed
//   Depois copie o "Signing secret" e adicione como STRIPE_WEBHOOK_SECRET
//   nas Edge Function Secrets do Supabase.

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

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const sig    = req.headers.get('stripe-signature') ?? ''
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

  if (!sig || !secret) {
    console.error('[stripe-webhook] Missing signature or secret')
    return new Response('Webhook not configured.', { status: 400 })
  }

  // Must read raw body before parsing to verify signature
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, secret)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err)
    return new Response('Invalid signature.', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object as Stripe.Checkout.Session
    const meta     = session.metadata ?? {}
    const leadId   = meta.lead_id    || null
    const email    = meta.lead_email || null
    const prodId   = meta.product_id || null

    const patch = {
      payment_status:    'confirmed',
      stripe_session_id: session.id,
      paid_at:           new Date().toISOString(),
    }

    if (leadId) {
      // Caminho primário: lead_id passado pelo frontend ao criar a sessão
      const { error } = await supabaseAdmin
        .from('leads')
        .update(patch)
        .eq('id', leadId)

      if (error) {
        console.error('[stripe-webhook] Update by lead_id failed:', error)
      } else {
        console.log(`[stripe-webhook] Lead ${leadId} confirmado (session ${session.id})`)
      }
    } else if (email && prodId) {
      // Fallback: mais recente com payment_status=pending para o mesmo email+produto
      const { data: rows } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('email', email)
        .eq('product_id', prodId)
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)

      const row = rows?.[0]
      if (row) {
        const { error } = await supabaseAdmin
          .from('leads')
          .update(patch)
          .eq('id', row.id)

        if (error) {
          console.error('[stripe-webhook] Fallback update failed:', error)
        } else {
          console.log(`[stripe-webhook] Lead ${row.id} confirmado via email+produto (session ${session.id})`)
        }
      } else {
        console.warn(`[stripe-webhook] Nenhum lead pending para email=${email} produto=${prodId}`)
      }
    } else {
      console.warn('[stripe-webhook] Sem lead_id nem email+produto_id na session metadata')
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})

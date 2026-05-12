// Supabase Edge Function: create-bridge-checkout
// Runtime: Deno (edge)
//
// Security model:
//   1. Receive { lead_id, form_id, price_ids[], customer_email }
//   2. Load the form from DB using the SERVICE ROLE key (bypasses RLS)
//   3. Validate EVERY requested price_id is in form.schema.allowed_price_ids
//      → If any price_id is not allowed, reject 403. Period.
//   4. Create Stripe Checkout Session with the validated price_ids
//   5. Persist stripe_session_id on the lead row
//   6. Return { url }
//
// This prevents a malicious user from sending an arbitrary price_id
// via the browser console to get a cheaper plan.

import Stripe from 'npm:stripe@14'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')            ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // ── Preflight ─────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { lead_id, form_id, price_ids, customer_email } = await req.json() as {
      lead_id:        string
      form_id:        string
      price_ids:      string[]
      customer_email: string
    }

    if (!form_id || !price_ids?.length) {
      return json({ error: 'Missing required fields' }, 400)
    }

    // ── 1. Load form from DB ──────────────────────────────────────
    const { data: form, error: formErr } = await supabaseAdmin
      .from('bridge_forms')
      .select('schema')
      .eq('id', form_id)
      .eq('active', true)
      .single()

    if (formErr || !form) {
      return json({ error: 'Form not found' }, 404)
    }

    const schema = form.schema as {
      allowed_price_ids: string[]
      success_url?:      string
      cancel_url?:       string
    }

    // ── 2. Server-side price validation ───────────────────────────
    const allowed = new Set(schema.allowed_price_ids ?? [])
    const invalid = price_ids.filter(p => !allowed.has(p))

    if (invalid.length > 0) {
      console.warn('[checkout] Blocked invalid price_ids:', invalid)
      return json(
        { error: 'One or more price_ids are not permitted for this form.' },
        403,
      )
    }

    // ── 3. Create Stripe Checkout Session ─────────────────────────
    const origin = req.headers.get('origin') ?? 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      mode:               'payment',
      customer_email:     customer_email || undefined,
      line_items:         price_ids.map(price => ({ price, quantity: 1 })),
      success_url:        schema.success_url ?? `${origin}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:         schema.cancel_url  ?? `${origin}/apply`,
      metadata: {
        lead_id:  lead_id  ?? '',
        form_id:  form_id  ?? '',
      },
      payment_intent_data: {
        metadata: {
          lead_id: lead_id  ?? '',
          form_id: form_id  ?? '',
        },
      },
    })

    // ── 4. Persist session id on the lead (atomically, before redirect) ──
    if (lead_id) {
      await supabaseAdmin
        .from('bridge_leads')
        .update({ stripe_session_id: session.id })
        .eq('id', lead_id)
    }

    // ── 5. Return checkout URL ────────────────────────────────────
    return json({ url: session.url }, 200)

  } catch (err) {
    console.error('[checkout]', err)
    return json({ error: 'Internal error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// Supabase Edge Function: create-checkout-session
// Runtime: Deno
//
// Security model:
//   1. Receive { productId, priceId, email, name }
//   2. Load the product from DB using service role key (bypasses RLS)
//   3. Build the set of ALLOWED price IDs server-side:
//        a. product.price_id_stripe  (the main price)
//        b. Every priceId stored in form_logic_config.nodes[*].optionPrices[*]
//   4. Reject with 403 if the submitted priceId is not in the allowed set.
//      → A malicious user cannot substitute a cheaper price ID from devtools.
//   5. Retrieve the Stripe Price to determine mode (payment vs subscription).
//   6. Create Stripe Checkout Session — line_items reference the Price by ID only.
//      → No unit_amount is ever passed from the frontend.
//   7. Return { url }.

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

// ── Types (inline — cannot import from frontend) ──────────────

interface OptionPrice {
  priceId:  string
  label:    string
  amount:   number
  currency: string
}

interface FormNode {
  id:            string
  type:          string
  options:       string[]
  optionPrices?: Record<string, OptionPrice>
  logicJumps:    unknown[]
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

function buildAllowedPriceIds(product: {
  price_id_stripe:   string | null
  form_logic_config: unknown
}): Set<string> {
  const allowed = new Set<string>()

  if (product.price_id_stripe) {
    allowed.add(product.price_id_stripe)
  }

  // Walk every FormNode and collect all optionPrice IDs
  const cfg = product.form_logic_config as { nodes?: FormNode[] } | null
  if (Array.isArray(cfg?.nodes)) {
    for (const node of cfg.nodes) {
      if (node.optionPrices) {
        for (const op of Object.values(node.optionPrices)) {
          if (op?.priceId) allowed.add(op.priceId)
        }
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
    const { productId, priceId, email, name } = await req.json() as {
      productId: string
      priceId:   string
      email?:    string
      name?:     string
    }

    if (!productId || !priceId) {
      return json({ error: 'productId and priceId are required.' }, 400)
    }

    if (!priceId.startsWith('price_')) {
      return json({ error: 'Invalid priceId format.' }, 400)
    }

    // ── 2. Load product from DB ─────────────────────────────────
    const { data: product, error: dbErr } = await supabaseAdmin
      .from('products')
      .select('id, name, price_id_stripe, form_logic_config, status')
      .eq('id', productId)
      .single()

    if (dbErr || !product) {
      return json({ error: 'Product not found.' }, 404)
    }

    if (product.status === 'archived') {
      return json({ error: 'Product is no longer available.' }, 403)
    }

    // ── 3. Validate priceId server-side ─────────────────────────
    const allowed = buildAllowedPriceIds(product)

    if (!allowed.has(priceId)) {
      console.error(`[create-checkout-session] Rejected priceId="${priceId}" for productId="${productId}". Allowed: [${[...allowed].join(', ')}]`)
      return json({ error: 'This price is not available for the selected product.' }, 403)
    }

    // ── 4. Retrieve Stripe Price to determine checkout mode ──────
    const stripePrice = await stripe.prices.retrieve(priceId)
    const mode: 'payment' | 'subscription' =
      stripePrice.type === 'recurring' ? 'subscription' : 'payment'

    // ── 5. Create Stripe Checkout Session ───────────────────────
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],

      // Pre-fill email if collected in the form
      ...(email ? { customer_email: email } : {}),

      // Store lead context for the webhook to consume
      metadata: {
        product_id: productId,
        lead_name:  name  ?? '',
        lead_email: email ?? '',
      },

      success_url: `${siteUrl}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}/`,

      // Allow promotional codes on the Stripe-hosted page
      allow_promotion_codes: true,
    })

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL.')
    }

    // ── 6. Return URL ────────────────────────────────────────────
    return json({ url: session.url })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error.'
    console.error('[create-checkout-session]', message)
    return json({ error: message }, 500)
  }
})

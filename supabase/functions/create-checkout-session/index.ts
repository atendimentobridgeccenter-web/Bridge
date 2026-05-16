// Supabase Edge Function: create-checkout-session
// Runtime: Deno
//
// Security model:
//   1. Receive { productId, priceId?, priceIds?, email, name }
//      - priceIds[] (array) is used by FormRunner (multi-item pricing engine)
//      - priceId  (single) is used by QuizzRunner (single selection)
//      Both formats are supported; priceIds takes precedence.
//   2. Load the product from DB using service role key (bypasses RLS)
//   3. Build the set of ALLOWED price IDs server-side:
//        a. product.price_id_stripe  (the main price)
//        b. Every priceId in form_logic_config (FormSchema: allowed_price_ids)
//        c. Every optionPrice in form_logic_config (FormNode: nodes[*].optionPrices)
//   4. Reject with 403 if any submitted priceId is not in the allowed set.
//   5. Retrieve the first Stripe Price to determine mode (payment vs subscription).
//   6. Create Stripe Checkout Session — line_items reference Prices by ID only.
//      No unit_amount is ever passed from the frontend.
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

// ── Types ─────────────────────────────────────────────────────

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

  const cfg = product.form_logic_config as Record<string, unknown> | null

  // FormSchema format: explicit allowed_price_ids whitelist
  if (Array.isArray(cfg?.allowed_price_ids)) {
    for (const pid of cfg.allowed_price_ids as string[]) {
      if (pid) allowed.add(pid)
    }
  }

  // FormNode format: walk nodes and collect all optionPrice IDs
  if (Array.isArray(cfg?.nodes)) {
    for (const node of cfg.nodes as FormNode[]) {
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
    // priceIds[] comes from FormRunner (multi-item pricing engine)
    // priceId (single) comes from QuizzRunner (single option selection)
    const { productId, priceId, priceIds: priceIdsArr, email, name } = await req.json() as {
      productId:  string
      priceId?:   string
      priceIds?:  string[]
      email?:     string
      name?:      string
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
      .select('id, name, price_id_stripe, form_logic_config, status')
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

    // ── 4. Determine checkout mode from first price ─────────────
    const firstPrice = await stripe.prices.retrieve(resolvedPriceIds[0])
    const mode: 'payment' | 'subscription' =
      firstPrice.type === 'recurring' ? 'subscription' : 'payment'

    // ── 5. Create Stripe Checkout Session ───────────────────────
    const siteUrl = Deno.env.get('SITE_URL') ?? req.headers.get('origin') ?? 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: resolvedPriceIds.map(price => ({ price, quantity: 1 })),

      ...(email ? { customer_email: email } : {}),

      metadata: {
        product_id: productId,
        lead_name:  name  ?? '',
        lead_email: email ?? '',
      },

      success_url: `${siteUrl}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}/`,

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

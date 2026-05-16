// Edge Function: list-stripe-prices
// Returns all active Stripe prices (with product name) for the admin price picker.

import Stripe from 'npm:stripe@14'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Fetch up to 100 active prices, expanding the product so we get the name
    const list = await stripe.prices.list({
      active:  true,
      limit:   100,
      expand:  ['data.product'],
    })

    const prices = list.data.map(price => {
      const product = price.product as Stripe.Product
      return {
        priceId:     price.id,
        productName: product?.name ?? '—',
        productId:   typeof price.product === 'string' ? price.product : product?.id,
        nickname:    price.nickname ?? null,
        amount:      price.unit_amount ?? 0,
        currency:    price.currency.toUpperCase(),
        type:        price.type,                          // 'one_time' | 'recurring'
        interval:    price.recurring?.interval ?? null,   // 'month' | 'year' | ...
        livemode:    price.livemode,
      }
    })

    // Sort: products alphabetically, prices by amount ascending
    prices.sort((a, b) =>
      a.productName.localeCompare(b.productName) || a.amount - b.amount
    )

    return json({ prices })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar preços do Stripe.'
    console.error('[list-stripe-prices]', message)
    return json({ error: message }, 500)
  }
})

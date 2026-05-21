// Supabase Edge Function: sync-stripe-product
// Runtime: Deno
//
// Cria (ou atualiza) um produto + preço + cupom no Stripe a partir
// do payload enviado pelo painel Bridge, e persiste o price_id_stripe
// na tabela products do banco de dados.
//
// Payload esperado (POST):
//   {
//     productId:     string           — UUID do produto na Bridge
//     name:          string           — nome visível no Stripe
//     description?:  string
//     amount:        number           — valor em centavos (BRL) ou unidade (JPY)
//     currency:      string           — "brl" | "jpy" | "usd"
//     interval?:     "month"|"year"   — se omitido → one_time payment
//     coupon?: {
//       percentOff:  number           — 0–100
//       durationMonths?: number       — omitir = para sempre
//     }
//   }
//
// Resposta de sucesso:
//   { stripeProductId, priceId, couponId? }

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

// ── CORS ──────────────────────────────────────────────────────

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

// ── Handler ───────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── 1. Parse + validate ─────────────────────────────────────
    const {
      productId,
      name,
      description = '',
      amount,
      currency,
      interval,
      coupon,
    } = await req.json() as {
      productId:    string
      name:         string
      description?: string
      amount:       number
      currency:     string
      interval?:    'month' | 'year'
      coupon?: {
        percentOff:      number
        durationMonths?: number
      }
    }

    if (!productId || !name || !amount || !currency) {
      return json({ error: 'productId, name, amount e currency são obrigatórios.' }, 400)
    }

    if (amount <= 0) {
      return json({ error: 'amount deve ser maior que zero.' }, 400)
    }

    // ── 2. Verificar se produto existe e não está arquivado ─────
    const { data: product, error: dbErr } = await supabaseAdmin
      .from('products')
      .select('id, name, status, price_id_stripe')
      .eq('id', productId)
      .single()

    if (dbErr || !product) return json({ error: 'Produto não encontrado.' }, 404)
    if (product.status === 'archived') return json({ error: 'Produto arquivado não pode ser sincronizado.' }, 403)

    // ── 3. Criar produto no Stripe ──────────────────────────────
    const stripeProduct = await stripe.products.create({
      name,
      description: description || undefined,
      metadata: { bridge_product_id: productId },
    })

    // ── 4. Criar preço no Stripe ────────────────────────────────
    const priceParams: Stripe.PriceCreateParams = {
      product:     stripeProduct.id,
      unit_amount: amount,
      currency:    currency.toLowerCase(),
      metadata:    { bridge_product_id: productId },
    }

    if (interval) {
      priceParams.recurring = { interval }
    }

    const stripePrice = await stripe.prices.create(priceParams)

    // ── 5. Criar cupom (opcional) ───────────────────────────────
    let couponId: string | undefined

    if (coupon && coupon.percentOff > 0 && coupon.percentOff <= 100) {
      const stripeCoupon = await stripe.coupons.create({
        percent_off: coupon.percentOff,
        duration:    coupon.durationMonths ? 'repeating' : 'forever',
        ...(coupon.durationMonths ? { duration_in_months: coupon.durationMonths } : {}),
        name:        `${name} — ${coupon.percentOff}% off`,
        metadata:    { bridge_product_id: productId },
      })
      couponId = stripeCoupon.id
    }

    // ── 6. Persistir price_id_stripe no banco ───────────────────
    const { error: updateErr } = await supabaseAdmin
      .from('products')
      .update({ price_id_stripe: stripePrice.id })
      .eq('id', productId)

    if (updateErr) {
      console.error('[sync-stripe-product] Falha ao atualizar products:', updateErr)
      return json({ error: 'Produto criado no Stripe mas falhou ao salvar o price_id no banco.' }, 500)
    }

    console.log(
      `[sync-stripe-product] OK — product=${stripeProduct.id} price=${stripePrice.id}`,
      couponId ? `coupon=${couponId}` : '',
    )

    // ── 7. Retorno ──────────────────────────────────────────────
    return json({
      stripeProductId: stripeProduct.id,
      priceId:         stripePrice.id,
      couponId,
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error.'
    console.error('[sync-stripe-product]', message)
    return json({ error: message }, 500)
  }
})

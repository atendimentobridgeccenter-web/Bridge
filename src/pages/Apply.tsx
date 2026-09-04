import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import FormRunner from '@/form/FormRunner'
import QuizzRunner from '@/components/form-builder/QuizzRunner'
import type { TrackingConfig } from '@/components/form-builder/QuizzRunner'
import type { Product, FormSchema } from '@/lib/types'
import type { FormNode } from '@/components/form-builder/FormBuilder'

export default function Apply() {
  const [params]    = useSearchParams()
  // ?product=slug is the canonical param; ?form=slug kept for backward compat
  const productSlug = params.get('product') ?? params.get('form') ?? null
  const fromSlug    = params.get('from') ?? undefined

  const utmParams = (() => {
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
    const obj: Record<string, string> = {}
    for (const k of keys) { const v = params.get(k); if (v) obj[k] = v }
    const ref = typeof document !== 'undefined' ? document.referrer : ''
    if (ref) obj.referrer = ref
    return Object.keys(obj).length > 0 ? obj : undefined
  })()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    if (!productSlug) { setError(true); setLoading(false); return }

    supabase
      .from('products')
      .select('*')
      .eq('slug', productSlug)
      .single()
      .then(({ data, error: e }) => {
        if (e || !data) setError(true)
        else setProduct(data as Product)
        setLoading(false)
      })
  }, [productSlug])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <p>Produto ou formulário não encontrado.</p>
      </div>
    )
  }

  const cfg            = product.form_logic_config as Record<string, unknown>
  const checkoutCfg    = (product.checkout_config  ?? {}) as Record<string, unknown>
  const checkoutActive = checkoutCfg?.type !== 'lead'
  const trackingCfg    = (checkoutCfg.tracking ?? {}) as TrackingConfig
  const hasTracking    = Object.values(trackingCfg).some(Boolean)

  // ── New format: FormNode[] produced by FormBuilder ────────────
  if (Array.isArray(cfg?.nodes) && (cfg.nodes as FormNode[]).length > 0) {
    const nodes = cfg.nodes as FormNode[]

    // Se o formulário já tem um nó stripe-checkout inline, desliga o CheckoutSummary
    // automático do final — as duas estratégias de checkout são mutuamente exclusivas.
    const hasInlineStripeNode = nodes.some(n => n.type === 'stripe-checkout')
    const useCheckout = checkoutActive && !hasInlineStripeNode

    return (
      <QuizzRunner
        nodes={nodes}
        productId={product.id}
        enableCheckout={useCheckout}
        productName={product.name}
        defaultPriceId={useCheckout ? (product.price_id_stripe ?? undefined) : undefined}
        extraPriceIds={useCheckout ? ((checkoutCfg.extra_price_ids ?? []) as string[]) : undefined}
        tracking={hasTracking ? trackingCfg : undefined}
        utmParams={utmParams}
      />
    )
  }

  // ── Legacy format: FormSchema with steps ──────────────────────
  if (Array.isArray((cfg as unknown as FormSchema)?.steps)) {
    return <FormRunner product={product} fromSlug={fromSlug} />
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
      <p>Formulário não configurado para este produto.</p>
    </div>
  )
}

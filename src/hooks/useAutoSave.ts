// ── useAutoSave ────────────────────────────────────────────────
//
// Watches isDirty from the Zustand store and debounces a save to
// the server via React Query mutation.
//
// Key: reads store values inside the timer callback via getState()
// to avoid stale closures — the closure always sees the latest
// draft state at the moment the timer fires, not at setup time.

import { useEffect, useRef } from 'react'
import { useBuilderStore } from '@/stores/useBuilderStore'
import { useUpdateProduct } from './useProduct'
import type { Product } from '@/lib/types'
import type { FormNode } from '@/components/form-builder/FormBuilder'

function buildFields(product: Product, formNodes: FormNode[]): Partial<Product> {
  return {
    name:                product.name,
    slug:                product.slug,
    description:         product.description,
    status:              product.status,
    thumbnail_url:       product.thumbnail_url ?? null,
    price_id_stripe:     product.price_id_stripe ?? null,
    landing_page_config: product.landing_page_config,
    checkout_config:     product.checkout_config,
    form_logic_config:   { nodes: formNodes },
  }
}

export function useAutoSave(id: string | undefined, delay = 1500) {
  const isDirty = useBuilderStore(s => s.isDirty)
  const { mutate: updateProduct, isPending: isSaving } = useUpdateProduct()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced auto-save whenever isDirty flips to true
  useEffect(() => {
    if (!isDirty || !id || id === 'new') return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const { product, formNodes, markAsSaved } = useBuilderStore.getState()
      if (!product) return
      updateProduct(
        { id, fields: buildFields(product, formNodes) },
        { onSuccess: markAsSaved },
      )
    }, delay)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [isDirty, id, delay, updateProduct])

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  function saveNow() {
    if (!id || id === 'new') return
    if (timerRef.current) clearTimeout(timerRef.current)
    const { product, formNodes, markAsSaved } = useBuilderStore.getState()
    if (!product) return
    updateProduct(
      { id, fields: buildFields(product, formNodes) },
      { onSuccess: markAsSaved },
    )
  }

  return { saveNow, isSaving }
}

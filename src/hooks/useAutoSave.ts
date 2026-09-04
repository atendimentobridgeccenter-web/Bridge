import { toast } from 'sonner'
import { useBuilderStore } from '@/stores/useBuilderStore'
import { useUpdateProduct } from './useProduct'
import type { Product } from '@/lib/types'
import type { FormNode } from '@/components/form-builder/FormBuilder'

function buildFields(product: Product, formNodes: FormNode[], canvasPositions: Record<string, { x: number; y: number }>): Partial<Product> {
  return {
    name:                product.name,
    slug:                product.slug,
    description:         product.description,
    status:              product.status,
    thumbnail_url:       product.thumbnail_url ?? null,
    price_id_stripe:     product.price_id_stripe ?? null,
    landing_page_config: product.landing_page_config,
    checkout_config:     product.checkout_config,
    form_logic_config:   { nodes: formNodes, canvasPositions },
  }
}

export function useAutoSave(id: string | undefined) {
  const { mutate: updateProduct, isPending: isSaving } = useUpdateProduct()

  function onSaveError(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.error(`Erro ao salvar: ${msg}`, { duration: 6000 })
  }

  function saveNow() {
    if (!id || id === 'new') return
    const { product, formNodes, canvasPositions, markAsSaved } = useBuilderStore.getState()
    if (!product) return
    updateProduct(
      { id, fields: buildFields(product, formNodes, canvasPositions) },
      { onSuccess: markAsSaved, onError: onSaveError },
    )
  }

  return { saveNow, isSaving }
}

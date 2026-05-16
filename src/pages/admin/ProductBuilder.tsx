import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, Globe, AlertCircle, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import CheckoutTab    from '@/builder/tabs/CheckoutTab'
import LandingPageTab from '@/builder/tabs/LandingPageTab'
import StructureTab   from '@/builder/tabs/StructureTab'
import FormBuilder    from '@/components/form-builder/FormBuilder'
import type { Product } from '@/lib/types'
import { useProduct } from '@/hooks/useProduct'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useBuilderStore } from '@/stores/useBuilderStore'

type Tab = 'checkout' | 'landing' | 'form' | 'structure'

const TABS: { id: Tab; label: string }[] = [
  { id: 'checkout',  label: 'Checkout'     },
  { id: 'landing',   label: 'Landing Page' },
  { id: 'form',      label: 'Formulário'   },
  { id: 'structure', label: 'Estrutura'    },
]

// ── Publish validation ────────────────────────────────────────

function validate(product: Product): string[] {
  const errors: string[] = []
  if (!product.name) errors.push('Nome do produto não definido.')
  if (!product.slug) errors.push('Slug não definido.')
  if (!product.price_id_stripe && !(product.checkout_config as { price_id?: string })?.price_id)
    errors.push('Price ID do Stripe não configurado.')
  const cfg    = product.landing_page_config as { blocks?: unknown[] } | null
  const blocks = cfg?.blocks ?? []
  if (blocks.length === 0) errors.push('Landing page está vazia (adicione pelo menos 1 bloco).')
  return errors
}

// ── Page ──────────────────────────────────────────────────────

export default function ProductBuilder() {
  const { id } = useParams<{ id: string }>()

  // ── Server state (React Query) ──────────────────────────────
  const { data: serverProduct } = useProduct(id)

  // ── Draft state (Zustand) ───────────────────────────────────
  const product        = useBuilderStore(s => s.product)
  const formNodes      = useBuilderStore(s => s.formNodes)
  const savedAt        = useBuilderStore(s => s.savedAt)
  const initFromServer = useBuilderStore(s => s.initFromServer)
  const patchProduct   = useBuilderStore(s => s.patchProduct)
  const setFormNodes   = useBuilderStore(s => s.setFormNodes)
  const reset          = useBuilderStore(s => s.reset)

  // ── Auto-save ───────────────────────────────────────────────
  const { saveNow, isSaving } = useAutoSave(id)

  // ── Local UI state ──────────────────────────────────────────
  const [tab,            setTab]            = useState<Tab>('checkout')
  const [publishing,     setPublishing]     = useState(false)
  const [errors,         setErrors]         = useState<string[]>([])
  const [showSaved,      setShowSaved]      = useState(false)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const prevSavedAtRef = useRef<Date | null>(null)

  // Init store when server data arrives
  useEffect(() => {
    if (serverProduct) initFromServer(serverProduct)
  }, [serverProduct, initFromServer])

  // Reset store on unmount
  useEffect(() => () => reset(), [reset])

  // Flash "Salvo" whenever a save completes
  useEffect(() => {
    if (savedAt && savedAt !== prevSavedAtRef.current) {
      prevSavedAtRef.current = savedAt
      setShowSaved(true)
      const t = setTimeout(() => setShowSaved(false), 2000)
      return () => clearTimeout(t)
    }
  }, [savedAt])

  async function handlePublish() {
    if (!product) return
    const errs = validate(product)
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])
    setPublishing(true)
    const newStatus = product.status === 'published' ? 'draft' : 'published'
    await supabase.from('products').update({ status: newStatus }).eq('id', product.id)
    patchProduct({ status: newStatus })
    setPublishing(false)
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  const isPublished = product.status === 'published'

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b border-zinc-800 bg-zinc-900">
        <Link to="/admin/products" className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{product.name}</p>
          <p className="text-xs text-zinc-500">/{product.slug}</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-zinc-800 rounded-xl p-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tab === t.id ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showSaved && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <Check className="w-3.5 h-3.5" /> Salvo
            </span>
          )}
          <button
            onClick={saveNow}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-400
                       hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>

          <button
            onClick={handlePublish}
            disabled={publishing}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
              isPublished
                ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                : 'bg-violet-600 hover:bg-violet-500 text-white',
            )}
          >
            <Globe className="w-4 h-4" />
            {publishing ? '...' : isPublished ? 'Publicado' : 'Publicar'}
          </button>
        </div>
      </header>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="shrink-0 px-6 py-3 bg-red-900/30 border-b border-red-800/50 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div className="text-sm text-red-300 space-y-0.5">
            {errors.map((e, i) => <p key={`err-${i}-${e.slice(0, 20)}`}>{e}</p>)}
          </div>
        </div>
      )}

      {/* Tab content */}
      <div className={cn(
        'flex-1',
        tab === 'landing' ? 'overflow-hidden flex' : tab === 'form' ? 'overflow-hidden' : 'overflow-auto p-8',
      )}>
        {tab === 'checkout' && (
          <CheckoutTab product={product} onChange={patchProduct} />
        )}
        {tab === 'landing' && (
          <LandingPageTab
            product={product}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onChange={patchProduct}
            onSelectBlockChange={setSelectedBlockId}
          />
        )}
        {tab === 'form' && (
          <FormBuilder nodes={formNodes} onChange={setFormNodes} />
        )}
        {tab === 'structure' && (
          <StructureTab productId={product.id} />
        )}
      </div>
    </div>
  )
}

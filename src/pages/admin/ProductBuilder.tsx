import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, Globe, AlertCircle, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import CheckoutTab    from '@/builder/tabs/CheckoutTab'
import LandingPageTab from '@/builder/tabs/LandingPageTab'
import StructureTab   from '@/builder/tabs/StructureTab'
import FormBuilder, { type FormNode } from '@/components/form-builder/FormBuilder'
import type { Product } from '@/lib/types'

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

  const [tab,       setTab]       = useState<Tab>('checkout')
  const [product,   setProduct]   = useState<Product | null>(null)
  const [formNodes, setFormNodes] = useState<FormNode[]>([])
  const [saving,    setSaving]    = useState(false)
  const [publishing,setPublishing]= useState(false)
  const [errors,    setErrors]    = useState<string[]>([])
  const [saved,     setSaved]     = useState(false)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  const autoSaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formSaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formInitDone   = useRef(false)

  // Load product
  useEffect(() => {
    if (!id) return
    supabase.from('products').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (data) {
          setProduct(data as Product)
          const cfg = data.form_logic_config as Record<string, unknown>
          if (Array.isArray(cfg?.nodes)) setFormNodes(cfg.nodes as FormNode[])
        }
        setTimeout(() => { formInitDone.current = true }, 100)
      })
  }, [id])

  // Auto-save form nodes on change (debounced)
  useEffect(() => {
    if (!formInitDone.current || !id) return
    if (formSaveTimer.current) clearTimeout(formSaveTimer.current)
    formSaveTimer.current = setTimeout(async () => {
      await supabase.from('products')
        .update({ form_logic_config: { nodes: formNodes } })
        .eq('id', id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 1200)
    return () => { if (formSaveTimer.current) clearTimeout(formSaveTimer.current) }
  }, [formNodes]) // eslint-disable-line react-hooks/exhaustive-deps

  // Patch + debounced save for all other fields
  function patch(upd: Partial<Product>) {
    setProduct(prev => prev ? { ...prev, ...upd } : prev)
    setSaved(false)
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => handleSave(upd), 1500)
  }

  async function handleSave(extra?: Partial<Product>) {
    if (!product) return
    setSaving(true)
    const merged = { ...product, ...extra }
    await supabase.from('products').update({
      name:                merged.name,
      slug:                merged.slug,
      description:         merged.description,
      price_id_stripe:     merged.price_id_stripe,
      landing_page_config: merged.landing_page_config,
      form_logic_config:   merged.form_logic_config,
      checkout_config:     merged.checkout_config,
    }).eq('id', product.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handlePublish() {
    if (!product) return
    const errs = validate(product)
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])
    setPublishing(true)
    const newStatus = product.status === 'published' ? 'draft' : 'published'
    await supabase.from('products').update({ status: newStatus }).eq('id', product.id)
    setProduct(p => p ? { ...p, status: newStatus } : p)
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
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <Check className="w-3.5 h-3.5" /> Salvo
            </span>
          )}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-400
                       hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
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
          <CheckoutTab product={product} onChange={patch} />
        )}
        {tab === 'landing' && (
          <LandingPageTab
            product={product}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onChange={patch}
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

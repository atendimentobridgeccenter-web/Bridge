import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Save, Globe, Settings, CreditCard,
  ClipboardList, LayoutTemplate, ExternalLink,
  Loader2, Check, Image as ImageIcon, Upload,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { Product, ProductStatus } from '@/lib/types'
import FormBuilder, { type FormNode } from '@/components/form-builder/FormBuilder'
import StripePricePicker from '@/components/StripePricePicker'

// ── Tokens ────────────────────────────────────────────────────

const BG_PAGE  = '#0F1117'
const BG_CARD  = '#1A1C23'
const BG_INPUT = '#0D0E12'

// ── Tabs config ───────────────────────────────────────────────

type TabId = 'geral' | 'precificacao' | 'formulario' | 'vendas'

const TABS: { id: TabId; icon: React.ElementType; label: string }[] = [
  { id: 'geral',        icon: Settings,      label: 'Geral'           },
  { id: 'precificacao', icon: CreditCard,     label: 'Precificação'    },
  { id: 'formulario',   icon: ClipboardList,  label: 'Formulário'      },
  { id: 'vendas',       icon: LayoutTemplate, label: 'Página de Vendas'},
]

// ── Status badge ──────────────────────────────────────────────

const STATUS_STYLE: Record<ProductStatus, { label: string; cls: string }> = {
  published: { label: 'Publicado', cls: 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20' },
  draft:     { label: 'Rascunho',  cls: 'bg-amber-500/12  text-amber-400  border border-amber-500/20'    },
  archived:  { label: 'Arquivado', cls: 'bg-white/4        text-white/30   border border-white/8'         },
}

// ── Shared primitives ─────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className="text-[12px] font-semibold text-white/50">{label}</label>
        {hint && <p className="text-[11px] text-white/25 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', mono }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED]',
        'placeholder:text-white/20 outline-none transition-all',
        mono && 'font-mono',
      )}
      style={{ background: BG_INPUT, border: '1px solid rgba(255,255,255,0.07)' }}
      onFocus={e  => { e.currentTarget.style.borderColor = 'rgba(232,82,26,0.45)' }}
      onBlur={e   => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED]
                 placeholder:text-white/20 outline-none resize-none transition-all"
      style={{ background: BG_INPUT, border: '1px solid rgba(255,255,255,0.07)' }}
      onFocus={e  => { e.currentTarget.style.borderColor = 'rgba(232,82,26,0.45)' }}
      onBlur={e   => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
    />
  )
}

function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 p-5 rounded-xl"
      style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <p className="text-[13px] font-semibold text-[#EDEDED]">{title}</p>
        {description && <p className="text-[11px] text-white/30 mt-0.5">{description}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

// ── Geral tab ─────────────────────────────────────────────────

function GeralPanel({
  product, onUpdate, onThumbnailClick, uploading,
}: {
  product:          Partial<Product>
  onUpdate:         (fields: Partial<Product>) => void
  onThumbnailClick: () => void
  uploading:        boolean
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main fields */}
      <div className="lg:col-span-2 flex flex-col gap-5">
        <Section title="Informações Básicas" description="Dados públicos exibidos na página de vendas.">
          <Field label="Nome do Produto">
            <Input
              value={product.name ?? ''}
              onChange={v => onUpdate({ name: v })}
              placeholder="Ex: Mentoria Intensiva Koukousei"
            />
          </Field>
          <Field label="Slug da URL" hint="Gerado automaticamente. Você pode editar.">
            <div className="flex items-center rounded-lg overflow-hidden"
              style={{ background: BG_INPUT, border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="px-3 text-[12px] text-white/25 select-none shrink-0"
                style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                bridge.com/
              </span>
              <input
                value={product.slug ?? ''}
                onChange={e => onUpdate({ slug: e.target.value })}
                className="flex-1 px-3 py-2.5 bg-transparent text-[13px] text-[#EDEDED]
                           placeholder:text-white/20 outline-none"
                placeholder="mentoria-intensiva"
              />
            </div>
          </Field>
          <Field label="Descrição" hint="Aparece nas listagens e no e-mail de confirmação.">
            <Textarea
              value={product.description ?? ''}
              onChange={v => onUpdate({ description: v })}
              placeholder="Descreva o que o aluno vai aprender ou conquistar..."
              rows={5}
            />
          </Field>
        </Section>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-4">
        {/* Thumbnail */}
        <Section title="Thumbnail" description="Imagem de capa do produto. PNG ou JPG, máx. 4MB.">
          <button
            type="button"
            onClick={onThumbnailClick}
            disabled={uploading}
            className="w-full aspect-video rounded-xl flex flex-col items-center justify-center gap-3
                       border-2 border-dashed transition-all relative overflow-hidden"
            style={{ borderColor: 'rgba(255,255,255,0.07)', background: BG_INPUT }}
            onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,82,26,0.4)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)' }}
          >
            {product.thumbnail_url && !uploading ? (
              <>
                <img src={product.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity
                                flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-white" />
                  <span className="text-[12px] text-white font-medium">Trocar imagem</span>
                </div>
              </>
            ) : uploading ? (
              <Loader2 className="w-5 h-5 text-[#E8521A] animate-spin" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(232,82,26,0.1)' }}>
                  <ImageIcon className="w-5 h-5 text-[#E8521A]" />
                </div>
                <div className="text-center px-4">
                  <p className="text-[12px] font-medium text-white/40">Clique para enviar</p>
                  <p className="text-[11px] text-white/20 mt-0.5">PNG, JPG, WebP · Máx. 4MB</p>
                </div>
              </>
            )}
          </button>
          {product.thumbnail_url && (
            <button
              type="button"
              onClick={() => onUpdate({ thumbnail_url: null })}
              className="text-[11px] text-white/25 hover:text-red-400 transition-colors text-center w-full"
            >
              Remover imagem
            </button>
          )}
        </Section>

        {/* Status */}
        <Section title="Visibilidade">
          <div className="flex flex-col gap-2">
            {(['draft', 'published', 'archived'] as ProductStatus[]).map(s => {
              const st     = STATUS_STYLE[s]
              const active = product.status === s
              return (
                <button
                  key={s}
                  onClick={() => onUpdate({ status: s })}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all w-full',
                    active ? 'ring-1 ring-[#E8521A]/40' : '',
                  )}
                  style={{ background: active ? 'rgba(232,82,26,0.06)' : BG_INPUT, border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md', st.cls)}>
                    {st.label}
                  </span>
                  {active && <Check className="w-3.5 h-3.5 text-[#E8521A] ml-auto" />}
                </button>
              )
            })}
          </div>
        </Section>
      </div>
    </div>
  )
}

// ── Precificação tab ──────────────────────────────────────────

function PrecificacaoPanel({
  product, onUpdate, formNodes,
}: {
  product:   Partial<Product>
  onUpdate:  (fields: Partial<Product>) => void
  formNodes: FormNode[]
}) {
  // Collect all option prices from quiz nodes
  const quizPrices: { question: string; option: string; priceId: string; amount: number; currency: string }[] = []
  for (const node of formNodes) {
    if (node.optionPrices) {
      for (const [option, price] of Object.entries(node.optionPrices)) {
        if (price?.priceId) {
          quizPrices.push({ question: node.title, option, ...price })
        }
      }
    }
  }

  const rawId = (product.price_id_stripe ?? '').replace(/^price_/, '')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Stripe principal */}
      <Section title="Preço Principal" description="Price ID do Stripe para o plano base do produto.">
        <Field
          label="Preço principal"
          hint="Busca automática dos preços ativos na sua conta Stripe."
        >
          <StripePricePicker
            value={product.price_id_stripe ?? ''}
            onChange={(priceId, _meta) => onUpdate({ price_id_stripe: priceId })}
          />
        </Field>

        {rawId && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
            style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] text-emerald-400 font-mono truncate">price_{rawId}</span>
          </div>
        )}

        <a
          href="https://dashboard.stripe.com/products"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Abrir Stripe Dashboard
        </a>
      </Section>

      {/* Preços do quizz */}
      <Section
        title="Preços Configurados no Quizz"
        description="Price IDs definidos nas opções do Formulário de Qualificação."
      >
        {quizPrices.length === 0 ? (
          <div className="py-6 flex flex-col items-center gap-2 text-center">
            <p className="text-[12px] text-white/30 leading-relaxed">
              Nenhum preço vinculado a opções do quizz ainda.
            </p>
            <p className="text-[11px] text-white/20 leading-relaxed">
              Vá para a aba <strong className="text-white/35">Formulário</strong>, selecione uma questão
              de escolha e configure um Price ID por opção.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {quizPrices.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#EDEDED] truncate">{p.option}</p>
                  <p className="text-[10px] font-mono text-white/25 truncate mt-0.5">{p.priceId}</p>
                </div>
                <span className="text-[13px] font-bold font-mono text-[#E8521A] shrink-0">
                  {p.currency.toUpperCase() === 'JPY'
                    ? `¥${p.amount.toLocaleString()}`
                    : `R$${(p.amount / 100).toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

// ── Formulário tab ────────────────────────────────────────────

function FormularioPanel({ nodes, onChange }: { nodes: FormNode[]; onChange: (nodes: FormNode[]) => void }) {
  return <FormBuilder nodes={nodes} onChange={onChange} />
}

// ── Vendas tab ────────────────────────────────────────────────

function VendasPanel({ productId, productSlug }: { productId: string; productSlug?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(232,82,26,0.1)', border: '1px solid rgba(232,82,26,0.15)' }}>
        <LayoutTemplate className="w-7 h-7 text-[#E8521A]" />
      </div>
      <div>
        <h3 className="text-[15px] font-bold text-[#EDEDED] tracking-tight">Editor Visual de Página de Vendas</h3>
        <p className="text-[13px] text-white/30 mt-2 max-w-sm leading-relaxed">
          Abra o editor completo para criar blocos, editar layout e publicar a página de vendas deste produto.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to={`/admin/products/${productId}/edit`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold text-white transition-all"
          style={{ background: '#E8521A', boxShadow: '0 4px 24px rgba(232,82,26,0.2)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#C43E10' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#E8521A' }}
        >
          <Globe className="w-3.5 h-3.5" />
          Abrir Editor Visual
        </Link>

        {productSlug && (
          <a
            href={`/${productSlug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver página pública
          </a>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function ProductConfigPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [product,   setProduct]   = useState<Partial<Product>>({ name: 'Carregando...', status: 'draft', slug: '' })
  const [formNodes, setFormNodes] = useState<FormNode[]>([])
  const [tab,       setTab]       = useState<TabId>('geral')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)

  const fileInputRef  = useRef<HTMLInputElement>(null)
  const initDone      = useRef(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load product
  useEffect(() => {
    if (!id || id === 'new') {
      setLoading(false)
      setProduct({ name: 'Novo Produto', status: 'draft', slug: '' })
      setTimeout(() => { initDone.current = true }, 100)
      return
    }
    supabase.from('products').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (data) {
          setProduct(data as Product)
          const cfg = data.form_logic_config as Record<string, unknown>
          if (Array.isArray(cfg?.nodes)) setFormNodes(cfg.nodes as FormNode[])
        }
        setLoading(false)
        setTimeout(() => { initDone.current = true }, 100)
      })
  }, [id])

  // Auto-save form nodes (debounced)
  useEffect(() => {
    if (!initDone.current || !id || id === 'new') return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      await supabase.from('products').update({ form_logic_config: { nodes: formNodes } }).eq('id', id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 1200)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [formNodes]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!id || id === 'new') return
    setSaving(true)
    await supabase.from('products').update({
      name:              product.name,
      slug:              product.slug,
      description:       product.description,
      status:            product.status,
      thumbnail_url:     product.thumbnail_url ?? null,
      price_id_stripe:   product.price_id_stripe ?? null,
      form_logic_config: { nodes: formNodes },
    }).eq('id', id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleThumbnailUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id || id === 'new') return
    if (file.size > 4 * 1024 * 1024) { alert('Arquivo muito grande. Máximo 4MB.'); return }
    setUploading(true)
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${id}/thumbnail.${ext}`
    const { error } = await supabase.storage.from('products').upload(path, file, { upsert: true })
    if (error) {
      alert(`Erro ao enviar imagem: ${error.message}\n\nVerifique se o bucket "products" existe e é público no Supabase Storage.`)
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path)
    setProduct(prev => ({ ...prev, thumbnail_url: publicUrl }))
    setUploading(false)
    // Persist immediately
    await supabase.from('products').update({ thumbnail_url: publicUrl }).eq('id', id)
  }

  const statusStyle = STATUS_STYLE[product.status ?? 'draft']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: BG_PAGE }}>
        <div className="w-5 h-5 rounded-full border-2 border-[#E8521A] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: BG_PAGE }}>
      {/* Hidden file input for thumbnail */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleThumbnailUpload}
      />

      {/* Page header */}
      <div
        className="shrink-0 flex items-center gap-4 px-8 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#13151A' }}
      >
        <button
          onClick={() => navigate('/admin/products')}
          className="flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Produtos
        </button>

        <span className="text-white/10">/</span>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-[15px] font-bold text-[#EDEDED] tracking-tight truncate">
            {product.name}
          </h1>
          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0', statusStyle.cls)}>
            {statusStyle.label}
          </span>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-semibold
                     text-white transition-all disabled:opacity-70"
          style={{ background: saved ? '#16A34A' : '#E8521A', boxShadow: '0 4px 16px rgba(232,82,26,0.2)' }}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : saved  ? <Check   className="w-3.5 h-3.5" />
          :          <Save    className="w-3.5 h-3.5" />}
          {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      {/* Tab bar */}
      <div
        className="shrink-0 flex items-end gap-1 px-8"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#13151A' }}
      >
        {TABS.map(t => {
          const Icon   = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-all',
                active ? 'text-[#EDEDED]' : 'text-white/35 hover:text-white/60',
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', active ? 'text-[#E8521A]' : 'text-white/25')} />
              {t.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: '#E8521A' }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === 'formulario' ? (
        <div className="flex-1 overflow-hidden">
          <FormularioPanel nodes={formNodes} onChange={setFormNodes} />
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-8 py-6">
          {tab === 'geral' && (
            <GeralPanel
              product={product}
              onUpdate={fields => setProduct(prev => ({ ...prev, ...fields }))}
              onThumbnailClick={() => fileInputRef.current?.click()}
              uploading={uploading}
            />
          )}
          {tab === 'precificacao' && (
            <PrecificacaoPanel
              product={product}
              onUpdate={fields => setProduct(prev => ({ ...prev, ...fields }))}
              formNodes={formNodes}
            />
          )}
          {tab === 'vendas' && (
            <VendasPanel productId={id ?? ''} productSlug={product.slug} />
          )}
        </div>
      )}
    </div>
  )
}

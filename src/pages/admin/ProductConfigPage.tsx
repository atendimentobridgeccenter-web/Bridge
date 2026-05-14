import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Save, Globe, Settings, CreditCard,
  ClipboardList, LayoutTemplate, ExternalLink,
  Loader2, Check, Image as ImageIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { Product, ProductStatus } from '@/lib/types'

// ── Tokens ────────────────────────────────────────────────────

const BG_PAGE  = '#0F1117'
const BG_CARD  = '#1A1C23'
const BG_INPUT = '#0D0E12'

// ── Tabs config ───────────────────────────────────────────────

type TabId = 'geral' | 'precificacao' | 'formulario' | 'vendas'

const TABS: { id: TabId; icon: React.ElementType; label: string; sub: string }[] = [
  { id: 'geral',        icon: Settings,       label: 'Geral',                    sub: 'Nome, descrição e thumbnail'         },
  { id: 'precificacao', icon: CreditCard,      label: 'Precificação',             sub: 'Stripe, variantes e planos'          },
  { id: 'formulario',   icon: ClipboardList,   label: 'Formulário de Qualificação', sub: 'Construtor estilo Typeform'        },
  { id: 'vendas',       icon: LayoutTemplate,  label: 'Página de Vendas',         sub: 'Editor visual GrapesJS'             },
]

// ── Status badge ──────────────────────────────────────────────

const STATUS_STYLE: Record<ProductStatus, { label: string; cls: string }> = {
  published: { label: 'Publicado', cls: 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20' },
  draft:     { label: 'Rascunho',  cls: 'bg-amber-500/12  text-amber-400  border border-amber-500/20'    },
  archived:  { label: 'Arquivado', cls: 'bg-white/4        text-white/30   border border-white/8'         },
}

// ── Field wrapper ─────────────────────────────────────────────

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

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED]
                 placeholder:text-white/20 outline-none transition-all"
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

// ── Tab panels ────────────────────────────────────────────────

function GeralPanel({ product, onUpdate }: {
  product: Partial<Product>
  onUpdate: (fields: Partial<Product>) => void
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
          <Field label="Slug da URL" hint="URL amigável gerada automaticamente. Você pode editar.">
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
          <Field label="Descrição" hint="Aparece nas listagens e no email de confirmação.">
            <Textarea
              value={product.description ?? ''}
              onChange={v => onUpdate({ description: v })}
              placeholder="Descreva o que o aluno vai aprender ou conquistar..."
              rows={5}
            />
          </Field>
        </Section>
      </div>

      {/* Thumbnail */}
      <div className="flex flex-col gap-4">
        <Section title="Thumbnail" description="Imagem de capa do produto.">
          <div
            className="w-full aspect-video rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer
                       border-2 border-dashed transition-all"
            style={{ borderColor: 'rgba(255,255,255,0.07)', background: BG_INPUT }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,82,26,0.3)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)' }}
          >
            {product.thumbnail_url ? (
              <img src={product.thumbnail_url} alt="" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(232,82,26,0.1)' }}>
                  <ImageIcon className="w-4.5 h-4.5 text-[#E8521A]" />
                </div>
                <div className="text-center">
                  <p className="text-[12px] font-medium text-white/40">Clique para enviar</p>
                  <p className="text-[11px] text-white/20 mt-0.5">PNG, JPG · Máx. 4MB</p>
                </div>
              </>
            )}
          </div>
        </Section>

        {/* Status */}
        <Section title="Visibilidade">
          <div className="flex flex-col gap-2">
            {(['draft', 'published', 'archived'] as ProductStatus[]).map(s => {
              const st = STATUS_STYLE[s]
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

function PrecificacaoPanel({ product }: { product: Partial<Product> }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Section title="Integração Stripe" description="Conecte um Price ID do Stripe para processar pagamentos.">
        <Field label="Stripe Price ID" hint="Encontre em dashboard.stripe.com → Produtos → Preços.">
          <div className="flex items-center rounded-lg overflow-hidden"
            style={{ background: BG_INPUT, border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="px-3 text-[11px] font-mono text-white/25 shrink-0 select-none"
              style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
              price_
            </span>
            <input
              defaultValue={product.price_id_stripe?.replace('price_', '') ?? ''}
              className="flex-1 px-3 py-2.5 bg-transparent text-[13px] font-mono text-[#EDEDED]
                         placeholder:text-white/20 outline-none"
              placeholder="xxxxxxxxxxxxxxxx"
            />
          </div>
        </Field>
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

      <Section title="Variantes de Preço" description="Configure planos e periodicidades.">
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          {[
            { nome: 'Mensal',   preco: '¥ 12.000', periodo: '/mês' },
            { nome: 'Trimestral', preco: '¥ 32.000', periodo: '/trim.' },
            { nome: 'Anual',   preco: '¥ 99.000', periodo: '/ano' },
          ].map((v, i, arr) => (
            <div
              key={v.nome}
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
            >
              <div>
                <p className="text-[12px] font-semibold text-[#EDEDED]">{v.nome}</p>
                <p className="text-[11px] text-white/30">{v.preco}<span className="ml-0.5">{v.periodo}</span></p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded text-amber-400"
                style={{ background: 'rgba(251,191,36,0.1)' }}>
                Mock
              </span>
            </div>
          ))}
        </div>
        <button
          className="w-full py-2 rounded-lg text-[12px] font-medium text-white/40 hover:text-white/70 transition-colors"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)' }}
        >
          + Adicionar variante
        </button>
      </Section>
    </div>
  )
}

function FormularioPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <ClipboardList className="w-7 h-7 text-indigo-400" />
      </div>
      <h3 className="text-[15px] font-bold text-[#EDEDED] tracking-tight">Construtor de Formulário</h3>
      <p className="text-[13px] text-white/30 mt-2 max-w-sm leading-relaxed">
        O construtor estilo Typeform será implementado aqui. Configure perguntas de qualificação que determinam o preço e o segmento do lead.
      </p>
      <div className="flex items-center gap-2 mt-6 px-4 py-2.5 rounded-full"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
        <span className="text-[12px] font-medium text-indigo-400">Em desenvolvimento</span>
      </div>
    </div>
  )
}

function VendasPanel({ productId }: { productId: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(232,82,26,0.1)', border: '1px solid rgba(232,82,26,0.15)' }}>
        <LayoutTemplate className="w-7 h-7 text-[#E8521A]" />
      </div>
      <h3 className="text-[15px] font-bold text-[#EDEDED] tracking-tight">Página de Vendas</h3>
      <p className="text-[13px] text-white/30 mt-2 max-w-sm leading-relaxed">
        Abra o editor visual GrapesJS para criar e publicar a página de vendas deste produto.
      </p>
      <Link
        to={`/admin/builder/${productId}`}
        className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full text-[13px] font-semibold text-white transition-all"
        style={{ background: '#E8521A', boxShadow: '0 4px 24px rgba(232,82,26,0.2)' }}
      >
        <Globe className="w-3.5 h-3.5" />
        Abrir Editor Visual
      </Link>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────

function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 p-5 rounded-xl" style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <p className="text-[13px] font-semibold text-[#EDEDED]">{title}</p>
        {description && <p className="text-[11px] text-white/30 mt-0.5">{description}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function ProductConfigPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()

  const [product, setProduct] = useState<Partial<Product>>({
    name:   'Carregando...',
    status: 'draft',
    slug:   '',
  })
  const [tab,     setTab]     = useState<TabId>('geral')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || id === 'new') { setLoading(false); setProduct({ name: 'Novo Produto', status: 'draft', slug: '' }); return }
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) setProduct(data as Product)
        setLoading(false)
      })
  }, [id])

  async function handleSave() {
    if (!id || id === 'new') return
    setSaving(true)
    await supabase.from('products').update({
      name:          product.name,
      slug:          product.slug,
      description:   product.description,
      status:        product.status,
      thumbnail_url: product.thumbnail_url,
    }).eq('id', id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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

        {/* Save */}
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
          const Icon    = t.icon
          const active  = tab === t.id
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
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: '#E8521A' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {tab === 'geral' && (
          <GeralPanel
            product={product}
            onUpdate={fields => setProduct(prev => ({ ...prev, ...fields }))}
          />
        )}
        {tab === 'precificacao' && <PrecificacaoPanel product={product} />}
        {tab === 'formulario'   && <FormularioPanel />}
        {tab === 'vendas'       && <VendasPanel productId={id ?? ''} />}
      </div>
    </div>
  )
}

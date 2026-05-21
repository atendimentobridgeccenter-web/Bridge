import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Edit3, Trash2, Package, X, ChevronRight,
  MoreHorizontal, Copy, Globe, ShoppingCart, Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { Product, ProductStatus } from '@/lib/types'

// ── Tokens ────────────────────────────────────────────────────

const BG_CARD  = '#1A1C23'
const BG_INPUT = '#13151A'
const BG_PAGE  = '#0F1117'
const BG_DROP  = '#1E2029'

// ── Types ─────────────────────────────────────────────────────

type BadgeVariant = 'success' | 'warning' | 'info' | 'orange' | 'muted' | 'violet'
type ProductModel = 'paid' | 'lead'
type TipoKey     = 'Curso' | 'Simulado' | 'Mentoria' | 'Produto'

// ── Badge ─────────────────────────────────────────────────────

function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  const cls: Record<BadgeVariant, string> = {
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10  text-amber-400  border border-amber-500/20',
    info:    'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    orange:  'bg-[#E8521A]/10  text-[#F0643A]  border border-[#E8521A]/20',
    muted:   'bg-white/4       text-white/30   border border-white/8',
    violet:  'bg-violet-500/10 text-violet-300 border border-violet-500/20',
  }
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap',
      cls[variant],
    )}>
      {label}
    </span>
  )
}

// ── Status / tipo config ──────────────────────────────────────

const STATUS_MAP: Record<ProductStatus, { label: string; variant: BadgeVariant }> = {
  published: { label: 'Publicado', variant: 'success' },
  draft:     { label: 'Rascunho',  variant: 'warning' },
  archived:  { label: 'Arquivado', variant: 'muted'   },
}

const TIPO_VARIANT: Record<TipoKey, BadgeVariant> = {
  Curso:    'info',
  Simulado: 'orange',
  Mentoria: 'info',
  Produto:  'muted',
}

// ── Row ───────────────────────────────────────────────────────

interface ProductRow {
  id:        string
  emoji:     string
  name:      string
  slug:      string
  tipo:      TipoKey
  preco:     string
  variantes: string[]
  status:    ProductStatus
  model:     ProductModel
  hasPrice:  boolean
  isReal:    boolean
}

const MOCK_ROWS: ProductRow[] = [
  { id: 'mock-1', emoji: '📚', name: 'Reforço Escolar',         slug: 'reforco-escolar',         tipo: 'Curso',    preco: '¥ 12.000', variantes: ['Mensal', 'Trim.', 'Anual'], status: 'published', model: 'paid', hasPrice: true,  isReal: false },
  { id: 'mock-2', emoji: '🎯', name: 'Simulado Koukousei 2025', slug: 'simulado-koukousei-2025', tipo: 'Simulado', preco: '¥ 5.800',  variantes: ['Único'],                   status: 'published', model: 'paid', hasPrice: true,  isReal: false },
  { id: 'mock-3', emoji: '🎁', name: 'E-book Gratuito',         slug: 'ebook-gratuito',          tipo: 'Produto',  preco: '—',        variantes: ['Único'],                   status: 'draft',     model: 'lead', hasPrice: false, isReal: false },
]

function toRow(p: Product): ProductRow {
  const hasPrice = !!p.price_id_stripe
  return {
    id:        p.id,
    emoji:     '📦',
    name:      p.name,
    slug:      p.slug,
    tipo:      'Produto',
    preco:     hasPrice ? 'Configurado' : '—',
    variantes: ['Único'],
    status:    p.status,
    model:     hasPrice ? 'paid' : 'lead',
    hasPrice,
    isReal:    true,
  }
}

// ── Actions Dropdown ──────────────────────────────────────────

function ActionsDropdown({
  row,
  onEdit,
  onDelete,
}: {
  row:      ProductRow
  onEdit:   (id: string) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const origin = window.location.origin

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [open])

  async function copy(url: string, label: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(`Link copiado: ${label}`, { description: url })
    } catch {
      toast.error('Não foi possível acessar a área de transferência.')
    }
    setOpen(false)
  }

  const copyLinks = [
    { icon: Globe,        label: 'Funil Completo',      desc: 'Sales Page + Quizz',  url: `${origin}/${row.slug}` },
    { icon: Users,        label: 'Somente Quizz',        desc: 'Formulário direto',   url: `${origin}/apply?product=${row.slug}` },
    ...(row.hasPrice
      ? [{ icon: ShoppingCart, label: 'Direto pro Checkout', desc: 'Requer preço ativo',  url: `${origin}/checkout/${row.slug}` }]
      : []
    ),
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
          open
            ? 'text-white/80 bg-white/8'
            : 'text-white/25 hover:text-white/60 hover:bg-white/5',
        )}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-[220px] rounded-xl z-50 overflow-hidden py-1.5"
          style={{
            background:  BG_DROP,
            border:      '1px solid rgba(255,255,255,0.09)',
            boxShadow:   '0 20px 48px rgba(0,0,0,0.55)',
          }}
        >
          {/* Editar */}
          <MenuItem
            icon={Edit3}
            label="Editar Produto"
            onClick={() => { onEdit(row.id); setOpen(false) }}
          />

          {/* Links */}
          <Separator />
          <p className="px-4 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">
            Copiar Link
          </p>

          {copyLinks.map(({ icon: Icon, label, desc, url }) => (
            <button
              key={label}
              onClick={() => copy(url, label)}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/4 transition-colors group"
            >
              <Icon className="w-3.5 h-3.5 text-white/25 shrink-0 group-hover:text-white/50" />
              <div className="text-left min-w-0">
                <p className="text-[12px] text-white/65 group-hover:text-white/90 leading-tight">{label}</p>
                <p className="text-[10px] text-white/25 truncate">{desc}</p>
              </div>
              <Copy className="w-3 h-3 text-white/15 ml-auto shrink-0 group-hover:text-white/40" />
            </button>
          ))}

          {/* Excluir */}
          {row.isReal && (
            <>
              <Separator />
              <MenuItem
                icon={Trash2}
                label="Excluir Produto"
                danger
                onClick={() => { setOpen(false); onDelete(row.id) }}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon: Icon, label, onClick, danger = false,
}: {
  icon:    React.ElementType
  label:   string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-colors',
        danger
          ? 'text-red-400/70 hover:text-red-400 hover:bg-red-500/6'
          : 'text-white/60 hover:text-white/90 hover:bg-white/4',
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
    </button>
  )
}

function Separator() {
  return <div className="mx-3 my-1.5" style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
}

// ── Table row ─────────────────────────────────────────────────

function ProductTableRow({
  row, onEdit, onDelete,
}: {
  row:      ProductRow
  onEdit:   (id: string) => void
  onDelete: (id: string) => void
}) {
  const status = STATUS_MAP[row.status]
  return (
    <tr
      className="group border-b transition-colors duration-100"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#22242F' }}
      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
    >
      {/* Produto */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {row.emoji}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#EDEDED] leading-none">{row.name}</p>
            <p className="text-[11px] text-white/25 mt-0.5">/{row.slug}</p>
          </div>
        </div>
      </td>

      {/* Tipo */}
      <td className="px-5 py-3.5">
        <Badge label={row.tipo} variant={TIPO_VARIANT[row.tipo]} />
      </td>

      {/* Preço / Modelo */}
      <td className="px-5 py-3.5">
        {row.model === 'lead' ? (
          <Badge label="Captação (Lead)" variant="violet" />
        ) : (
          <span className="text-[13px] font-semibold text-[#EDEDED] tabular-nums">{row.preco}</span>
        )}
      </td>

      {/* Variantes */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {row.variantes.map(v => (
            <span key={v} className="text-[11px] px-2 py-0.5 rounded-md text-white/40"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              {v}
            </span>
          ))}
        </div>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <Badge label={status.label} variant={status.variant} />
      </td>

      {/* Ações */}
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionsDropdown row={row} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </td>
    </tr>
  )
}

// ── New Product Drawer ────────────────────────────────────────

interface DrawerProps {
  open:    boolean
  onClose: () => void
  onSave:  (name: string, model: ProductModel) => void
}

function NewProductDrawer({ open, onClose, onSave }: DrawerProps) {
  const [name,  setName]  = useState('')
  const [model, setModel] = useState<ProductModel>('paid')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(''); setModel('paid')
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  function handleSave() {
    if (!name.trim()) { inputRef.current?.focus(); return }
    onSave(name.trim(), model)
  }

  return (
    <div className={cn('fixed inset-0 z-50 transition-all duration-300', open ? 'pointer-events-auto' : 'pointer-events-none')}>
      <div
        className={cn('absolute inset-0 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      <div
        className={cn(
          'absolute top-0 right-0 h-full w-[440px] flex flex-col',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ background: '#16181F', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-[15px] font-bold text-[#EDEDED] tracking-tight">Criar Novo Produto</h2>
            <p className="text-[12px] text-white/35 mt-1">Defina o modelo e crie o rascunho.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/6 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">

          {/* Nome */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">
              Nome do Produto
            </label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="Ex: Mentoria Intensiva"
              className="w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none transition-all"
              style={{ background: '#0D0E12', border: '1px solid rgba(255,255,255,0.07)' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(232,82,26,0.5)' }}
              onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
            />
          </div>

          {/* Modelo de Negócio */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">
              Modelo de Negócio
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'paid' as const, icon: '💳', label: 'Produto Pago',        desc: 'Checkout via Stripe' },
                { key: 'lead' as const, icon: '🎁', label: 'Captação de Lead',    desc: 'Gratuito / Funil de leads' },
              ]).map(({ key, icon, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setModel(key)}
                  className="flex flex-col items-start gap-1 px-3.5 py-3 rounded-lg text-left transition-all"
                  style={{
                    background:   model === key ? 'rgba(232,82,26,0.08)' : '#0D0E12',
                    border:       model === key ? '1px solid rgba(232,82,26,0.40)' : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <span className="text-base">{icon}</span>
                  <span className="text-[12px] font-semibold text-white/80">{label}</span>
                  <span className="text-[10px] text-white/30 leading-snug">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dica contextual */}
          <div
            className="rounded-lg px-4 py-3 flex items-start gap-3"
            style={{ background: 'rgba(232,82,26,0.06)', border: '1px solid rgba(232,82,26,0.12)' }}
          >
            <ChevronRight className="w-3.5 h-3.5 text-[#E8521A] mt-0.5 shrink-0" />
            <p className="text-[11px] text-white/40 leading-relaxed">
              {model === 'paid'
                ? 'Configure o preço e integração Stripe na aba "Precificação" após criar o produto.'
                : 'Produto gratuito — o fluxo final do Quizz exibirá uma página de sucesso em vez de redirecionar ao checkout.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all"
            style={{ background: '#E8521A', boxShadow: '0 4px 24px rgba(232,82,26,0.22)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#C43E10' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E8521A' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Criar Rascunho
          </button>
          <button onClick={onClose} className="w-full mt-2 py-2 text-[12px] text-white/25 hover:text-white/50 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function Products() {
  const navigate = useNavigate()

  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const [query,    setQuery]    = useState('')
  const [drawer,   setDrawer]   = useState(false)

  async function load() {
    const { data } = await supabase
      .from('products')
      .select('id,name,slug,status,thumbnail_url,price_id_stripe,created_at')
      .order('created_at', { ascending: false })
    setProducts((data ?? []) as Product[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function deleteProduct(id: string) {
    if (!confirm('Excluir este produto permanentemente?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { toast.error(`Erro ao excluir: ${error.message}`); return }
    setProducts(ps => ps.filter(p => p.id !== id))
    toast.success('Produto excluído.')
  }

  async function handleCreate(name: string, model: ProductModel) {
    setDrawer(false)
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + `-${Date.now()}`
    const { data, error } = await supabase
      .from('products')
      .insert({
        name,
        slug,
        status: 'draft',
        checkout_config: model === 'lead' ? { type: 'lead' } : { type: 'paid' },
      })
      .select('id')
      .single()
    if (error) { toast.error(`Erro ao criar produto: ${error.message}`); return }
    if (data) navigate(`/admin/products/${data.id}`)
  }

  const rows = useMemo(() =>
    products.length > 0 ? products.map(toRow) : MOCK_ROWS,
    [products],
  )

  const filtered = useMemo(() =>
    query.trim()
      ? rows.filter(r =>
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          r.tipo.toLowerCase().includes(query.toLowerCase()),
        )
      : rows,
    [rows, query],
  )

  const publishedCount = rows.filter(r => r.status === 'published').length

  return (
    <>
      <div className="flex flex-col h-full" style={{ background: BG_PAGE }}>
        <div className="max-w-6xl w-full mx-auto px-8 py-8 flex flex-col gap-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#EDEDED] tracking-tight">Produtos</h1>
              <p className="text-[13px] text-white/30 mt-0.5">Catálogo de produtos e serviços Bridge</p>
            </div>
            <button
              onClick={() => setDrawer(true)}
              className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold text-white rounded-full transition-all"
              style={{ background: '#E8521A', boxShadow: '0 8px 32px rgba(232,82,26,0.25)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#C43E10' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E8521A' }}
            >
              <Plus className="w-3.5 h-3.5" /> Novo Produto
            </button>
          </div>

          {/* Table card */}
          <div className="rounded-2xl overflow-hidden" style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3">
                <p className="text-[14px] font-semibold text-[#EDEDED]">Todos os produtos</p>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md text-emerald-400"
                  style={{ background: 'rgba(52,211,153,0.1)' }}>
                  {publishedCount} publicado{publishedCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md"
                style={{ background: BG_INPUT, border: '1px solid rgba(255,255,255,0.07)' }}>
                <Search className="w-3.5 h-3.5 text-white/25 shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar produtos..."
                  className="bg-transparent border-0 outline-none text-[12px] text-white/70 placeholder:text-white/25 w-44"
                />
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 rounded-full border-2 border-[#E8521A] border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['Produto', 'Tipo', 'Preço', 'Variantes', 'Status', ''].map((h, i) => (
                        <th key={i} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ background: 'rgba(255,255,255,0.04)' }}>
                              <Package className="w-4 h-4 text-white/20" />
                            </div>
                            <p className="text-[13px] text-white/30">Nenhum produto encontrado</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map(row => (
                        <ProductTableRow
                          key={row.id}
                          row={row}
                          onEdit={id => navigate(`/admin/products/${id}`)}
                          onDelete={deleteProduct}
                        />
                      ))
                    )}
                  </tbody>
                </table>

                {!products.length && (
                  <div className="px-5 py-3 flex items-center gap-2"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-widest"
                      style={{ background: 'rgba(232,82,26,0.12)', color: '#F0643A' }}>Demo</span>
                    <p className="text-[11px] text-white/20">
                      Dados de exemplo. Crie seu primeiro produto para ver dados reais.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <NewProductDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        onSave={handleCreate}
      />
    </>
  )
}

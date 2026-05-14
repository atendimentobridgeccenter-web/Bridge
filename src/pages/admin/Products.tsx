import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit3, Globe, Trash2, Package, X, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { Product, ProductStatus } from '@/lib/types'

// ── Tokens ────────────────────────────────────────────────────

const BG_CARD  = '#1A1C23'
const BG_INPUT = '#13151A'
const BG_PAGE  = '#0F1117'

// ── Badge ─────────────────────────────────────────────────────

type BadgeVariant = 'success' | 'warning' | 'info' | 'orange' | 'muted'

function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  const cls: Record<BadgeVariant, string> = {
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10  text-amber-400  border border-amber-500/20',
    info:    'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    orange:  'bg-[#E8521A]/10  text-[#F0643A]  border border-[#E8521A]/20',
    muted:   'bg-white/4       text-white/30   border border-white/8',
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

// ── Status config ─────────────────────────────────────────────

const STATUS_MAP: Record<ProductStatus, { label: string; variant: BadgeVariant }> = {
  published: { label: 'Publicado', variant: 'success' },
  draft:     { label: 'Rascunho',  variant: 'warning' },
  archived:  { label: 'Arquivado', variant: 'muted'   },
}

type TipoKey = 'Curso' | 'Simulado' | 'Mentoria' | 'Produto'
const TIPO_VARIANT: Record<TipoKey, BadgeVariant> = {
  Curso:    'info',
  Simulado: 'orange',
  Mentoria: 'info',
  Produto:  'muted',
}

// ── Row type ──────────────────────────────────────────────────

interface ProductRow {
  id:        string
  emoji:     string
  name:      string
  slug:      string
  tipo:      TipoKey
  preco:     string
  variantes: string[]
  status:    ProductStatus
  isReal:    boolean
}

const MOCK_ROWS: ProductRow[] = [
  { id: 'mock-1', emoji: '📚', name: 'Reforço Escolar',        slug: 'reforco-escolar',         tipo: 'Curso',    preco: '¥ 12.000', variantes: ['Mensal', 'Trim.', 'Anual'],   status: 'published', isReal: false },
  { id: 'mock-2', emoji: '🎯', name: 'Simulado Koukousei 2025', slug: 'simulado-koukousei-2025', tipo: 'Simulado', preco: '¥ 5.800',  variantes: ['Único'],                      status: 'published', isReal: false },
  { id: 'mock-3', emoji: '🧑‍🏫', name: 'Mentoria 1:1',          slug: 'mentoria-1-1',            tipo: 'Mentoria', preco: '¥ 38.000', variantes: ['4 sessões', '8 sessões'],     status: 'draft',     isReal: false },
]

function toRow(p: Product): ProductRow {
  return { id: p.id, emoji: '📦', name: p.name, slug: p.slug, tipo: 'Produto',
           preco: p.price_id_stripe ? 'Configurado' : '—', variantes: ['Único'], status: p.status, isReal: true }
}

// ── Drawer ────────────────────────────────────────────────────

interface DrawerProps {
  open:    boolean
  onClose: () => void
  onSave:  (name: string, tipo: TipoKey, preco: string) => void
}

function NewProductDrawer({ open, onClose, onSave }: DrawerProps) {
  const [name,  setName]  = useState('')
  const [tipo,  setTipo]  = useState<TipoKey>('Curso')
  const [preco, setPreco] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset + focus on open
  useEffect(() => {
    if (open) {
      setName(''); setTipo('Curso'); setPreco('')
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  function handleSave() {
    if (!name.trim()) { inputRef.current?.focus(); return }
    onSave(name.trim(), tipo, preco)
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-all duration-300',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      {/* Overlay */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'absolute top-0 right-0 h-full w-[420px] flex flex-col',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ background: '#16181F', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <h2 className="text-[15px] font-bold text-[#EDEDED] tracking-tight">Criar Novo Produto</h2>
            <p className="text-[12px] text-white/35 mt-1 leading-snug">
              Defina as informações básicas para iniciar o rascunho.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30
                       hover:text-white/70 hover:bg-white/6 transition-all mt-0.5"
          >
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
              className="w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED]
                         placeholder:text-white/20 outline-none transition-all"
              style={{
                background: '#0D0E12',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(232,82,26,0.5)' }}
              onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
            />
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">
              Tipo de Produto
            </label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value as TipoKey)}
              className="w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED]
                         outline-none appearance-none cursor-pointer"
              style={{
                background: '#0D0E12',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <option value="Curso">📚 Curso</option>
              <option value="Simulado">🎯 Simulado</option>
              <option value="Mentoria">🧑‍🏫 Mentoria</option>
              <option value="Produto">📦 Produto Digital</option>
            </select>
          </div>

          {/* Preço */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">
              Preço Base (JPY)
            </label>
            <div
              className="flex items-center rounded-lg overflow-hidden"
              style={{ background: '#0D0E12', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <span
                className="px-3.5 text-[13px] font-semibold text-white/30 select-none shrink-0"
                style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}
              >
                ¥
              </span>
              <input
                type="number"
                value={preco}
                onChange={e => setPreco(e.target.value)}
                placeholder="12.000"
                className="flex-1 px-3 py-2.5 bg-transparent text-[13px] text-[#EDEDED]
                           placeholder:text-white/20 outline-none [appearance:textfield]
                           [&::-webkit-outer-spin-button]:appearance-none
                           [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Divider + tip */}
          <div
            className="rounded-lg px-4 py-3 flex items-start gap-3 mt-2"
            style={{ background: 'rgba(232,82,26,0.06)', border: '1px solid rgba(232,82,26,0.12)' }}
          >
            <ChevronRight className="w-3.5 h-3.5 text-[#E8521A] mt-0.5 shrink-0" />
            <p className="text-[11px] text-white/40 leading-relaxed">
              Você poderá configurar variantes de preço, Stripe e o formulário de qualificação na página do produto.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
                       text-[13px] font-semibold text-white transition-all"
            style={{ background: '#E8521A', boxShadow: '0 4px 24px rgba(232,82,26,0.22)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#C43E10' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E8521A' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Criar Rascunho
          </button>
          <button
            onClick={onClose}
            className="w-full mt-2 py-2 text-[12px] text-white/25 hover:text-white/50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Ghost button ──────────────────────────────────────────────

function GhostBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium
                 text-white/50 hover:text-white/90 transition-colors"
      style={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.07)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1A1C23' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#0F1117' }}
    >
      {children}
    </button>
  )
}

// ── Table row ─────────────────────────────────────────────────

function ProductTableRow({
  row, onEdit, onDelete,
}: {
  row: ProductRow
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
      <td className="px-5 py-3.5">
        <Badge label={row.tipo} variant={TIPO_VARIANT[row.tipo]} />
      </td>
      <td className="px-5 py-3.5">
        <span className="text-[13px] font-semibold text-[#EDEDED] tabular-nums">{row.preco}</span>
      </td>
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
      <td className="px-5 py-3.5">
        <Badge label={status.label} variant={status.variant} />
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GhostBtn onClick={() => onEdit(row.id)}>
            <Edit3 className="w-3 h-3" /> Editar
          </GhostBtn>
          <GhostBtn>
            <Globe className="w-3 h-3" /> Sales Page
          </GhostBtn>
          {row.isReal && (
            <button
              onClick={() => onDelete(row.id)}
              className="p-1.5 rounded-md text-white/20 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
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
    await supabase.from('products').delete().eq('id', id)
    setProducts(ps => ps.filter(p => p.id !== id))
  }

  async function handleCreate(name: string, _tipo: string, _preco: string) {
    setDrawer(false)
    // Create real draft in Supabase then navigate
    const { data, error } = await supabase
      .from('products')
      .insert({ name, slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + `-${Date.now()}`, status: 'draft' })
      .select('id').single()
    if (!error && data) {
      navigate(`/admin/products/${data.id}`)
    }
  }

  const rows = useMemo(() => products.length > 0 ? products.map(toRow) : MOCK_ROWS, [products])

  const filtered = useMemo(() =>
    query.trim()
      ? rows.filter(r => r.name.toLowerCase().includes(query.toLowerCase()) || r.tipo.toLowerCase().includes(query.toLowerCase()))
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
                      {['Produto', 'Tipo', 'Preço', 'Variantes', 'Status', 'Ações'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
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
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
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
                  <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-widest"
                      style={{ background: 'rgba(232,82,26,0.12)', color: '#F0643A' }}>Demo</span>
                    <p className="text-[11px] text-white/20">Dados de exemplo. Crie seu primeiro produto para ver dados reais.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer */}
      <NewProductDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        onSave={handleCreate}
      />
    </>
  )
}

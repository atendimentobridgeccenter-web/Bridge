import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit3, Globe, Trash2, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { Product, ProductStatus } from '@/lib/types'

// ── Design tokens (escopo desta página) ───────────────────────

const BG_CARD   = '#1A1C23'
const BG_INPUT  = '#13151A'
const BG_PAGE   = '#0F1117'

// ── Badge variants ────────────────────────────────────────────

type BadgeVariant = 'success' | 'warning' | 'info' | 'orange' | 'muted'

function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  const styles: Record<BadgeVariant, string> = {
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10  text-amber-400  border border-amber-500/20',
    info:    'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    orange:  'bg-[#E8521A]/10  text-[#F0643A]  border border-[#E8521A]/20',
    muted:   'bg-white/4       text-white/30   border border-white/8',
  }
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap',
      styles[variant],
    )}>
      {label}
    </span>
  )
}

// ── Tipo config ───────────────────────────────────────────────

type TipoKey = 'Curso' | 'Simulado' | 'Mentoria' | 'Produto' | 'Serviço'

const TIPO_VARIANT: Record<TipoKey, BadgeVariant> = {
  Curso:    'info',
  Simulado: 'orange',
  Mentoria: 'info',
  Produto:  'muted',
  Serviço:  'muted',
}

// ── Status config ─────────────────────────────────────────────

const STATUS_MAP: Record<ProductStatus, { label: string; variant: BadgeVariant }> = {
  published: { label: 'Publicado', variant: 'success' },
  draft:     { label: 'Rascunho',  variant: 'warning' },
  archived:  { label: 'Arquivado', variant: 'muted'   },
}

// ── Row type (real + mock unified) ───────────────────────────

interface ProductRow {
  id:       string
  emoji:    string
  name:     string
  slug:     string
  tipo:     TipoKey
  preco:    string
  variantes: string[]
  status:   ProductStatus
  isReal:   boolean
}

// ── Mock fallback (exatos do wireframe) ───────────────────────

const MOCK_ROWS: ProductRow[] = [
  {
    id: 'mock-1',
    emoji: '📚',
    name: 'Reforço Escolar',
    slug: 'reforco-escolar',
    tipo: 'Curso',
    preco: '¥ 12.000',
    variantes: ['Mensal', 'Trim.', 'Anual'],
    status: 'published',
    isReal: false,
  },
  {
    id: 'mock-2',
    emoji: '🎯',
    name: 'Simulado Koukousei 2025',
    slug: 'simulado-koukousei-2025',
    tipo: 'Simulado',
    preco: '¥ 5.800',
    variantes: ['Único'],
    status: 'published',
    isReal: false,
  },
  {
    id: 'mock-3',
    emoji: '🧑‍🏫',
    name: 'Mentoria 1:1',
    slug: 'mentoria-1-1',
    tipo: 'Mentoria',
    preco: '¥ 38.000',
    variantes: ['4 sessões', '8 sessões'],
    status: 'draft',
    isReal: false,
  },
]

function toRow(p: Product): ProductRow {
  return {
    id:       p.id,
    emoji:    '📦',
    name:     p.name,
    slug:     p.slug,
    tipo:     'Produto',
    preco:    p.price_id_stripe ? 'Configurado' : '—',
    variantes: ['Único'],
    status:   p.status,
    isReal:   true,
  }
}

// ── Ghost button ──────────────────────────────────────────────

function GhostBtn({
  onClick, children,
}: {
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium
                 text-white/50 hover:text-white/90 transition-colors"
      style={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.07)' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = '#1A1C23'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = '#0F1117'
      }}
    >
      {children}
    </button>
  )
}

// ── Table row ─────────────────────────────────────────────────

function ProductTableRow({
  row,
  onEdit,
  onDelete,
}: {
  row: ProductRow
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  const status = STATUS_MAP[row.status]

  return (
    <tr
      className="group border-b transition-colors duration-100"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLTableRowElement).style.background = '#22242F'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
      }}
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
            <p className="text-[11px] text-white/30 mt-0.5">/{row.slug}</p>
          </div>
        </div>
      </td>

      {/* Tipo */}
      <td className="px-5 py-3.5">
        <Badge label={row.tipo} variant={TIPO_VARIANT[row.tipo]} />
      </td>

      {/* Preço */}
      <td className="px-5 py-3.5">
        <span className="text-[13px] font-semibold text-[#EDEDED] tabular-nums">{row.preco}</span>
      </td>

      {/* Variantes */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {row.variantes.map(v => (
            <span
              key={v}
              className="text-[11px] px-2 py-0.5 rounded-md text-white/40"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
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
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GhostBtn onClick={() => onEdit(row.id)}>
            <Edit3 className="w-3 h-3" />
            Editar
          </GhostBtn>
          <GhostBtn>
            <Globe className="w-3 h-3" />
            Sales Page
          </GhostBtn>
          {row.isReal && (
            <button
              onClick={() => onDelete(row.id)}
              className="p-1.5 rounded-md text-white/20 hover:text-red-400 transition-colors"
              style={{ background: 'transparent' }}
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

  async function load() {
    const { data } = await supabase
      .from('products')
      .select('id,name,slug,status,thumbnail_url,price_id_stripe,created_at')
      .order('created_at', { ascending: false })
    setProducts((data ?? []) as Product[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createProduct() {
    const { data, error } = await supabase
      .from('products')
      .insert({ name: 'Novo Produto', slug: `produto-${Date.now()}`, status: 'draft' })
      .select('id')
      .single()
    if (!error && data) navigate(`/admin/products/${data.id}/edit`)
  }

  async function deleteProduct(id: string) {
    if (!confirm('Excluir este produto permanentemente?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(ps => ps.filter(p => p.id !== id))
  }

  // Merge real rows + mock fallback
  const rows: ProductRow[] = useMemo(() => {
    const real = products.map(toRow)
    return real.length > 0 ? real : MOCK_ROWS
  }, [products])

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
    <div className="flex flex-col h-full" style={{ background: BG_PAGE }}>
      <div className="max-w-6xl w-full mx-auto px-8 py-8 flex flex-col gap-6">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#EDEDED] tracking-tight">Produtos</h1>
            <p className="text-[13px] text-white/30 mt-0.5">
              Catálogo de produtos e serviços Bridge
            </p>
          </div>
          <button
            onClick={createProduct}
            className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold text-white
                       rounded-full transition-all duration-150"
            style={{
              background: '#E8521A',
              boxShadow: '0 8px 32px rgba(232,82,26,0.25)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#C43E10'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#E8521A'
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Produto
          </button>
        </div>

        {/* ── Table card ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Card header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-3">
              <p className="text-[14px] font-semibold text-[#EDEDED]">Todos os produtos</p>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md text-emerald-400"
                style={{ background: 'rgba(52,211,153,0.1)' }}
              >
                {publishedCount} publicado{publishedCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Search */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-md"
              style={{ background: BG_INPUT, border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Search className="w-3.5 h-3.5 text-white/25 shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar produtos..."
                className="bg-transparent border-0 outline-none text-[12px] text-white/70
                           placeholder:text-white/25 w-44"
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
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
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
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.04)' }}
                          >
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
                        onEdit={id => {
                          if (row.isReal) navigate(`/admin/products/${id}/edit`)
                        }}
                        onDelete={id => {
                          if (row.isReal) deleteProduct(id)
                        }}
                      />
                    ))
                  )}
                </tbody>
              </table>

              {/* Footer */}
              {!products.length && (
                <div
                  className="px-5 py-3 flex items-center gap-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <span
                    className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-widest"
                    style={{ background: 'rgba(232,82,26,0.12)', color: '#F0643A' }}
                  >
                    Demo
                  </span>
                  <p className="text-[11px] text-white/20">
                    Estes são dados de exemplo. Crie seu primeiro produto para ver dados reais.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

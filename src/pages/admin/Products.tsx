import { useEffect, useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Edit3, Trash2, Package, X, ChevronRight,
  MoreHorizontal, Copy, Globe, ShoppingCart, Users,
  LayoutList, LayoutGrid,
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

type ViewMode    = 'list' | 'grid'
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

// ── Avatar ─────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  ['#E8521A', '#FF8C42'],
  ['#6366F1', '#8B5CF6'],
  ['#10B981', '#34D399'],
  ['#F59E0B', '#FBBF24'],
  ['#3B82F6', '#60A5FA'],
  ['#EC4899', '#F472B6'],
]

function ProductAvatar({
  name, thumbnailUrl, size = 'md',
}: {
  name:         string
  thumbnailUrl: string | null
  size?:        'sm' | 'md' | 'lg'
}) {
  const dim   = { sm: 36, md: 40, lg: 56 }[size]
  const fs    = { sm: 11, md: 12, lg: 18 }[size]
  const rad   = { sm: 10, md: 12, lg: 14 }[size]
  const initials = name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?'
  const [from, to] = AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length]

  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={name}
        style={{ width: dim, height: dim, borderRadius: rad, objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }

  return (
    <div style={{
      width: dim, height: dim, borderRadius: rad, flexShrink: 0,
      background:  `linear-gradient(135deg, ${from}, ${to})`,
      display:     'flex', alignItems: 'center', justifyContent: 'center',
      color:       'rgba(255,255,255,0.9)',
      fontWeight:  700, fontSize: fs,
      letterSpacing: '0.02em',
    }}>
      {initials}
    </div>
  )
}

// ── ProductRow ─────────────────────────────────────────────────

interface ProductRow {
  id:           string
  thumbnailUrl: string | null
  name:         string
  slug:         string
  tipo:         TipoKey
  preco:        string
  variantes:    string[]
  status:       ProductStatus
  model:        ProductModel
  hasPrice:     boolean
  isReal:       boolean
}

const MOCK_ROWS: ProductRow[] = [
  { id: 'mock-1', thumbnailUrl: null, name: 'Reforço Escolar',         slug: 'reforco-escolar',         tipo: 'Curso',    preco: '¥ 12.000', variantes: ['Mensal', 'Trim.', 'Anual'], status: 'published', model: 'paid', hasPrice: true,  isReal: false },
  { id: 'mock-2', thumbnailUrl: null, name: 'Simulado Koukousei 2025', slug: 'simulado-koukousei-2025', tipo: 'Simulado', preco: '¥ 5.800',  variantes: ['Único'],                   status: 'published', model: 'paid', hasPrice: true,  isReal: false },
  { id: 'mock-3', thumbnailUrl: null, name: 'E-book Gratuito',         slug: 'ebook-gratuito',          tipo: 'Produto',  preco: '—',        variantes: ['Único'],                   status: 'draft',     model: 'lead', hasPrice: false, isReal: false },
]

function toRow(p: Product): ProductRow {
  const hasPrice = !!p.price_id_stripe
  return {
    id:           p.id,
    thumbnailUrl: p.thumbnail_url ?? null,
    name:         p.name,
    slug:         p.slug,
    tipo:         'Produto',
    preco:        hasPrice ? 'Configurado' : '—',
    variantes:    ['Único'],
    status:       p.status,
    model:        hasPrice ? 'paid' : 'lead',
    hasPrice,
    isReal:       true,
  }
}

// ── Actions Dropdown (fixed-position, escapes overflow) ────────

function ActionsDropdown({
  row, onEdit, onDelete, onDuplicate,
}: {
  row:         ProductRow
  onEdit:      (id: string) => void
  onDelete:    (id: string) => void
  onDuplicate: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState<{ top: number; right: number } | null>(null)
  const btnRef  = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const origin  = window.location.origin

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
    }
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    function outside(e: MouseEvent) {
      if (
        dropRef.current  && !dropRef.current.contains(e.target as Node) &&
        btnRef.current   && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
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
    { icon: Globe,        label: 'Funil Completo',       desc: 'Sales Page + Quizz',  url: `${origin}/${row.slug}` },
    { icon: Users,        label: 'Somente Quizz',         desc: 'Formulário direto',   url: `${origin}/apply?product=${row.slug}` },
    ...(row.hasPrice
      ? [{ icon: ShoppingCart, label: 'Direto pro Checkout', desc: 'Requer preço ativo', url: `${origin}/checkout/${row.slug}` }]
      : []
    ),
  ]

  const dropdown = open && pos ? (
    <div
      ref={dropRef}
      style={{
        position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999,
        width: 224, borderRadius: 14,
        background:  BG_DROP,
        border:      '1px solid rgba(255,255,255,0.09)',
        boxShadow:   '0 20px 56px rgba(0,0,0,0.65)',
        overflow:    'hidden',
        paddingTop:  6, paddingBottom: 6,
      }}
    >
      <DropMenuItem icon={Edit3} label="Editar Produto" onClick={() => { onEdit(row.id); setOpen(false) }} />
      <DropMenuItem icon={Copy} label="Duplicar Formulário" onClick={() => { onDuplicate(row.id); setOpen(false) }} />
      <DropSep />
      <p style={{ padding: '4px 16px 2px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)' }}>
        Copiar Link
      </p>
      {copyLinks.map(({ icon: Icon, label, desc, url }) => (
        <button
          key={label}
          onClick={() => copy(url, label)}
          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/4 transition-colors group"
        >
          <Icon className="w-3.5 h-3.5 text-white/25 shrink-0 group-hover:text-white/50" />
          <div className="text-left min-w-0 flex-1">
            <p className="text-[12px] text-white/65 group-hover:text-white/90 leading-tight">{label}</p>
            <p className="text-[10px] text-white/25 truncate">{desc}</p>
          </div>
          <Copy className="w-3 h-3 text-white/15 shrink-0 group-hover:text-white/40" />
        </button>
      ))}
      {row.isReal && (
        <>
          <DropSep />
          <DropMenuItem icon={Trash2} label="Excluir Produto" danger onClick={() => { setOpen(false); onDelete(row.id) }} />
        </>
      )}
    </div>
  ) : null

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
          open
            ? 'text-white/80 bg-white/8'
            : 'text-white/25 hover:text-white/60 hover:bg-white/5',
        )}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </>
  )
}

function DropMenuItem({ icon: Icon, label, onClick, danger = false }: {
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
        danger ? 'text-red-400/70 hover:text-red-400 hover:bg-red-500/6'
               : 'text-white/60 hover:text-white/90 hover:bg-white/4',
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
    </button>
  )
}

function DropSep() {
  return <div style={{ margin: '6px 12px', height: 1, background: 'rgba(255,255,255,0.06)' }} />
}

// ── List row ──────────────────────────────────────────────────

function ProductListRow({ row, onEdit, onDelete, onDuplicate }: {
  row:         ProductRow
  onEdit:      (id: string) => void
  onDelete:    (id: string) => void
  onDuplicate: (id: string) => void
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
          <ProductAvatar name={row.name} thumbnailUrl={row.thumbnailUrl} size="sm" />
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
      <td className="px-4 py-3.5" style={{ width: 52 }}>
        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionsDropdown row={row} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />
        </div>
      </td>
    </tr>
  )
}

// ── Grid card ─────────────────────────────────────────────────

function ProductGridCard({ row, onEdit, onDelete, onDuplicate }: {
  row:         ProductRow
  onEdit:      (id: string) => void
  onDelete:    (id: string) => void
  onDuplicate: (id: string) => void
}) {
  const status = STATUS_MAP[row.status]
  const [from, to] = AVATAR_GRADIENTS[row.name.charCodeAt(0) % AVATAR_GRADIENTS.length]

  return (
    <div
      className="group rounded-2xl flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: BG_CARD,
        border:     '1px solid rgba(255,255,255,0.07)',
        boxShadow:  '0 2px 12px rgba(0,0,0,0.25)',
      }}
    >
      {/* Thumbnail */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: '16/9' }}
      >
        {row.thumbnailUrl ? (
          <img src={row.thumbnailUrl} alt={row.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${from}22, ${to}33)` }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 56, height: 56, borderRadius: 16,
                background: `linear-gradient(135deg, ${from}, ${to})`,
                fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
              }}
            >
              {row.name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?'}
            </div>
          </div>
        )}
        {/* Status badge overlay */}
        <div className="absolute top-3 left-3">
          <Badge label={status.label} variant={status.variant} />
        </div>
        {/* Actions — visible on hover */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div style={{ background: 'rgba(15,17,23,0.85)', borderRadius: 10, backdropFilter: 'blur(6px)' }}>
            <ActionsDropdown row={row} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-[13px] font-semibold text-[#EDEDED] leading-snug line-clamp-1">{row.name}</p>
          <p className="text-[11px] text-white/25 mt-0.5">/{row.slug}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge label={row.tipo} variant={TIPO_VARIANT[row.tipo]} />
          {row.model === 'lead' ? (
            <Badge label="Captação" variant="violet" />
          ) : (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums"
              style={{ background: 'rgba(16,185,129,0.08)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              {row.preco}
            </span>
          )}
        </div>

        {/* Footer CTA */}
        <button
          onClick={() => onEdit(row.id)}
          className="w-full mt-auto py-2 rounded-lg text-[12px] font-medium transition-all opacity-0 group-hover:opacity-100"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.07)' }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,82,26,0.1)'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#F0643A'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,82,26,0.3)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)'
          }}
        >
          Editar produto
        </button>
      </div>
    </div>
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

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">
              Modelo de Negócio
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'paid' as const, icon: '💳', label: 'Produto Pago',     desc: 'Checkout via Stripe' },
                { key: 'lead' as const, icon: '🎁', label: 'Captação de Lead', desc: 'Gratuito / Funil de leads' },
              ]).map(({ key, icon, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setModel(key)}
                  className="flex flex-col items-start gap-1 px-3.5 py-3 rounded-lg text-left transition-all"
                  style={{
                    background: model === key ? 'rgba(232,82,26,0.08)' : '#0D0E12',
                    border:     model === key ? '1px solid rgba(232,82,26,0.40)' : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <span className="text-base">{icon}</span>
                  <span className="text-[12px] font-semibold text-white/80">{label}</span>
                  <span className="text-[10px] text-white/30 leading-snug">{desc}</span>
                </button>
              ))}
            </div>
          </div>

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

// ── View Toggle ───────────────────────────────────────────────

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-lg"
      style={{ background: BG_INPUT, border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {([
        { key: 'list' as const, icon: LayoutList,  label: 'Lista' },
        { key: 'grid' as const, icon: LayoutGrid,  label: 'Blocos' },
      ] as const).map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          title={label}
          onClick={() => onChange(key)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all"
          style={{
            background: view === key ? 'rgba(255,255,255,0.08)' : 'transparent',
            color:      view === key ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.30)',
          }}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
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
  const [view,     setView]     = useState<ViewMode>('list')

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

  async function handleDuplicate(id: string) {
    // Fetch full product (list query omits config fields)
    const { data: src, error: fetchErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchErr || !src) { toast.error('Erro ao buscar produto.'); return }

    const slug = `${src.slug}-copia-${Date.now()}`
    const { data, error } = await supabase
      .from('products')
      .insert({
        name:                `${src.name} (Cópia)`,
        slug,
        description:         src.description,
        status:              'draft',
        thumbnail_url:       src.thumbnail_url,
        landing_page_config: src.landing_page_config,
        form_logic_config:   src.form_logic_config,
        checkout_config:     src.checkout_config,
        price_id_stripe:     src.price_id_stripe,
      })
      .select('id')
      .single()
    if (error) { toast.error(`Erro ao duplicar: ${error.message}`); return }
    toast.success('Formulário duplicado!')
    if (data) navigate(`/admin/products/${data.id}`)
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

  const publishedCount = rows.filter(r => r.status === 'published' && r.isReal).length

  return (
    <>
      <div className="flex flex-col min-h-full" style={{ background: BG_PAGE }}>
        <div className="max-w-6xl w-full mx-auto px-8 py-8 flex flex-col gap-6">

          {/* ── Page header ── */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#EDEDED] tracking-tight">Produtos</h1>
              <p className="text-[13px] text-white/30 mt-0.5">Catálogo de produtos e serviços Bridge</p>
            </div>
            <button
              onClick={() => setDrawer(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white rounded-full transition-all shrink-0"
              style={{ background: '#E8521A', boxShadow: '0 8px 32px rgba(232,82,26,0.25)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#C43E10' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E8521A' }}
            >
              <Plus className="w-3.5 h-3.5" /> Novo Produto
            </button>
          </div>

          {/* ── Toolbar ── */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl flex-1"
              style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Search className="w-4 h-4 text-white/25 shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por nome ou tipo..."
                className="flex-1 bg-transparent border-0 outline-none text-[13px] text-white/70 placeholder:text-white/25"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-white/25 hover:text-white/60 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Stats chip */}
            {products.length > 0 && (
              <span
                className="shrink-0 text-[11px] font-semibold px-3 py-2 rounded-xl whitespace-nowrap text-emerald-400"
                style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}
              >
                {publishedCount} publicado{publishedCount !== 1 ? 's' : ''}
              </span>
            )}

            {/* View toggle */}
            <ViewToggle view={view} onChange={setView} />
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-5 h-5 rounded-full border-2 border-[#E8521A] border-t-transparent animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Package className="w-5 h-5 text-white/20" />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-medium text-white/40">
                  {query ? 'Nenhum produto encontrado' : 'Nenhum produto ainda'}
                </p>
                {query && (
                  <p className="text-[12px] text-white/20 mt-1">
                    Tente outro termo ou{' '}
                    <button className="text-[#E8521A] hover:underline" onClick={() => setQuery('')}>limpe a busca</button>
                  </p>
                )}
              </div>
            </div>
          ) : view === 'list' ? (

            /* ── List view ── */
            <div className="rounded-2xl overflow-hidden" style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['Produto', 'Tipo', 'Preço', 'Variantes', 'Status', ''].map((h, i) => (
                        <th key={i} className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: 'rgba(255,255,255,0.28)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(row => (
                      <ProductListRow
                        key={row.id}
                        row={row}
                        onEdit={id => navigate(`/admin/products/${id}`)}
                        onDelete={deleteProduct}
                        onDuplicate={handleDuplicate}
                      />
                    ))}
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
            </div>

          ) : (

            /* ── Grid view ── */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(row => (
                  <ProductGridCard
                    key={row.id}
                    row={row}
                    onEdit={id => navigate(`/admin/products/${id}`)}
                    onDelete={deleteProduct}
                    onDuplicate={handleDuplicate}
                  />
                ))}
              </div>
              {!products.length && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-widest"
                    style={{ background: 'rgba(232,82,26,0.12)', color: '#F0643A' }}>Demo</span>
                  <p className="text-[11px] text-white/20">
                    Dados de exemplo. Crie seu primeiro produto para ver dados reais.
                  </p>
                </div>
              )}
            </>
          )}
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

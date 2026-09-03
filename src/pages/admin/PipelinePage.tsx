import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Search, X, RefreshCw, CheckCircle2, XCircle,
  GraduationCap, CreditCard, Clock, Package, ChevronDown,
  Edit2, Trash2, AlertTriangle, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLeads, useProductsForFilter, useDeleteLead } from '@/hooks/useLeads'
import { useContactStagesBatch } from '@/hooks/useContactStage'
import { STAGES } from '@/lib/stageConfig'
import type { Lead } from '@/lib/types'
import type { FormNode } from '@/components/form-builder/FormBuilder'

// ── Tokens ────────────────────────────────────────────────────

const BG_PAGE  = '#0D0E12'
const BG_CARD  = '#1A1C23'
const BG_INPUT = '#0D0E12'
const BG_DROP  = '#1E202A'
const BORDER   = 'rgba(255,255,255,0.07)'

// ── Helpers ───────────────────────────────────────────────────

function fmtDateShort(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)  return 'agora'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

function contactKey(lead: Lead) {
  return lead.email ? lead.email.toLowerCase() : (lead.phone ?? lead.id)
}

function displayName(lead: Lead) {
  if (lead.name) return lead.name
  const a = lead.answers ?? {}
  return a['name'] ?? a['nome'] ?? a['full_name'] ?? ''
}

function displayStudentName(lead: Lead): string {
  const nodes = (lead.product_form_nodes ?? []) as FormNode[]
  const answers = lead.answers ?? {}
  const node = nodes.find(n =>
    /aluno|estudante|student|filho|criança/i.test(n.title ?? '')
  )
  return node ? (answers[node.id] ?? '') : ''
}

const PRODUCT_COLORS = [
  { bg: 'rgba(232,82,26,0.1)',   text: '#F0643A', border: 'rgba(232,82,26,0.25)'  },
  { bg: 'rgba(96,165,250,0.1)',  text: '#93C5FD', border: 'rgba(96,165,250,0.25)' },
  { bg: 'rgba(167,139,250,0.1)', text: '#C4B5FD', border: 'rgba(167,139,250,0.25)'},
  { bg: 'rgba(52,211,153,0.1)',  text: '#6EE7B7', border: 'rgba(52,211,153,0.25)' },
  { bg: 'rgba(251,191,36,0.1)',  text: '#FCD34D', border: 'rgba(251,191,36,0.25)' },
  { bg: 'rgba(244,114,182,0.1)', text: '#F9A8D4', border: 'rgba(244,114,182,0.25)'},
]

function productColor(name: string | null | undefined) {
  if (!name) return PRODUCT_COLORS[0]
  return PRODUCT_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % PRODUCT_COLORS.length]
}

// ── Product select ────────────────────────────────────────────

function SelectFilter({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void
  placeholder: string; options: { value: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [open])

  const selected = options.find(o => o.value === value)
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] transition-all whitespace-nowrap"
        style={{ background: BG_CARD, border: `1px solid ${open ? 'rgba(232,82,26,0.4)' : BORDER}`, color: selected ? '#EDEDED' : 'rgba(255,255,255,0.35)' }}>
        <Package className="w-3.5 h-3.5 shrink-0 text-white/25" />
        <span className="truncate max-w-[160px]">{selected?.label ?? placeholder}</span>
        {value
          ? <button onClick={e => { e.stopPropagation(); onChange('') }} className="ml-auto shrink-0 text-white/25 hover:text-white/60 transition-colors"><X className="w-3 h-3" /></button>
          : <ChevronDown className="w-3.5 h-3.5 ml-auto shrink-0 text-white/25" />}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 rounded-xl z-50 py-1.5 min-w-[200px]"
          style={{ background: BG_DROP, border: `1px solid ${BORDER}`, boxShadow: '0 20px 48px rgba(0,0,0,0.55)' }}>
          {options.map(opt => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false) }}
              className={cn('w-full flex items-center px-4 py-2 text-[12px] text-left transition-colors',
                opt.value === value ? 'text-[#F0643A]' : 'text-white/60 hover:text-white/90 hover:bg-white/4')}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Payment badge ─────────────────────────────────────────────

function PaymentBadge({ status, paidAt }: {
  status?: 'none' | 'pending' | 'confirmed'
  paidAt?: string | null
}) {
  if (!status || status === 'none') return null
  if (status === 'confirmed') {
    return (
      <span
        title={paidAt ? `Pago em ${fmtDateShort(paidAt)}` : 'Pagamento confirmado'}
        className="inline-flex items-center gap-1 font-semibold rounded-md px-1.5 py-0.5 text-[10px]"
        style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)' }}>
        <CreditCard className="w-2.5 h-2.5" />Pago
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 font-semibold rounded-md px-1.5 py-0.5 text-[10px]"
      style={{ background: 'rgba(251,191,36,0.08)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.2)' }}>
      <Clock className="w-2.5 h-2.5" />Pend. pagamento
    </span>
  )
}

// ── Delete confirm ────────────────────────────────────────────

function DeleteConfirm({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const deleteMutation = useDeleteLead()

  async function confirm() {
    await deleteMutation.mutateAsync(lead.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: '#1A1C23', border: `1px solid ${BORDER}`, zIndex: 1 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#EDEDED]">Excluir lead?</p>
            <p className="text-[12px] text-white/35 mt-0.5">Esta ação não pode ser desfeita.</p>
          </div>
        </div>
        <p className="text-[13px] text-white/50">
          O lead <strong className="text-white/70">{displayName(lead) || lead.email || 'sem nome'}</strong> será permanentemente removido.
        </p>
        <div className="flex gap-3 mt-1">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white/40 transition-all"
            style={{ background: BG_INPUT, border: `1px solid ${BORDER}` }}>
            Cancelar
          </button>
          <button onClick={confirm} disabled={deleteMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{ background: '#DC2626' }}>
            {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pipeline card ─────────────────────────────────────────────

function PipelineCard({ lead, onView, onEdit, onDelete }: {
  lead: Lead; onView: () => void; onEdit: () => void; onDelete: () => void
}) {
  const name        = displayName(lead)
  const studentName = displayStudentName(lead)
  const color       = productColor(lead.product_name)

  return (
    <div
      className="rounded-xl p-3.5 flex flex-col gap-2.5 cursor-pointer group transition-all"
      style={{ background: '#13151A', border: `1px solid ${BORDER}` }}
      onClick={onView}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER }}
    >
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
          style={{ background: 'rgba(232,82,26,0.1)', color: '#E8521A' }}>
          {(name || lead.email || '?')[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[#EDEDED] truncate leading-tight">
            {name || <span className="text-white/30 font-normal">Sem nome</span>}
          </p>
          {studentName && (
            <p className="flex items-center gap-1 text-[10px] text-white/35 truncate mt-0.5">
              <GraduationCap className="w-2.5 h-2.5 shrink-0" />
              {studentName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit() }}
            className="p-1 rounded text-white/25 hover:text-[#93C5FD] hover:bg-blue-500/10 transition-colors">
            <Edit2 className="w-3 h-3" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete() }}
            className="p-1 rounded text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {lead.product_name && (
        <span className="inline-flex items-center self-start px-2 py-0.5 rounded text-[10px] font-semibold"
          style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
          {lead.product_name}
        </span>
      )}

      <div className="flex items-center justify-between mt-0.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-medium"
          style={lead.qualified ? { color: '#34D399' } : { color: '#F87171' }}>
          {lead.qualified
            ? <><CheckCircle2 className="w-2.5 h-2.5" />Qualificado</>
            : <><XCircle      className="w-2.5 h-2.5" />Desqualificado</>}
        </span>
        <span className="text-[10px] text-white/20">{timeAgo(lead.created_at)}</span>
      </div>
      <PaymentBadge status={lead.payment_status} paidAt={lead.paid_at} />

      {lead.email && (
        <p className="text-[10px] text-white/25 truncate">{lead.email}</p>
      )}
    </div>
  )
}

// ── Pipeline view ─────────────────────────────────────────────

function PipelineView({ leads, stagesMap, onView, onEdit, onDelete }: {
  leads:     Lead[]
  stagesMap: Record<string, { stage: string } | undefined>
  onView:    (lead: Lead) => void
  onEdit:    (lead: Lead) => void
  onDelete:  (lead: Lead) => void
}) {
  const columns = useMemo(() => {
    return STAGES.map(s => ({
      stage: s,
      leads: leads.filter(l => (stagesMap[contactKey(l)]?.stage ?? 'novo') === s.value),
    }))
  }, [leads, stagesMap])

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {columns.map(({ stage, leads: colLeads }) => (
        <div key={stage.value} className="flex flex-col gap-3 shrink-0" style={{ width: 280 }}>
          <div className="flex items-center gap-2 px-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: stage.color }} />
            <span className="text-[12px] font-semibold" style={{ color: stage.color }}>{stage.label}</span>
            <span className="ml-auto text-[11px] text-white/25 tabular-nums">{colLeads.length}</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {colLeads.length === 0 ? (
              <div className="rounded-xl py-8 flex items-center justify-center"
                style={{ border: `1px dashed rgba(255,255,255,0.06)` }}>
                <p className="text-[11px] text-white/20">Nenhum lead</p>
              </div>
            ) : (
              colLeads.map(lead => (
                <PipelineCard
                  key={lead.id}
                  lead={lead}
                  onView={() => onView(lead)}
                  onEdit={() => onEdit(lead)}
                  onDelete={() => onDelete(lead)}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

type QualFilter    = 'all' | 'qualified' | 'unqualified'
type PaymentFilter = 'all' | 'confirmed' | 'pending' | 'none'

export default function PipelinePage() {
  const navigate = useNavigate()
  const [productId,     setProductId]     = useState('')
  const [search,        setSearch]        = useState('')
  const [stageFilter,   setStageFilter]   = useState<string>('all')
  const [qualFilter,    setQualFilter]    = useState<QualFilter>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [deleteLead,    setDeleteLead]    = useState<Lead | null>(null)
  const qc = useQueryClient()

  const { data: leads = [], isLoading, isFetching } = useLeads(productId || null)
  const { data: products = [] } = useProductsForFilter()

  const allKeys = useMemo(() => leads.map(l => contactKey(l)), [leads])
  const { data: stagesMap = {} } = useContactStagesBatch(allKeys)

  const filtered = useMemo(() => {
    let list = leads

    if (stageFilter !== 'all') {
      list = list.filter(l => (stagesMap[contactKey(l)]?.stage ?? 'novo') === stageFilter)
    }
    if (qualFilter === 'qualified')   list = list.filter(l => l.qualified)
    if (qualFilter === 'unqualified') list = list.filter(l => !l.qualified)
    if (paymentFilter !== 'all') {
      list = list.filter(l => (l.payment_status ?? 'none') === paymentFilter)
    }
    const q = search.toLowerCase().trim()
    if (q) {
      list = list.filter(l =>
        displayName(l).toLowerCase().includes(q) ||
        displayStudentName(l).toLowerCase().includes(q) ||
        (l.email ?? '').toLowerCase().includes(q) ||
        (l.phone ?? '').includes(q),
      )
    }
    return list
  }, [leads, search, stageFilter, qualFilter, paymentFilter, stagesMap])

  const productOptions = products.map(p => ({ value: p.id, label: p.name }))

  function refresh() {
    qc.refetchQueries({ queryKey: ['leads'] })
  }

  return (
    <>
      <div className="flex flex-col min-h-full" style={{ background: BG_PAGE }}>
        <div className="w-full px-4 py-6 flex flex-col gap-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#EDEDED] tracking-tight">Pipeline</h1>
              <p className="text-[13px] text-white/30 mt-0.5">Leads por estágio de relacionamento</p>
            </div>
            <button onClick={refresh}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.45)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.18)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER }}>
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
              Atualizar
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl flex-1 min-w-[200px]"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <Search className="w-4 h-4 text-white/25 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, e-mail…"
                className="flex-1 bg-transparent border-0 outline-none text-[13px] text-white/70 placeholder:text-white/25" />
              {search && (
                <button onClick={() => setSearch('')} className="text-white/25 hover:text-white/60 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <SelectFilter value={productId} onChange={setProductId}
              placeholder="Todos os produtos" options={productOptions} />

            {/* Qualified filter */}
            <div className="flex items-center rounded-xl overflow-hidden shrink-0"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              {([
                { value: 'all',         label: 'Todos'           },
                { value: 'qualified',   label: 'Qualificados'    },
                { value: 'unqualified', label: 'Desqualificados' },
              ] as { value: QualFilter; label: string }[]).map(opt => (
                <button key={opt.value}
                  onClick={() => setQualFilter(opt.value)}
                  className="px-3 py-2 text-[12px] font-medium transition-all"
                  style={qualFilter === opt.value
                    ? { background: 'rgba(232,82,26,0.15)', color: '#F0643A' }
                    : { color: 'rgba(255,255,255,0.35)' }}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Payment filter */}
            <div className="flex items-center rounded-xl overflow-hidden shrink-0"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              {([
                { value: 'all',       label: 'Pagamento'  },
                { value: 'confirmed', label: 'Pago'       },
                { value: 'pending',   label: 'Pendente'   },
                { value: 'none',      label: 'Sem pagam.' },
              ] as { value: PaymentFilter; label: string }[]).map(opt => (
                <button key={opt.value}
                  onClick={() => setPaymentFilter(opt.value)}
                  className="px-3 py-2 text-[12px] font-medium transition-all"
                  style={paymentFilter === opt.value
                    ? { background: opt.value === 'confirmed' ? 'rgba(52,211,153,0.15)' : opt.value === 'pending' ? 'rgba(251,191,36,0.12)' : 'rgba(232,82,26,0.15)', color: opt.value === 'confirmed' ? '#34D399' : opt.value === 'pending' ? '#FBBF24' : '#F0643A' }
                    : { color: 'rgba(255,255,255,0.35)' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stage filter tabs */}
          <div className="flex items-center gap-1 flex-wrap -mt-2">
            <button
              onClick={() => setStageFilter('all')}
              className={cn('px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                stageFilter === 'all' ? 'text-[#EDEDED]' : 'text-white/35 hover:text-white/60')}
              style={{
                background: stageFilter === 'all' ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: `1px solid ${stageFilter === 'all' ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
              }}>
              Todos os estágios
            </button>
            {STAGES.map(s => {
              const active = stageFilter === s.value
              return (
                <button key={s.value}
                  onClick={() => setStageFilter(active ? 'all' : s.value)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    background: active ? s.bg    : 'transparent',
                    color:      active ? s.color : 'rgba(255,255,255,0.35)',
                    border:     `1px solid ${active ? s.border : 'transparent'}`,
                  }}>
                  {s.label}
                </button>
              )
            })}
            {(stageFilter !== 'all' || qualFilter !== 'all' || paymentFilter !== 'all' || search || productId) && (
              <button
                onClick={() => { setStageFilter('all'); setQualFilter('all'); setPaymentFilter('all'); setSearch(''); setProductId('') }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all text-white/25 hover:text-white/60 flex items-center gap-1"
                style={{ border: '1px solid transparent' }}>
                <X className="w-3 h-3" /> Limpar filtros
              </button>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="rounded-2xl flex items-center justify-center py-20"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <div className="w-5 h-5 rounded-full border-2 border-[#E8521A] border-t-transparent animate-spin" />
            </div>
          ) : (
            <PipelineView
              leads={filtered}
              stagesMap={stagesMap}
              onView={lead => navigate(`/admin/leads/${lead.id}`)}
              onEdit={lead => navigate(`/admin/leads/${lead.id}`)}
              onDelete={lead => setDeleteLead(lead)}
            />
          )}
        </div>
      </div>

      {deleteLead && <DeleteConfirm lead={deleteLead} onClose={() => setDeleteLead(null)} />}
    </>
  )
}

import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Search, X, RefreshCw, ChevronDown, Eye,
  Mail, Phone, MapPin, User, CheckCircle2,
  XCircle, Calendar, Package, FileText,
  Download, Edit2, Trash2, Loader2, AlertTriangle,
  Save, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLeads, useProductsForFilter, useUpdateLead, useDeleteLead } from '@/hooks/useLeads'
import type { LeadPatch } from '@/hooks/useLeads'
import type { Lead } from '@/lib/types'
import type { FormNode } from '@/components/form-builder/FormBuilder'

// ── Tokens ────────────────────────────────────────────────────

const BG_PAGE  = '#0D0E12'
const BG_CARD  = '#1A1C23'
const BG_INPUT = '#0D0E12'
const BG_DROP  = '#1E202A'
const BORDER   = 'rgba(255,255,255,0.07)'

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

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

function resolveTitle(nodeId: string, nodes: FormNode[]) {
  return nodes.find(n => n.id === nodeId)?.title || `Campo ${nodeId.slice(0, 6)}`
}

function displayName(lead: Lead) {
  if (lead.name) return lead.name
  const a = lead.answers ?? {}
  return a['name'] ?? a['nome'] ?? a['full_name'] ?? ''
}

const PRODUCT_COLORS = [
  { bg: 'rgba(232,82,26,0.1)',  text: '#F0643A', border: 'rgba(232,82,26,0.25)'  },
  { bg: 'rgba(96,165,250,0.1)', text: '#93C5FD', border: 'rgba(96,165,250,0.25)' },
  { bg: 'rgba(167,139,250,0.1)',text: '#C4B5FD', border: 'rgba(167,139,250,0.25)'},
  { bg: 'rgba(52,211,153,0.1)', text: '#6EE7B7', border: 'rgba(52,211,153,0.25)' },
  { bg: 'rgba(251,191,36,0.1)', text: '#FCD34D', border: 'rgba(251,191,36,0.25)' },
  { bg: 'rgba(244,114,182,0.1)',text: '#F9A8D4', border: 'rgba(244,114,182,0.25)'},
]

function productColor(name: string | null | undefined) {
  if (!name) return PRODUCT_COLORS[0]
  return PRODUCT_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % PRODUCT_COLORS.length]
}

// ── Select filter ─────────────────────────────────────────────

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

// ── Edit Lead Drawer ──────────────────────────────────────────

function EditLeadDrawer({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const updateMutation = useUpdateLead()
  const [form, setForm] = useState<LeadPatch>({
    name:      lead.name      ?? '',
    email:     lead.email     ?? '',
    phone:     lead.phone     ?? '',
    cpf:       lead.cpf       ?? '',
    city:      lead.city      ?? '',
    state:     lead.state     ?? '',
    qualified: lead.qualified,
  })

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none transition-all'
  const inputStyle = { background: BG_INPUT, border: `1px solid ${BORDER}` }

  function onFocus(e: React.FocusEvent<HTMLInputElement>) {
    (e.target as HTMLInputElement).style.borderColor = 'rgba(232,82,26,0.4)'
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    (e.target as HTMLInputElement).style.borderColor = BORDER
  }

  async function save() {
    await updateMutation.mutateAsync({ id: lead.id, patch: form })
    onClose()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const fields: { key: keyof LeadPatch; label: string; placeholder: string; icon: React.ElementType }[] = [
    { key: 'name',  label: 'Nome',     placeholder: 'Nome completo',     icon: User    },
    { key: 'email', label: 'E-mail',   placeholder: 'email@exemplo.com', icon: Mail    },
    { key: 'phone', label: 'Telefone', placeholder: '(11) 99999-9999',   icon: Phone   },
    { key: 'cpf',   label: 'CPF',      placeholder: '000.000.000-00',    icon: FileText},
    { key: 'city',  label: 'Cidade',   placeholder: 'São Paulo',         icon: MapPin  },
    { key: 'state', label: 'Estado',   placeholder: 'SP',                icon: MapPin  },
  ]

  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose} />
      <div className="absolute top-0 right-0 h-full w-full max-w-[480px] flex flex-col"
        style={{ background: '#16181F', borderLeft: `1px solid ${BORDER}` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <p className="text-[15px] font-bold text-[#EDEDED]">Editar Lead</p>
            <p className="text-[12px] text-white/30 mt-0.5">{displayName(lead) || lead.email || lead.id.slice(0, 8)}</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/6 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {/* Status toggle */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: '#13151A', border: `1px solid ${BORDER}` }}>
            <div>
              <p className="text-[13px] font-medium text-[#EDEDED]">Status de Qualificação</p>
              <p className="text-[11px] text-white/30 mt-0.5">Afeta relatórios e automações</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, qualified: !f.qualified }))}
              className="relative rounded-full transition-all duration-200 shrink-0"
              style={{ width: 40, height: 22, background: form.qualified ? '#34D399' : 'rgba(255,255,255,0.1)' }}>
              <span className="absolute top-0.5 left-0.5 rounded-full bg-white transition-transform duration-200"
                style={{ width: 18, height: 18, transform: form.qualified ? 'translateX(18px)' : 'none' }} />
            </button>
          </div>

          {/* Personal fields */}
          {fields.map(({ key, label, placeholder, icon: Icon }) => (
            <div key={key}>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-1.5">{label}</label>
              <div className="relative">
                <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                <input
                  className={inputCls} style={{ ...inputStyle, paddingLeft: '2.25rem' }}
                  value={(form[key] ?? '') as string}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  onFocus={onFocus} onBlur={onBlur}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3 shrink-0" style={{ borderTop: `1px solid ${BORDER}` }}>
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white/40 transition-all"
            style={{ background: BG_INPUT, border: `1px solid ${BORDER}` }}>
            Cancelar
          </button>
          <button onClick={save} disabled={updateMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{ background: '#E8521A' }}>
            {updateMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Save className="w-4 h-4" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm ────────────────────────────────────────────

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

// ── Detail Drawer ─────────────────────────────────────────────

function LeadDrawer({ lead, onClose, onEdit }: { lead: Lead; onClose: () => void; onEdit: () => void }) {
  const name  = displayName(lead)
  const nodes = (lead.product_form_nodes ?? []) as FormNode[]
  const color = productColor(lead.product_name)
  const answersEntries = Object.entries(lead.answers ?? {}).filter(([, v]) => !!v)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose} />
      <div className="absolute top-0 right-0 h-full w-full max-w-[520px] flex flex-col"
        style={{ background: '#16181F', borderLeft: `1px solid ${BORDER}` }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: 'rgba(232,82,26,0.1)', color: '#E8521A' }}>
              {(name || lead.email || '?')[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-[#EDEDED] tracking-tight truncate">
                {name || lead.email || 'Lead sem nome'}
              </p>
              {name && lead.email && <p className="text-[12px] text-white/35 mt-0.5 truncate">{lead.email}</p>}
              <p className="text-[11px] text-white/25 mt-1">{fmtDate(lead.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
              style={{ background: 'rgba(96,165,250,0.1)', color: '#93C5FD', border: '1px solid rgba(96,165,250,0.2)' }}>
              <Edit2 className="w-3 h-3" /> Editar
            </button>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/6 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={lead.qualified
                ? { background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)' }
                : { background: 'rgba(239,68,68,0.08)', color: '#F87171', border: '1px solid rgba(239,68,68,0.15)' }}>
              {lead.qualified ? <><CheckCircle2 className="w-3 h-3" /> Qualificado</> : <><XCircle className="w-3 h-3" /> Desqualificado</>}
            </span>
            {lead.product_name && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
                {lead.product_name}
              </span>
            )}
          </div>

          {/* Contact info */}
          <div className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: '#13151A', border: `1px solid ${BORDER}` }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25 mb-1">Dados de Contato</p>
            {[
              { icon: User,     label: 'Nome',     value: lead.name  },
              { icon: Mail,     label: 'E-mail',   value: lead.email },
              { icon: Phone,    label: 'Telefone', value: lead.phone },
              { icon: FileText, label: 'CPF',      value: lead.cpf   },
              { icon: MapPin,   label: 'Cidade',   value: lead.city ? `${lead.city}${lead.state ? ` — ${lead.state}` : ''}` : null },
              { icon: Calendar, label: 'Captado',  value: fmtDateShort(lead.created_at) },
            ].filter(r => !!r.value).map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="w-3.5 h-3.5 text-white/25 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-white/25 uppercase tracking-wider">{label}</p>
                  <p className="text-[13px] text-[#EDEDED] mt-0.5 break-words">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* UTM / origem */}
          {(lead.utm_source || lead.utm_medium || lead.utm_campaign || lead.utm_term || lead.utm_content || lead.referrer) && (
            <div className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: '#13151A', border: `1px solid ${BORDER}` }}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25 mb-1">Origem do Lead</p>
              {[
                { label: 'Fonte',     value: lead.utm_source   },
                { label: 'Mídia',     value: lead.utm_medium   },
                { label: 'Campanha',  value: lead.utm_campaign },
                { label: 'Termo',     value: lead.utm_term     },
                { label: 'Conteúdo', value: lead.utm_content  },
                { label: 'Referrer', value: lead.referrer     },
              ].filter(r => !!r.value).map(({ label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <ExternalLink className="w-3.5 h-3.5 text-white/25 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider">{label}</p>
                    <p className="text-[13px] text-[#EDEDED] mt-0.5 break-all">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Form answers */}
          {answersEntries.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25">Respostas do Formulário</p>
              <div className="flex flex-col gap-2">
                {answersEntries.map(([nodeId, answer], idx) => (
                  <div key={nodeId} className="rounded-lg px-4 py-3"
                    style={{ background: '#13151A', border: `1px solid ${BORDER}` }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1">
                      {String(idx + 1).padStart(2, '0')} — {resolveTitle(nodeId, nodes)}
                    </p>
                    <p className="text-[13px] text-[#EDEDED] leading-snug">{answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {answersEntries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl"
              style={{ background: '#13151A', border: `1px dashed ${BORDER}` }}>
              <p className="text-[13px] text-white/25">Nenhuma resposta registrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Table Row ─────────────────────────────────────────────────

function LeadRow({
  lead, onView, onEdit, onDelete,
}: {
  lead: Lead; onView: () => void; onEdit: () => void; onDelete: () => void
}) {
  const name  = displayName(lead)
  const color = productColor(lead.product_name)

  return (
    <tr className="group border-b transition-colors duration-100"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#22242F' }}
      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}>

      {/* Nome */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0"
            style={{ background: 'rgba(232,82,26,0.1)', color: '#E8521A' }}>
            {(name || lead.email || '?')[0]?.toUpperCase()}
          </div>
          <p className="text-[13px] font-semibold text-[#EDEDED] truncate">
            {name || <span className="text-white/35 font-normal">—</span>}
          </p>
        </div>
      </td>

      {/* Email */}
      <td className="px-5 py-3.5">
        <span className="text-[12px] text-white/45 truncate block max-w-[180px]">{lead.email ?? '—'}</span>
      </td>

      {/* Telefone */}
      <td className="px-5 py-3.5">
        <span className="text-[12px] text-white/45">{lead.phone ?? '—'}</span>
      </td>

      {/* Produto */}
      <td className="px-5 py-3.5">
        {lead.product_name ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold"
            style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
            {lead.product_name}
          </span>
        ) : <span className="text-[12px] text-white/20">—</span>}
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium"
          style={lead.qualified
            ? { background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }
            : { background: 'rgba(239,68,68,0.06)',  color: '#F87171', border: '1px solid rgba(239,68,68,0.12)'  }}>
          {lead.qualified
            ? <><CheckCircle2 className="w-2.5 h-2.5" />Qualificado</>
            : <><XCircle      className="w-2.5 h-2.5" />Desqualificado</>}
        </span>
      </td>

      {/* Data */}
      <td className="px-5 py-3.5">
        <p className="text-[12px] text-white/40">{fmtDateShort(lead.created_at)}</p>
        <p className="text-[10px] text-white/20 mt-0.5">{timeAgo(lead.created_at)}</p>
      </td>

      {/* Ações */}
      <td className="px-4 py-3.5" style={{ width: 100 }}>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all justify-end">
          <button onClick={onView}
            className="p-1.5 rounded-lg transition-colors text-white/30 hover:text-white/80 hover:bg-white/6"
            title="Ver detalhes">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button onClick={onEdit}
            className="p-1.5 rounded-lg transition-colors text-white/30 hover:text-[#93C5FD] hover:bg-blue-500/10"
            title="Editar">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg transition-colors text-white/30 hover:text-red-400 hover:bg-red-500/10"
            title="Excluir">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Stat chip ─────────────────────────────────────────────────

function StatChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
      style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
      <span className="text-[18px] font-bold tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[11px] text-white/35">{label}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function LeadsPage() {
  const navigate = useNavigate()
  const [productId,    setProductId]    = useState('')
  const [search,       setSearch]       = useState('')
  const [editLead,     setEditLead]     = useState<Lead | null>(null)
  const [deleteLead,   setDeleteLead]   = useState<Lead | null>(null)
  const qc = useQueryClient()

  const { data: leads = [], isLoading, isFetching, error } = useLeads(productId || null)
  const { data: products = [] } = useProductsForFilter()

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return leads
    return leads.filter(l =>
      displayName(l).toLowerCase().includes(q) ||
      (l.email ?? '').toLowerCase().includes(q) ||
      (l.phone ?? '').includes(q) ||
      (l.city  ?? '').toLowerCase().includes(q),
    )
  }, [leads, search])

  const total       = filtered.length
  const qualified   = filtered.filter(l => l.qualified).length
  const unqualified = filtered.filter(l => !l.qualified).length
  const todayCount  = filtered.filter(l => {
    const d = new Date(l.created_at), n = new Date()
    return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).length

  const productOptions = products.map(p => ({ value: p.id, label: p.name }))

  // Fix: use refetchQueries (force refetch, não apenas invalidate)
  function refresh() {
    qc.refetchQueries({ queryKey: ['leads'] })
  }

  function exportCSV() {
    const header = ['Nome', 'Email', 'Telefone', 'Produto', 'Status', 'Cidade', 'Estado', 'Fonte (UTM)', 'Mídia', 'Campanha', 'Referrer', 'Data']
    const rows   = filtered.map(l => [
      displayName(l), l.email ?? '', l.phone ?? '', l.product_name ?? '',
      l.qualified ? 'Qualificado' : 'Desqualificado',
      l.city ?? '', l.state ?? '',
      l.utm_source ?? '', l.utm_medium ?? '', l.utm_campaign ?? '', l.referrer ?? '',
      fmtDateShort(l.created_at),
    ])
    const csv  = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'leads.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="flex flex-col min-h-full" style={{ background: BG_PAGE }}>
        <div className="max-w-7xl w-full mx-auto px-8 py-8 flex flex-col gap-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#EDEDED] tracking-tight">Leads CRM</h1>
              <p className="text-[13px] text-white/30 mt-0.5">Leads capturados pelos formulários de produtos</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all"
                style={{ background: BG_CARD, border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.45)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.18)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER }}>
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </button>
              <button onClick={refresh}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all"
                style={{ background: BG_CARD, border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.45)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.18)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER }}>
                <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
                Atualizar
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatChip value={total}       label="total"           color="#EDEDED" />
            <StatChip value={qualified}   label="qualificados"    color="#34D399" />
            <StatChip value={unqualified} label="desqualificados" color="#F87171" />
            <StatChip value={todayCount}  label="hoje"            color="#E8521A" />
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl flex-1 min-w-[200px]"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <Search className="w-4 h-4 text-white/25 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, e-mail ou telefone…"
                className="flex-1 bg-transparent border-0 outline-none text-[13px] text-white/70 placeholder:text-white/25" />
              {search && (
                <button onClick={() => setSearch('')} className="text-white/25 hover:text-white/60 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <SelectFilter value={productId} onChange={setProductId}
              placeholder="Todos os produtos" options={productOptions} />
          </div>

          {/* Table */}
          <div className="rounded-2xl overflow-hidden" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-5 h-5 rounded-full border-2 border-[#E8521A] border-t-transparent animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <p className="text-[13px] text-red-400">Erro ao carregar leads.</p>
                <p className="text-[11px] text-white/25">Verifique se a tabela <code>leads</code> existe no Supabase.</p>
                <button onClick={refresh} className="text-[12px] text-[#E8521A] hover:underline">
                  Tentar novamente
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
                  <User className="w-5 h-5 text-white/20" />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-medium text-white/40">
                    {search || productId ? 'Nenhum lead encontrado' : 'Nenhum lead ainda'}
                  </p>
                  {(search || productId) && (
                    <p className="text-[12px] text-white/20 mt-1">
                      <button className="text-[#E8521A] hover:underline"
                        onClick={() => { setSearch(''); setProductId('') }}>
                        Limpar filtros
                      </button>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['Nome', 'E-mail', 'Telefone', 'Produto', 'Status', 'Data', ''].map((h, i) => (
                        <th key={i} className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: 'rgba(255,255,255,0.28)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(lead => (
                      <LeadRow
                        key={lead.id}
                        lead={lead}
                        onView={() => navigate(`/admin/leads/${lead.id}`)}
                        onEdit={() => setEditLead(lead)}
                        onDelete={() => setDeleteLead(lead)}
                      />
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-3 flex items-center justify-between"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-[11px] text-white/25">
                    {filtered.length} lead{filtered.length !== 1 ? 's' : ''}
                    {(search || productId) ? ' encontrados' : ' no total'}
                  </p>
                  <p className="text-[10px] text-white/15">
                    {isFetching ? 'Atualizando…' : 'Dados em tempo real'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit drawer */}
      {editLead && (
        <EditLeadDrawer lead={editLead} onClose={() => setEditLead(null)} />
      )}

      {/* Delete confirm */}
      {deleteLead && (
        <DeleteConfirm lead={deleteLead} onClose={() => setDeleteLead(null)} />
      )}
    </>
  )
}

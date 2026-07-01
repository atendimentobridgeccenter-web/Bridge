import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, ChevronDown, RefreshCw,
  Mail, Phone, Package, Eye,
  CheckCircle2, XCircle, ArrowUpDown,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLeads, useProductsForFilter } from '@/hooks/useLeads'
import type { Lead } from '@/lib/types'

// ── Tokens ────────────────────────────────────────────────────

const BG_PAGE = '#0D0E12'
const BG_CARD = '#13151A'
const BG_DROP = '#1E202A'
const BORDER  = 'rgba(255,255,255,0.07)'

// ── Helpers ───────────────────────────────────────────────────

function fmtDateShort(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso))
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

function displayName(lead: Lead) {
  if (lead.name) return lead.name
  const a = lead.answers ?? {}
  return a['name'] ?? a['nome'] ?? a['full_name'] ?? ''
}

const PRODUCT_COLORS = [
  { bg: 'rgba(232,82,26,0.1)',  text: '#F0643A', border: 'rgba(232,82,26,0.25)'   },
  { bg: 'rgba(96,165,250,0.1)', text: '#93C5FD', border: 'rgba(96,165,250,0.25)'  },
  { bg: 'rgba(167,139,250,0.1)',text: '#C4B5FD', border: 'rgba(167,139,250,0.25)' },
  { bg: 'rgba(52,211,153,0.1)', text: '#6EE7B7', border: 'rgba(52,211,153,0.25)'  },
  { bg: 'rgba(251,191,36,0.1)', text: '#FCD34D', border: 'rgba(251,191,36,0.25)'  },
  { bg: 'rgba(244,114,182,0.1)',text: '#F9A8D4', border: 'rgba(244,114,182,0.25)' },
]

function productColor(name: string | null | undefined) {
  if (!name) return PRODUCT_COLORS[0]
  return PRODUCT_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % PRODUCT_COLORS.length]
}

function contactKey(lead: Lead) {
  return lead.email ? lead.email.toLowerCase() : (lead.phone ?? lead.id)
}

// ── Contact shape ─────────────────────────────────────────────

interface Contact {
  key:           string
  primaryLeadId: string       // ID do lead mais recente (para abrir perfil)
  name:          string
  email:         string | null
  phone:         string | null
  interactions:  number
  productNames:  string[]     // nomes únicos dos produtos
  productIds:    string[]
  lastSeen:      string
  firstSeen:     string
  qualifiedCount:number
  totalCount:    number
}

function buildContacts(leads: Lead[]): Contact[] {
  const map = new Map<string, Contact>()

  // Sort newest first so primaryLeadId = most recent
  const sorted = [...leads].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  for (const lead of sorted) {
    const key = contactKey(lead)
    const name = displayName(lead)

    if (!map.has(key)) {
      map.set(key, {
        key,
        primaryLeadId: lead.id,
        name:          name || '',
        email:         lead.email,
        phone:         lead.phone,
        interactions:  0,
        productNames:  [],
        productIds:    [],
        lastSeen:      lead.created_at,
        firstSeen:     lead.created_at,
        qualifiedCount:0,
        totalCount:    0,
      })
    }

    const c = map.get(key)!
    c.interactions++
    c.totalCount++
    if (lead.qualified) c.qualifiedCount++

    // Prefer non-empty name
    if (!c.name && name) c.name = name
    // Prefer email if we only had phone
    if (!c.email && lead.email) c.email = lead.email
    // Prefer phone if we only had email
    if (!c.phone && lead.phone) c.phone = lead.phone

    // Track unique products
    const pname = (lead as unknown as { product_name?: string | null }).product_name
    const pid   = lead.product_id
    if (pid && !c.productIds.includes(pid)) {
      c.productIds.push(pid)
      if (pname) c.productNames.push(pname)
    }

    // lastSeen = most recent (sorted desc, first entry per key is most recent)
    if (new Date(lead.created_at) > new Date(c.lastSeen)) c.lastSeen = lead.created_at
    if (new Date(lead.created_at) < new Date(c.firstSeen)) c.firstSeen = lead.created_at
  }

  return Array.from(map.values())
}

// ── Sort + filter dropdown ────────────────────────────────────

type SortKey = 'lastSeen' | 'firstSeen' | 'interactions' | 'name'

function SortDropdown({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const [open, setOpen] = useState(false)
  const opts: { value: SortKey; label: string }[] = [
    { value: 'lastSeen',      label: 'Último contato' },
    { value: 'firstSeen',     label: 'Primeiro contato' },
    { value: 'interactions',  label: 'Mais interações' },
    { value: 'name',          label: 'Nome A→Z' },
  ]
  const current = opts.find(o => o.value === value)
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] transition-all whitespace-nowrap"
        style={{ background: BG_CARD, border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.55)' }}>
        <ArrowUpDown className="w-3.5 h-3.5 text-white/25" />
        {current?.label}
        <ChevronDown className={cn('w-3.5 h-3.5 text-white/25 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 rounded-xl z-50 py-1.5 min-w-[180px]"
          style={{ background: BG_DROP, border: `1px solid ${BORDER}`, boxShadow: '0 20px 48px rgba(0,0,0,0.55)' }}>
          {opts.map(o => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false) }}
              className={cn('w-full flex items-center px-4 py-2 text-[12px] text-left transition-colors',
                o.value === value ? 'text-[#F0643A]' : 'text-white/55 hover:text-white/90 hover:bg-white/4')}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Contact table row ─────────────────────────────────────────

function ContactRow({ contact, onView }: { contact: Contact; onView: () => void }) {
  const initials = contact.name
    ? contact.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : (contact.email?.[0] ?? contact.phone?.[0] ?? '?').toUpperCase()

  const isAlwaysQualified = contact.qualifiedCount === contact.totalCount
  const neverQualified    = contact.qualifiedCount === 0

  return (
    <tr
      className="group border-b transition-colors duration-100 cursor-pointer"
      style={{ borderColor: 'rgba(255,255,255,0.04)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1A1C24' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      onClick={onView}
    >
      {/* Nome */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{ background: 'rgba(232,82,26,0.1)', color: '#E8521A' }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#EDEDED] truncate">
              {contact.name || <span className="text-white/30 font-normal">—</span>}
            </p>
          </div>
        </div>
      </td>

      {/* Email */}
      <td className="px-5 py-3.5">
        <span className="flex items-center gap-1.5 text-[12px] text-white/45 truncate max-w-[180px]">
          {contact.email
            ? <><Mail className="w-3 h-3 shrink-0 text-white/20" />{contact.email}</>
            : <span className="text-white/20">—</span>}
        </span>
      </td>

      {/* Telefone */}
      <td className="px-5 py-3.5">
        <span className="flex items-center gap-1.5 text-[12px] text-white/45">
          {contact.phone
            ? <><Phone className="w-3 h-3 shrink-0 text-white/20" />{contact.phone}</>
            : <span className="text-white/20">—</span>}
        </span>
      </td>

      {/* Produtos */}
      <td className="px-5 py-3.5">
        <div className="flex flex-wrap gap-1">
          {contact.productNames.length === 0
            ? <span className="text-[12px] text-white/20">—</span>
            : contact.productNames.slice(0, 2).map(name => {
                const c = productColor(name)
                return (
                  <span key={name}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
                    style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                    {name}
                  </span>
                )
              })
          }
          {contact.productNames.length > 2 && (
            <span className="text-[10px] text-white/25 self-center">
              +{contact.productNames.length - 2}
            </span>
          )}
        </div>
      </td>

      {/* Interações */}
      <td className="px-5 py-3.5 text-center">
        <span className="text-[13px] font-semibold text-[#EDEDED]">{contact.interactions}</span>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        {isAlwaysQualified ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
            style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }}>
            <CheckCircle2 className="w-2.5 h-2.5" /> Qualificado
          </span>
        ) : neverQualified ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
            style={{ background: 'rgba(239,68,68,0.06)', color: '#F87171', border: '1px solid rgba(239,68,68,0.12)' }}>
            <XCircle className="w-2.5 h-2.5" /> Desqualificado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
            style={{ background: 'rgba(251,191,36,0.08)', color: '#FCD34D', border: '1px solid rgba(251,191,36,0.15)' }}>
            <CheckCircle2 className="w-2.5 h-2.5" /> Parcial
          </span>
        )}
      </td>

      {/* Último contato */}
      <td className="px-5 py-3.5">
        <p className="text-[12px] text-white/40">{fmtDateShort(contact.lastSeen)}</p>
        <p className="text-[10px] text-white/20 mt-0.5">{timeAgo(contact.lastSeen)}</p>
      </td>

      {/* Ação */}
      <td className="px-4 py-3.5" style={{ width: 56 }}>
        <button
          onClick={e => { e.stopPropagation(); onView() }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all text-white/30 hover:text-white/80 hover:bg-white/6"
          title="Ver perfil"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function ContactsPage() {
  const navigate = useNavigate()
  const [search,     setSearch]     = useState('')
  const [productId,  setProductId]  = useState('')
  const [sortBy,     setSortBy]     = useState<SortKey>('lastSeen')
  const [onlyQual,   setOnlyQual]   = useState(false)

  const { data: leads = [], isLoading, isFetching, refetch } = useLeads(productId || null)
  const { data: products = [] } = useProductsForFilter()

  const contacts = useMemo(() => buildContacts(leads), [leads])

  const filtered = useMemo(() => {
    let list = contacts

    if (onlyQual) list = list.filter(c => c.qualifiedCount > 0)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q)
      )
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'name')         return a.name.localeCompare(b.name, 'pt-BR')
      if (sortBy === 'interactions') return b.interactions - a.interactions
      if (sortBy === 'firstSeen')    return new Date(a.firstSeen).getTime() - new Date(b.firstSeen).getTime()
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    })
  }, [contacts, search, onlyQual, sortBy])

  const totalInteractions = leads.length
  const qualifiedContacts = contacts.filter(c => c.qualifiedCount > 0).length

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: BG_PAGE }}>
      {/* ── Header ── */}
      <div className="shrink-0 px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-[#EDEDED] tracking-tight">Contatos</h1>
            <p className="text-[12px] text-white/30 mt-0.5">
              {contacts.length} contato{contacts.length !== 1 ? 's' : ''} únicos
              · {totalInteractions} interação{totalInteractions !== 1 ? 'ões' : ''} no total
            </p>
          </div>

          {/* Stats chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-lg text-[12px]"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <span className="text-white/30">Contatos: </span>
              <span className="font-semibold text-[#EDEDED]">{contacts.length}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg text-[12px]"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <span className="text-white/30">Qualificados: </span>
              <span className="font-semibold text-emerald-400">{qualifiedContacts}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg text-[12px]"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <span className="text-white/30">Interações: </span>
              <span className="font-semibold text-[#93C5FD]">{totalInteractions}</span>
            </div>
            <button onClick={() => refetch()}
              className="p-2 rounded-lg transition-colors text-white/25 hover:text-white/60 hover:bg-white/5"
              title="Atualizar">
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px] max-w-[360px]"
            style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <Search className="w-3.5 h-3.5 text-white/25 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, email, telefone…"
              className="flex-1 bg-transparent text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X className="w-3.5 h-3.5 text-white/25 hover:text-white/60" />
              </button>
            )}
          </div>

          {/* Product filter */}
          {products.length > 0 && (
            <div className="relative">
              <select
                value={productId}
                onChange={e => setProductId(e.target.value)}
                className="appearance-none px-3 pr-8 py-2 rounded-xl text-[13px] outline-none cursor-pointer transition-all"
                style={{
                  background: BG_CARD,
                  border: `1px solid ${productId ? 'rgba(232,82,26,0.35)' : BORDER}`,
                  color: productId ? '#EDEDED' : 'rgba(255,255,255,0.35)',
                }}>
                <option value="">Todos os produtos</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Package className="w-3 h-3 text-white/25 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Qualified toggle */}
          <button
            onClick={() => setOnlyQual(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all',
              onlyQual
                ? 'text-emerald-400'
                : 'text-white/35 hover:text-white/60',
            )}
            style={{
              background: onlyQual ? 'rgba(52,211,153,0.08)' : BG_CARD,
              border: `1px solid ${onlyQual ? 'rgba(52,211,153,0.25)' : BORDER}`,
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Só qualificados
          </button>

          {/* Sort */}
          <SortDropdown value={sortBy} onChange={setSortBy} />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-5 h-5 text-white/20 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-[14px] text-white/25">
              {search || productId ? 'Nenhum contato encontrado.' : 'Sem contatos ainda.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10" style={{ background: '#111318' }}>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Nome', 'E-mail', 'Telefone', 'Produtos', 'Interações', 'Status', 'Último contato', ''].map((h, i) => (
                  <th key={i}
                    className="text-left px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(contact => (
                <ContactRow
                  key={contact.key}
                  contact={contact}
                  onView={() => navigate(`/admin/leads/${contact.primaryLeadId}`)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer ── */}
      {filtered.length > 0 && (
        <div className="shrink-0 px-5 py-2.5 flex items-center justify-between"
          style={{ borderTop: `1px solid ${BORDER}` }}>
          <p className="text-[11px] text-white/20">
            {filtered.length} de {contacts.length} contato{contacts.length !== 1 ? 's' : ''}
          </p>
          <p className="text-[10px] text-white/15">
            {isFetching ? 'Atualizando…' : `Dados em tempo real · ${leads.length} entradas`}
          </p>
        </div>
      )}
    </div>
  )
}

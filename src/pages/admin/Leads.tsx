import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Clock, CreditCard, CheckCircle2, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { BridgeLead } from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Helpers ───────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (s < 60)  return 'agora'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

function getLeadName(lead: BridgeLead): string {
  const a = lead.answers as Record<string, string>
  return a?.name || a?.nome || a?.full_name || ''
}

// ── Column config ─────────────────────────────────────────────

const COLUMNS = [
  {
    id: 'started',
    label: 'Iniciou',
    icon: Users,
    dotColor: '#71717A',
    accentColor: 'rgba(113,113,122,0.12)',
    badgeColor: 'rgba(113,113,122,0.15)',
    badgeText: '#A1A1AA',
    filter: (l: BridgeLead) => !l.completed,
  },
  {
    id: 'qualified',
    label: 'Qualificado',
    icon: Clock,
    dotColor: '#60A5FA',
    accentColor: 'rgba(96,165,250,0.08)',
    badgeColor: 'rgba(96,165,250,0.12)',
    badgeText: '#93C5FD',
    filter: (l: BridgeLead) => l.completed && !l.stripe_session_id,
  },
  {
    id: 'pending',
    label: 'Checkout Pendente',
    icon: CreditCard,
    dotColor: '#FBBF24',
    accentColor: 'rgba(251,191,36,0.08)',
    badgeColor: 'rgba(251,191,36,0.12)',
    badgeText: '#FCD34D',
    filter: (l: BridgeLead) => !!l.stripe_session_id,
  },
  {
    id: 'paid',
    label: 'Pago',
    icon: CheckCircle2,
    dotColor: '#34D399',
    accentColor: 'rgba(52,211,153,0.08)',
    badgeColor: 'rgba(52,211,153,0.12)',
    badgeText: '#6EE7B7',
    filter: (_l: BridgeLead) => false,
  },
]

// ── Lead Card ─────────────────────────────────────────────────

function LeadCard({ lead }: { lead: BridgeLead }) {
  const name = getLeadName(lead)
  const email = lead.email ?? '—'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl p-4 cursor-default transition-all duration-150"
      style={{
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.12)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.05)'
      }}
    >
      {name && (
        <p className="text-xs font-semibold text-[#EDEDED] mb-0.5 truncate tracking-tight">{name}</p>
      )}
      <p className="text-xs text-[#71717A] truncate">{email}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-[#52525B]">{timeAgo(lead.updated_at)}</span>
        {lead.completed && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{
              background: 'rgba(139,92,246,0.1)',
              color: '#A78BFA',
              border: '1px solid rgba(139,92,246,0.2)',
            }}
          >
            Formulário ✓
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────

function Column({
  col,
  leads,
}: {
  col: typeof COLUMNS[number]
  leads: BridgeLead[]
}) {
  const Icon = col.icon

  return (
    <div
      className="flex flex-col flex-1 rounded-2xl min-h-[400px]"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-t-2xl"
        style={{
          background: col.accentColor,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: col.dotColor }}
          />
          <Icon className="w-3.5 h-3.5" style={{ color: col.dotColor }} />
          <span className="text-xs font-semibold text-[#A1A1AA]">{col.label}</span>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-md"
          style={{
            background: col.badgeColor,
            color: col.badgeText,
          }}
        >
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto">
        {leads.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <p className="text-[11px] text-[#3F3F46]">Nenhum lead</p>
          </div>
        ) : (
          leads.map(lead => <LeadCard key={lead.id} lead={lead} />)
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function Leads() {
  const [leads,   setLeads]   = useState<BridgeLead[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('bridge_leads')
      .select('*')
      .order('updated_at', { ascending: false })
    setLeads((data ?? []) as BridgeLead[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const total = leads.length

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0A0A0A' }}>
      {/* Top bar */}
      <div
        className="shrink-0 flex items-center justify-between px-8 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#EDEDED]">Pipeline de Leads</h1>
          <p className="text-xs text-[#71717A] mt-0.5">
            {total} lead{total !== 1 ? 's' : ''} no total
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium
                     text-[#A1A1AA] hover:text-[#EDEDED] transition-all disabled:opacity-40"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.16)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'
          }}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Atualizar
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-6">
        <div className="flex gap-4 h-full min-w-[860px]">
          {COLUMNS.map(col => (
            <Column
              key={col.id}
              col={col}
              leads={leads.filter(col.filter)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

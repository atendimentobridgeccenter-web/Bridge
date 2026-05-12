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
    label: 'Iniciou Formulário',
    icon: Users,
    dot: 'bg-zinc-500',
    border: 'border-zinc-700/60',
    header: 'bg-zinc-800/40',
    badge: 'bg-zinc-800 text-zinc-400',
    filter: (l: BridgeLead) => !l.completed,
  },
  {
    id: 'qualified',
    label: 'Qualificado',
    icon: Clock,
    dot: 'bg-blue-500',
    border: 'border-blue-500/20',
    header: 'bg-blue-500/5',
    badge: 'bg-blue-500/10 text-blue-400',
    filter: (l: BridgeLead) => l.completed && !l.stripe_session_id,
  },
  {
    id: 'pending',
    label: 'Checkout Pendente',
    icon: CreditCard,
    dot: 'bg-amber-500',
    border: 'border-amber-500/20',
    header: 'bg-amber-500/5',
    badge: 'bg-amber-500/10 text-amber-400',
    filter: (l: BridgeLead) => !!l.stripe_session_id,
  },
  {
    id: 'paid',
    label: 'Pago',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
    border: 'border-emerald-500/20',
    header: 'bg-emerald-500/5',
    badge: 'bg-emerald-500/10 text-emerald-400',
    filter: (_l: BridgeLead) => false,
  },
]

// ── Lead Card ─────────────────────────────────────────────────

function LeadCard({ lead }: { lead: BridgeLead }) {
  const name = getLeadName(lead)
  const email = lead.email ?? '—'
  const truncated = email.length > 24 ? email.slice(0, 22) + '…' : email

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group p-3 rounded-xl bg-zinc-900 border border-white/6
                 hover:border-white/12 hover:bg-zinc-800/80
                 transition-all duration-150 cursor-default"
    >
      {name && (
        <p className="text-xs font-medium text-white mb-0.5 truncate">{name}</p>
      )}
      <p className="text-xs text-zinc-400 truncate">{truncated}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-zinc-600">
          {timeAgo(lead.updated_at)}
        </span>
        {lead.completed && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
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
    <div className={cn(
      'flex flex-col rounded-2xl border min-h-[400px] flex-1',
      col.border,
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3 rounded-t-2xl border-b',
        col.header, col.border,
      )}>
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', col.dot)} />
          <span className="text-xs font-semibold text-zinc-300">{col.label}</span>
        </div>
        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', col.badge)}>
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto">
        {leads.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <p className="text-xs text-zinc-700">Nenhum lead</p>
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
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-8 py-5
                      border-b border-white/6">
        <div>
          <h1 className="text-lg font-semibold text-white">Pipeline de Leads</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {total} lead{total !== 1 ? 's' : ''} no total
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs
                     text-zinc-400 hover:text-white border border-white/8
                     hover:border-white/16 transition-all disabled:opacity-40"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Atualizar
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-6">
        <div className="flex gap-4 h-full min-w-[800px]">
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

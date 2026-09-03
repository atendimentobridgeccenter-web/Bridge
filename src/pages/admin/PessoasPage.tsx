import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search, X, RefreshCw, Users, GraduationCap, ChevronRight,
  Mail, Phone, CreditCard, Clock, CircleDot, Filter,
  ArrowUpRight, UserPlus, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { useLeads } from '@/hooks/useLeads'
import { useContactStagesBatch } from '@/hooks/useContactStage'
import type { Lead } from '@/lib/types'
import { STAGES } from '@/lib/stageConfig'

// ── Tokens ────────────────────────────────────────────────────

const BG_PAGE = '#0D0E12'
const BG_CARD = '#13151A'
const BORDER  = 'rgba(255,255,255,0.07)'

// ── Types ─────────────────────────────────────────────────────

type JourneyState = 'all' | 'lead' | 'contato' | 'aluno'
type PayFilter    = 'all' | 'confirmed' | 'pending' | 'none'

interface StudentRow {
  id: string; name: string | null; email: string | null; phone: string | null
  status: string; subject: string | null; jlpt_level: string | null
  class_schedule: string | null; teacher: string | null; enrollment_date: string | null
}

// ── Helpers ───────────────────────────────────────────────────

function displayName(lead: Lead): string {
  if (lead.name) return lead.name
  const a = lead.answers ?? {}
  return a['name'] ?? a['nome'] ?? a['full_name'] ?? ''
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/)
  return (p[0][0] + (p[1]?.[0] ?? '')).toUpperCase()
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)  return 'agora'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d < 30)  return `${d}d atrás`
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso))
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

const JOURNEY_CONFIG = {
  lead:    { label: 'Lead',     color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)'  },
  contato: { label: 'Contato',  color: '#FCD34D', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)'  },
  aluno:   { label: 'Aluno',    color: '#34D399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)'  },
}

const PAY_CONFIG = {
  confirmed: { label: 'Pago',      color: '#34D399', icon: CreditCard },
  pending:   { label: 'Pendente',  color: '#FCD34D', icon: Clock       },
  none:      { label: '',          color: '',        icon: null         },
}

// ── Data hooks ────────────────────────────────────────────────

function useStudentEmails() {
  return useQuery({
    queryKey: ['student-identifiers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, name, email, phone, status, subject, jlpt_level, class_schedule, teacher, enrollment_date')
        .order('enrollment_date', { ascending: false })
        .limit(500)
      return (data ?? []) as StudentRow[]
    },
    staleTime: 60_000,
  })
}

// ── Person row component ──────────────────────────────────────

function PersonRow({
  lead, stage, isAluno,
}: {
  lead: Lead
  stage: string | null
  isAluno: boolean
}) {
  const name = displayName(lead) || lead.email || 'Anônimo'
  const ini  = initials(name)
  const journey: 'lead' | 'contato' | 'aluno' = isAluno ? 'aluno' : stage ? 'contato' : 'lead'
  const jConfig = JOURNEY_CONFIG[journey]
  const stageInfo = STAGES.find(s => s.value === stage)
  const pay = lead.payment_status && lead.payment_status !== 'none' ? PAY_CONFIG[lead.payment_status] : null
  const days = daysSince(lead.created_at)

  return (
    <Link
      to={`/admin/leads/${lead.id}`}
      className="group flex items-center gap-4 px-4 py-3 transition-all duration-150 hover:bg-white/[0.025]"
      style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
        style={{ background: jConfig.bg, border: `1px solid ${jConfig.border}`, color: jConfig.color }}
      >
        {ini}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-medium text-[#DADCE6] truncate">{name}</span>
          {pay && (
            <span
              className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
              style={{ background: `${pay.color}18`, color: pay.color }}
            >
              {pay.icon && <pay.icon className="w-2.5 h-2.5" />}
              {pay.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: '#404252' }}>
          {lead.email && <span className="flex items-center gap-1 truncate"><Mail className="w-2.5 h-2.5 shrink-0" />{lead.email}</span>}
          {lead.phone && <span className="flex items-center gap-1 shrink-0"><Phone className="w-2.5 h-2.5" />{lead.phone}</span>}
          {lead.product_name && <span className="truncate">{lead.product_name}</span>}
        </div>
      </div>

      {/* Journey badge */}
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <span
          className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: jConfig.bg, color: jConfig.color, border: `1px solid ${jConfig.border}` }}
        >
          {jConfig.label}
        </span>
        {stageInfo && (
          <span className="text-[9px] font-medium" style={{ color: stageInfo.color }}>
            {stageInfo.label}
          </span>
        )}
      </div>

      {/* Days since */}
      <div className="shrink-0 text-right hidden sm:block" style={{ minWidth: 52 }}>
        <p className="text-[11px] tabular-nums" style={{ color: days > 7 ? '#EF4444' : '#404252' }}>
          {timeAgo(lead.created_at)}
        </p>
        {days > 3 && !isAluno && !stage && (
          <p className="text-[9px]" style={{ color: '#C8281E' }}>sem contato</p>
        )}
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-white/10 group-hover:text-white/30 transition-colors shrink-0" />
    </Link>
  )
}

// ── Empty state ───────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Users className="w-10 h-10 text-white/8" />
      <p className="text-[13px] text-white/25">
        {query ? `Nenhum resultado para "${query}"` : 'Nenhuma pessoa encontrada'}
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function PessoasPage() {
  const [query,       setQuery]       = useState('')
  const [journeyTab,  setJourneyTab]  = useState<JourneyState>('all')
  const [payFilter,   setPayFilter]   = useState<PayFilter>('all')

  const { data: leads = [],   isLoading: leadsLoading,   refetch: refetchLeads }   = useLeads()
  const { data: students = [], isLoading: studentsLoading }                          = useStudentEmails()

  // Build contact key → stage map
  const allKeys = useMemo(
    () => leads.map(l => l.email ?? l.phone ?? l.id).filter(Boolean) as string[],
    [leads],
  )
  const { data: stagesData = {} } = useContactStagesBatch(allKeys)

  // Build email set for students
  const studentEmails = useMemo(
    () => new Set(students.map(s => s.email?.toLowerCase()).filter(Boolean) as string[]),
    [students],
  )

  // Filter + search
  const filtered = useMemo(() => {
    let list = leads

    if (journeyTab !== 'all') {
      list = list.filter(l => {
        const key = l.email ?? l.phone ?? l.id
        const hasStage = key ? !!stagesData[key] : false
        const isAl = l.email ? studentEmails.has(l.email.toLowerCase()) : false
        if (journeyTab === 'aluno')   return isAl
        if (journeyTab === 'contato') return hasStage && !isAl
        if (journeyTab === 'lead')    return !hasStage && !isAl
        return true
      })
    }

    if (payFilter !== 'all') {
      list = list.filter(l => (l.payment_status ?? 'none') === payFilter)
    }

    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(l => {
        const name = displayName(l).toLowerCase()
        return (
          name.includes(q) ||
          (l.email ?? '').toLowerCase().includes(q) ||
          (l.phone ?? '').includes(q) ||
          (l.product_name ?? '').toLowerCase().includes(q)
        )
      })
    }

    return list
  }, [leads, stagesData, studentEmails, journeyTab, payFilter, query])

  // Tab counts
  const counts = useMemo(() => {
    const total = leads.length
    let alunoC = 0, contatoC = 0, leadC = 0
    for (const l of leads) {
      const key = l.email ?? l.phone ?? l.id
      const isAl = l.email ? studentEmails.has(l.email.toLowerCase()) : false
      const hasStage = key ? !!stagesData[key] : false
      if (isAl) alunoC++
      else if (hasStage) contatoC++
      else leadC++
    }
    return { total, alunoC, contatoC, leadC }
  }, [leads, stagesData, studentEmails])

  const loading = leadsLoading || studentsLoading

  function refresh() { refetchLeads() }

  const JOURNEY_TABS: { id: JourneyState; label: string; count: number; color: string }[] = [
    { id: 'all',    label: 'Todos',    count: counts.total,    color: '#7B7E92'  },
    { id: 'lead',   label: 'Leads',    count: counts.leadC,    color: '#60A5FA'  },
    { id: 'contato',label: 'Contatos', count: counts.contatoC, color: '#FCD34D'  },
    { id: 'aluno',  label: 'Alunos',   count: counts.alunoC,   color: '#34D399'  },
  ]

  return (
    <div className="flex flex-col min-h-full" style={{ background: BG_PAGE }}>
      <div className="max-w-5xl w-full mx-auto px-6 py-8 flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[18px] font-bold text-[#DADCE6] tracking-tight">Central de Pessoas</h1>
            <p className="text-[12px] mt-0.5" style={{ color: '#404252' }}>
              Leads, contatos e alunos em um único lugar
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}`, color: '#5A5C6A' }}
            >
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
              Atualizar
            </button>
          </div>
        </div>

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total de Pessoas', value: counts.total,    color: '#7B7E92', icon: Users },
            { label: 'Leads Ativos',     value: counts.leadC,    color: '#60A5FA', icon: Sparkles },
            { label: 'Em Pipeline',      value: counts.contatoC, color: '#FCD34D', icon: CircleDot },
            { label: 'Alunos',           value: counts.alunoC,   color: '#34D399', icon: GraduationCap },
          ].map(item => (
            <div
              key={item.label}
              className="p-4 rounded-xl flex flex-col gap-2.5"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/25">{item.label}</span>
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: `${item.color}16` }}
                >
                  <item.icon className="w-3 h-3" style={{ color: item.color }} />
                </div>
              </div>
              <p className="text-[24px] font-bold tabular-nums leading-none"
                style={{ color: loading ? '#ffffff20' : item.color }}>
                {loading ? '—' : item.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
        >
          {/* Search + refresh row */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#404252' }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por nome, email, telefone ou produto…"
                className="w-full pl-8 pr-8 py-1.5 rounded-lg text-[12.5px] outline-none transition-all"
                style={{
                  background: '#0D0E12',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#DADCE6',
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <X className="w-3 h-3" style={{ color: '#404252' }} />
                </button>
              )}
            </div>

            {/* Payment filter */}
            <div className="flex items-center gap-1 shrink-0">
              {([ ['all','Todos'], ['confirmed','Pago'], ['pending','Pendente'] ] as const).map(([id, lbl]) => (
                <button
                  key={id}
                  onClick={() => setPayFilter(id)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer"
                  style={payFilter === id
                    ? { background: 'rgba(255,255,255,0.08)', color: '#DADCE6' }
                    : { color: '#404252' }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Journey tabs */}
          <div className="flex items-center gap-0 px-4 py-0" style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
            {JOURNEY_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setJourneyTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-[11.5px] font-medium transition-all relative cursor-pointer"
                style={journeyTab === tab.id
                  ? { color: tab.color }
                  : { color: '#3E404F' }}
              >
                <span>{tab.label}</span>
                <span
                  className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
                  style={{
                    background: journeyTab === tab.id ? `${tab.color}18` : 'rgba(255,255,255,0.04)',
                    color:      journeyTab === tab.id ? tab.color : '#2E3042',
                  }}
                >
                  {loading ? '…' : tab.count}
                </span>
                {journeyTab === tab.id && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-px rounded-full"
                    style={{ background: tab.color }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex flex-col">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3 w-32 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    <div className="h-2 w-48 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                  </div>
                  <div className="h-5 w-12 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            <div>
              {/* Count bar */}
              <div className="px-4 py-2 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span className="text-[11px]" style={{ color: '#2E3042' }}>
                  {filtered.length} pessoa{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>
              {filtered.map(lead => {
                const key = lead.email ?? lead.phone ?? lead.id
                const stage = key ? stagesData[key] ?? null : null
                const isAluno = lead.email ? studentEmails.has(lead.email.toLowerCase()) : false
                return (
                  <PersonRow
                    key={lead.id}
                    lead={lead}
                    stage={stage}
                    isAluno={isAluno}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* ── Quick links ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { to: '/admin/leads',    label: 'Leads CRM',       sub: 'Kanban e pipeline completo',  color: '#60A5FA' },
            { to: '/admin/alunos',   label: 'Gerenciar Alunos', sub: 'Turmas, matrículas, status',  color: '#34D399' },
            { to: '/admin/acessos',  label: 'Acessos',          sub: 'Quem tem acesso a cada curso', color: '#9474FF' },
          ].map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-[#DADCE6] truncate">{item.label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#404252' }}>{item.sub}</p>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/10 group-hover:text-white/40 transition-colors" />
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}

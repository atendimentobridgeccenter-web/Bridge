import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, CreditCard, AlertCircle, DollarSign,
  ChevronRight, ArrowUpRight, Clock, CheckCircle2, Users,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

// ── Tokens ────────────────────────────────────────────────────

const BG_PAGE = '#0D0E12'
const BG_CARD = '#13151A'
const BORDER  = 'rgba(255,255,255,0.07)'

// ── Helpers ───────────────────────────────────────────────────

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(v)
}

function fmtJPY(v: number) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(v)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso))
}

function thisMonth() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return start.toISOString()
}

function lastNMonths(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (n - 1 - i))
    return {
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d),
      year: d.getFullYear(),
      month: d.getMonth(),
      start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(),
      end:   new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString(),
    }
  })
}

// ── Data ──────────────────────────────────────────────────────

interface FinRow {
  id: string; name: string | null; email: string | null
  payment_status: string; paid_at: string | null
  stripe_session_id: string | null; created_at: string
  products: { name: string } | null
}

interface StudentRow {
  id: string; name: string | null; email: string | null
  status: string; monthly_fee: number | null; payment_method: string | null
  enrollment_date: string | null; teacher: string | null; subject: string | null
}

function useFinanceiro() {
  return useQuery({
    queryKey: ['financeiro-data'],
    staleTime: 60_000,
    queryFn: async () => {
      const [leadsRes, studentsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id, name, email, payment_status, paid_at, stripe_session_id, created_at, products(name)')
          .neq('payment_status', 'none')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('students')
          .select('id, name, email, status, monthly_fee, payment_method, enrollment_date, teacher, subject')
          .order('enrollment_date', { ascending: false })
          .limit(500),
      ])
      return {
        leads:    (leadsRes.data ?? []) as unknown as FinRow[],
        students: (studentsRes.data ?? []) as StudentRow[],
      }
    },
  })
}

// ── Bar chart ─────────────────────────────────────────────────

function MonthlyChart({ leads }: { leads: FinRow[] }) {
  const months = lastNMonths(6)
  const confirmedLeads = leads.filter(l => l.payment_status === 'confirmed' && l.paid_at)

  const bars = months.map(m => {
    const count = confirmedLeads.filter(l => {
      const d = new Date(l.paid_at!)
      return d.getFullYear() === m.year && d.getMonth() === m.month
    }).length
    return { label: m.label, count }
  })

  const max = Math.max(...bars.map(b => b.count), 1)

  return (
    <div className="flex items-end gap-2 h-20 pt-2">
      {bars.map((b, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
          <span className="text-[9px] font-medium tabular-nums" style={{ color: b.count > 0 ? '#34D399' : '#2E3042' }}>
            {b.count > 0 ? b.count : ''}
          </span>
          <div
            className="w-full rounded-t-sm transition-all duration-700"
            style={{
              height: b.count > 0 ? `${Math.max((b.count / max) * 100, 8)}%` : '4px',
              background: i === bars.length - 1
                ? 'rgba(52,211,153,0.7)'
                : b.count > 0 ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.04)',
            }}
          />
          <span className="text-[9px]" style={{ color: '#2E3042' }}>{b.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const { data, isLoading } = useFinanceiro()

  const leads    = data?.leads    ?? []
  const students = data?.students ?? []

  // ── Aggregates ──────────────────────────────────────────────
  const confirmed       = leads.filter(l => l.payment_status === 'confirmed')
  const pending         = leads.filter(l => l.payment_status === 'pending')
  const thisMonthStart  = thisMonth()
  const confirmedMonth  = confirmed.filter(l => l.paid_at && l.paid_at >= thisMonthStart)

  const activeStudents  = students.filter(s => s.status === 'ativo')
  const mrr             = activeStudents.reduce((sum, s) => sum + (s.monthly_fee ?? 0), 0)
  const pendingStudents = activeStudents.filter(s => s.payment_method === 'dinheiro' || s.payment_method === 'deposito')

  const STATS = [
    {
      label: 'Pagamentos Confirmados',
      value: confirmed.length,
      sub:   `${confirmedMonth.length} este mês`,
      color: '#34D399',
      icon:  CheckCircle2,
    },
    {
      label: 'Pendentes',
      value: pending.length,
      sub:   'aguardando confirmação',
      color: '#FCD34D',
      icon:  Clock,
    },
    {
      label: 'MRR (Mensalidades)',
      value: isLoading ? '—' : fmtJPY(mrr),
      sub:   `${activeStudents.length} alunos ativos`,
      color: '#60A5FA',
      icon:  TrendingUp,
    },
    {
      label: 'Alunos Ativos',
      value: activeStudents.length,
      sub:   `${pendingStudents.length} com pgto manual`,
      color: '#FB923C',
      icon:  Users,
    },
  ]

  return (
    <div className="flex flex-col min-h-full" style={{ background: BG_PAGE }}>
      <div className="max-w-5xl w-full mx-auto px-6 py-8 flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[18px] font-bold text-[#DADCE6] tracking-tight">Financeiro</h1>
            <p className="text-[12px] mt-0.5" style={{ color: '#404252' }}>
              Pagamentos Stripe, mensalidades e receita consolidada
            </p>
          </div>
          <Link
            to="/admin/cupons"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={{ background: BG_CARD, border: `1px solid ${BORDER}`, color: '#9474FF' }}
          >
            Gerenciar Cupons <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATS.map(stat => (
            <div
              key={stat.label}
              className="p-4 rounded-xl flex flex-col gap-2.5"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: '#404252' }}>{stat.label}</span>
                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: `${stat.color}16` }}>
                  <stat.icon className="w-3 h-3" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-[24px] font-bold tabular-nums leading-none"
                style={{ color: isLoading ? '#ffffff15' : stat.color }}>
                {isLoading ? '—' : stat.value}
              </p>
              <p className="text-[10.5px]" style={{ color: '#2E3042' }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Chart + pending ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Monthly chart */}
          <div
            className="lg:col-span-3 p-5 rounded-xl"
            style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[13px] font-semibold text-[#DADCE6]">Pagamentos por mês</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#404252' }}>
                  últimos 6 meses · confirmados via Stripe
                </p>
              </div>
            </div>
            {isLoading ? (
              <div className="flex items-end gap-2 h-20">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-1 rounded animate-pulse"
                    style={{ height: `${20 + i * 10}%`, background: 'rgba(255,255,255,0.04)' }} />
                ))}
              </div>
            ) : (
              <MonthlyChart leads={leads} />
            )}
          </div>

          {/* Pending payments */}
          <div
            className="lg:col-span-2 p-5 rounded-xl"
            style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-semibold text-[#DADCE6]">Pendentes</p>
              {pending.length > 0 && (
                <span
                  className="text-[9.5px] font-bold px-2 py-0.5 rounded-full tabular-nums"
                  style={{ background: 'rgba(251,191,36,0.12)', color: '#FCD34D' }}
                >
                  {pending.length}
                </span>
              )}
            </div>
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg animate-pulse"
                    style={{ background: 'rgba(255,255,255,0.04)' }} />
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle2 className="w-6 h-6" style={{ color: '#34D39940' }} />
                <p className="text-[11px]" style={{ color: '#2E3042' }}>Nenhum pendente</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {pending.slice(0, 6).map(lead => (
                  <Link
                    key={lead.id}
                    to={`/admin/leads/${lead.id}`}
                    className="group flex items-center gap-3 px-3 py-2 rounded-lg transition-all hover:bg-white/[0.03]"
                    style={{ border: '1px solid rgba(251,191,36,0.1)' }}
                  >
                    <Clock className="w-3 h-3 shrink-0" style={{ color: '#FCD34D' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11.5px] font-medium text-[#DADCE6] truncate">
                        {lead.name ?? lead.email ?? 'Anônimo'}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: '#404252' }}>
                        {lead.products?.name ?? '—'}
                      </p>
                    </div>
                    <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-white/30 transition-colors shrink-0" />
                  </Link>
                ))}
                {pending.length > 6 && (
                  <p className="text-[10.5px] text-center mt-1" style={{ color: '#404252' }}>
                    +{pending.length - 6} mais
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Confirmed payments list ── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <p className="text-[13px] font-semibold text-[#DADCE6]">Pagamentos Confirmados</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#404252' }}>
                {confirmed.length} registros · confirmados via webhook Stripe
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="flex-1 h-3 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  <div className="w-16 h-3 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
              ))}
            </div>
          ) : confirmed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <CreditCard className="w-10 h-10 text-white/8" />
              <p className="text-[13px]" style={{ color: '#2E3042' }}>Nenhum pagamento confirmado ainda</p>
              <p className="text-[11px]" style={{ color: '#1C1E28' }}>Configure o webhook Stripe para receber confirmações</p>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div
                className="grid px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  gridTemplateColumns: '1fr 1fr 120px 120px',
                  color: '#2E3042',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <span>Pessoa</span>
                <span>Produto</span>
                <span>Data</span>
                <span>Status</span>
              </div>

              {confirmed.slice(0, 50).map((lead, idx) => (
                <Link
                  key={lead.id}
                  to={`/admin/leads/${lead.id}`}
                  className="group grid px-5 py-3 transition-all hover:bg-white/[0.025] items-center"
                  style={{
                    gridTemplateColumns: '1fr 1fr 120px 120px',
                    borderBottom: idx < confirmed.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-[#DADCE6] truncate">
                      {lead.name ?? lead.email ?? 'Anônimo'}
                    </p>
                    {lead.email && (
                      <p className="text-[10.5px] truncate" style={{ color: '#404252' }}>{lead.email}</p>
                    )}
                  </div>
                  <p className="text-[12px] truncate" style={{ color: '#5A5C6A' }}>
                    {lead.products?.name ?? '—'}
                  </p>
                  <p className="text-[11.5px] tabular-nums" style={{ color: '#5A5C6A' }}>
                    {fmtDate(lead.paid_at)}
                  </p>
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full self-center"
                    style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399' }}
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Confirmado
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Mensalidades overview ── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <p className="text-[13px] font-semibold text-[#DADCE6]">Mensalidades — Alunos Ativos</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#404252' }}>
                {activeStudents.length} alunos · {fmtJPY(mrr)}/mês estimado
              </p>
            </div>
            <Link
              to="/admin/alunos"
              className="flex items-center gap-1 text-[11px] transition-colors hover:opacity-80"
              style={{ color: '#60A5FA' }}
            >
              Gerenciar <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : activeStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Users className="w-8 h-8 text-white/8" />
              <p className="text-[12px]" style={{ color: '#2E3042' }}>Nenhum aluno ativo</p>
            </div>
          ) : (
            <div>
              {activeStudents.slice(0, 10).map((s, idx) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 px-5 py-3"
                  style={{ borderBottom: idx < Math.min(activeStudents.length, 10) - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: 'rgba(96,165,250,0.12)', color: '#60A5FA' }}>
                    {(s.name ?? s.email ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-[#DADCE6] truncate">{s.name ?? s.email ?? '—'}</p>
                    <p className="text-[10.5px] truncate" style={{ color: '#404252' }}>
                      {s.subject ?? '—'}{s.teacher ? ` · ${s.teacher}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12.5px] font-semibold tabular-nums" style={{ color: '#60A5FA' }}>
                      {s.monthly_fee != null ? fmtJPY(s.monthly_fee) : '—'}
                    </p>
                    <p className="text-[10px]" style={{ color: '#2E3042' }}>/mês</p>
                  </div>
                </div>
              ))}
              {activeStudents.length > 10 && (
                <div className="px-5 py-3 text-center">
                  <Link to="/admin/alunos" className="text-[11px] transition-colors hover:opacity-70"
                    style={{ color: '#404252' }}>
                    +{activeStudents.length - 10} alunos · Ver todos
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

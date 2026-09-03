import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  TrendingUp, Users, GraduationCap, ArrowUpRight,
  CheckCircle2, ChevronRight, RefreshCw, DollarSign,
  Activity, Clock, Zap, CreditCard,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/cn'
import { STAGES } from '@/lib/stageConfig'

// ── Tokens ─────────────────────────────────────────────────────

const BG_PAGE = '#0D0E12'
const BG_CARD = '#1A1C23'
const BORDER  = 'rgba(255,255,255,0.07)'

// ── Types ──────────────────────────────────────────────────────

interface DashLead {
  id:           string
  qualified:    boolean
  created_at:   string
  name:         string | null
  email:        string | null
  phone:        string | null
  utm_source:   string | null
  utm_campaign: string | null
  products:     { name: string } | null
}

interface DashStage   { stage: string; contact_key: string }
interface DashStudent { status: string; monthly_fee: number | null }
interface DashHistory { contact_key: string; stage: string; previous_stage: string | null; changed_at: string }
interface DashProduct { id: string; name: string; slug: string; status: string; created_at: string }

// ── Helpers ────────────────────────────────────────────────────

function greeting(user: User | null): string {
  const h = new Date().getHours()
  const name = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]
    ?? (user?.user_metadata?.name as string | undefined)?.split(' ')[0]
    ?? 'Admin'
  return `${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}, ${name}`
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function fmtDateShort(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso))
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

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString()
}

function isWithinDays(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() < days * 86_400_000
}

function buildChart(leads: DashLead[], days = 30) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i)); d.setHours(0, 0, 0, 0)
    const next = new Date(d); next.setDate(next.getDate() + 1)
    const inDay = leads.filter(l => {
      const t = new Date(l.created_at).getTime()
      return t >= d.getTime() && t < next.getTime()
    })
    return { label: fmtDateShort(d.toISOString()), total: inDay.length }
  })
}

function buildUTM(leads: DashLead[]) {
  const map = new Map<string, number>()
  for (const l of leads) {
    const src = l.utm_source ?? '(direto/orgânico)'
    map.set(src, (map.get(src) ?? 0) + 1)
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s, c]) => ({ source: s, count: c }))
}

function buildPipeline(leads: DashLead[], stages: DashStage[]) {
  const keys = new Set(leads.map(l => l.email ? l.email.toLowerCase() : (l.phone ?? l.id)))
  const byKey = new Map(stages.map(s => [s.contact_key, s.stage]))
  const counts: Record<string, number> = {}
  for (const k of keys) {
    const st = byKey.get(k) ?? 'novo'
    counts[st] = (counts[st] ?? 0) + 1
  }
  return STAGES.map(s => ({ ...s, count: counts[s.value] ?? 0 }))
}

// ── Data hook ──────────────────────────────────────────────────

function useDash() {
  return useQuery({
    queryKey: ['dashboard-360'],
    staleTime: 60_000,
    queryFn: async () => {
      const [lr, sr, stR, hr, pr] = await Promise.all([
        supabase.from('leads')
          .select('id, qualified, created_at, name, email, phone, utm_source, utm_campaign, products(name)')
          .order('created_at', { ascending: false }).limit(500),
        supabase.from('contact_stages').select('stage, contact_key'),
        supabase.from('students').select('status, monthly_fee'),
        supabase.from('contact_stage_history')
          .select('contact_key, stage, previous_stage, changed_at')
          .order('changed_at', { ascending: false }).limit(15),
        supabase.from('products').select('id, name, slug, status, created_at')
          .order('created_at', { ascending: false }),
      ])
      return {
        leads:    (lr.data  ?? []) as unknown as DashLead[],
        stages:   (sr.data  ?? []) as DashStage[],
        students: (stR.data ?? []) as DashStudent[],
        history:  (hr.data  ?? []) as DashHistory[],
        products: (pr.data  ?? []) as DashProduct[],
      }
    },
  })
}

// ── Sub-components ─────────────────────────────────────────────

function StatCard({ label, value, sub, accent, icon: Icon, loading }: {
  label: string; value: string | number; sub?: string; accent?: string
  icon: React.ElementType; loading: boolean
}) {
  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-white/35">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: accent ? `${accent}18` : 'rgba(255,255,255,0.04)' }}>
          <Icon className="w-3.5 h-3.5" style={{ color: accent ?? '#52525B' }} />
        </div>
      </div>
      <div>
        <p className="text-[26px] font-bold text-[#EDEDED] tracking-tight leading-none">
          {loading ? <span className="text-white/15">—</span> : value}
        </p>
        {sub && <p className="text-[11px] text-white/25 mt-1.5">{sub}</p>}
      </div>
    </div>
  )
}

function LeadsChart({ data, loading }: { data: { label: string; total: number }[]; loading: boolean }) {
  if (loading) return (
    <div className="flex items-end gap-0.5 h-20">
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} className="flex-1 rounded-sm animate-pulse"
          style={{ height: `${20 + ((i * 37) % 60)}%`, background: 'rgba(255,255,255,0.04)' }} />
      ))}
    </div>
  )
  const max = Math.max(...data.map(d => d.total), 1)
  return (
    <div className="flex items-end gap-0.5 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end" title={`${d.label}: ${d.total}`}>
          <div className="w-full rounded-sm transition-all"
            style={{
              height: d.total > 0 ? `${Math.max((d.total / max) * 100, 6)}%` : '2px',
              background: d.total > 0 ? 'rgba(232,82,26,0.45)' : 'rgba(255,255,255,0.04)',
            }} />
        </div>
      ))}
    </div>
  )
}

function PipelineFunnel({ dist, total, loading }: {
  dist: (typeof STAGES[0] & { count: number })[]; total: number; loading: boolean
}) {
  if (loading) return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-7 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
      ))}
    </div>
  )
  const maxCount = Math.max(...dist.map(d => d.count), 1)
  return (
    <div className="flex flex-col gap-2.5">
      {dist.map(s => (
        <div key={s.value} className="flex items-center gap-3">
          <span className="text-[10px] font-semibold w-16 text-right shrink-0" style={{ color: s.color }}>
            {s.label}
          </span>
          <div className="flex-1 h-6 rounded-lg overflow-hidden relative"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="h-full rounded-lg transition-all duration-700"
              style={{
                width: s.count > 0 ? `${Math.max((s.count / maxCount) * 100, 5)}%` : '0%',
                background: s.bg,
                borderRight: s.count > 0 ? `2px solid ${s.color}` : 'none',
              }} />
            {s.count > 0 && (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold"
                style={{ color: s.color }}>
                {s.count}
              </span>
            )}
          </div>
          <span className="text-[10px] text-white/25 w-8 text-right shrink-0">
            {total > 0 ? `${Math.round(s.count / total * 100)}%` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

function UTMList({ sources, total, loading }: {
  sources: { source: string; count: number }[]; total: number; loading: boolean
}) {
  if (loading) return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-8 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
      ))}
    </div>
  )
  if (sources.length === 0) return (
    <p className="text-[12px] text-white/25 py-4 text-center">Sem dados UTM ainda</p>
  )
  return (
    <div className="flex flex-col gap-3">
      {sources.map(({ source, count }) => (
        <div key={source}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-[#EDEDED] truncate">{source}</span>
            <span className="text-[11px] text-white/40 ml-3 shrink-0 tabular-nums">{count}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full"
              style={{ width: `${Math.round(count / total * 100)}%`, background: '#E8521A' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  published: { bg: 'rgba(52,211,153,0.08)',  color: '#34D399', label: 'Publicado' },
  draft:     { bg: 'rgba(255,255,255,0.05)', color: '#71717A', label: 'Rascunho'  },
  archived:  { bg: 'rgba(239,68,68,0.08)',   color: '#F87171', label: 'Arquivado' },
}

// ── Page ──────────────────────────────────────────────────────

export default function AdminHome() {
  const [user, setUser] = useState<User | null>(null)
  const qc = useQueryClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u))
  }, [])

  const { data, isLoading, isFetching } = useDash()

  const leads    = data?.leads    ?? []
  const stages   = data?.stages   ?? []
  const students = data?.students ?? []
  const history  = data?.history  ?? []
  const products = data?.products ?? []

  // ── Lead stats ──────────────────────────────────────────────
  const todayLeads = leads.filter(l => isToday(l.created_at)).length
  const weekLeads  = leads.filter(l => isWithinDays(l.created_at, 7)).length
  const qualLeads  = leads.filter(l => l.qualified).length
  const qualRate   = leads.length > 0 ? Math.round(qualLeads / leads.length * 100) : 0

  // ── Student stats ───────────────────────────────────────────
  const activeStudents    = students.filter(s => s.status === 'ativo').length
  const lockedStudents    = students.filter(s => s.status === 'trancado').length
  const cancelledStudents = students.filter(s => s.status === 'cancelado').length
  const monthlyRevenue    = students
    .filter(s => s.status === 'ativo')
    .reduce((sum, s) => sum + (s.monthly_fee ?? 0), 0)

  // ── Product stats ───────────────────────────────────────────
  const activeProducts = products.filter(p => p.status === 'published').length
  const recentProds    = products.slice(0, 5)

  // ── Derived ─────────────────────────────────────────────────
  const chartData     = useMemo(() => buildChart(leads, 30), [leads])
  const utmSources    = useMemo(() => buildUTM(leads), [leads])
  const pipelineDist  = useMemo(() => buildPipeline(leads, stages), [leads, stages])
  const totalContacts = pipelineDist.reduce((s, d) => s + d.count, 0)

  // ── Activity feed ───────────────────────────────────────────
  const activityItems = useMemo(() => {
    const leadItems = leads.slice(0, 10).map(l => ({
      text:  l.name ?? l.email ?? 'Lead anônimo',
      sub:   l.products?.name ?? 'Produto removido',
      time:  timeAgo(l.created_at),
      color: l.qualified ? '#34D399' : '#E8521A',
      ts:    new Date(l.created_at).getTime(),
    }))
    const histItems = history.map(h => {
      const to   = STAGES.find(s => s.value === h.stage)
      const from = STAGES.find(s => s.value === h.previous_stage)
      return {
        text:  h.contact_key.length > 32 ? h.contact_key.slice(0, 32) + '…' : h.contact_key,
        sub:   `Estágio: ${from ? from.label + ' → ' : ''}${to?.label ?? h.stage}`,
        time:  timeAgo(h.changed_at),
        color: to?.color ?? '#71717A',
        ts:    new Date(h.changed_at).getTime(),
      }
    })
    return [...leadItems, ...histItems].sort((a, b) => b.ts - a.ts).slice(0, 12)
  }, [leads, history])

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  function refresh() {
    qc.invalidateQueries({ queryKey: ['dashboard-360'] })
  }

  return (
    <div className="flex flex-col min-h-full" style={{ background: BG_PAGE }}>
      <div className="max-w-7xl w-full mx-auto px-8 py-8 flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#EDEDED] tracking-tight">{greeting(user)}</h1>
            <p className="text-[13px] text-white/30 mt-0.5 capitalize">{today}</p>
          </div>
          <button onClick={refresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all"
            style={{ background: BG_CARD, border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.35)' }}>
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            Atualizar
          </button>
        </div>

        {/* ── Hoje — fila de ação ── */}
        {!isLoading && (todayLeads > 0 || leads.filter(l => !l.qualified && isWithinDays(l.created_at, 1)).length > 0) && (
          <div
            className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.12)' }}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" style={{ color: '#60A5FA' }} />
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#60A5FA' }}>
                Hoje
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {todayLeads > 0 && (
                <Link to="/admin/pessoas" className="group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all hover:bg-white/4"
                  style={{ border: '1px solid rgba(96,165,250,0.12)' }}>
                  <Users className="w-3.5 h-3.5" style={{ color: '#60A5FA' }} />
                  <span className="text-[12.5px] font-medium text-[#DADCE6]">
                    <strong className="tabular-nums" style={{ color: '#60A5FA' }}>{todayLeads}</strong> lead{todayLeads !== 1 ? 's' : ''} hoje
                  </span>
                  <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors" />
                </Link>
              )}
              {(() => {
                const pending = leads.filter(l => l.payment_status === 'pending').length
                return pending > 0 ? (
                  <Link to="/admin/financeiro" className="group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all hover:bg-white/4"
                    style={{ border: '1px solid rgba(251,191,36,0.15)' }}>
                    <Clock className="w-3.5 h-3.5" style={{ color: '#FCD34D' }} />
                    <span className="text-[12.5px] font-medium text-[#DADCE6]">
                      <strong className="tabular-nums" style={{ color: '#FCD34D' }}>{pending}</strong> pagamento{pending !== 1 ? 's' : ''} pendente{pending !== 1 ? 's' : ''}
                    </span>
                    <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors" />
                  </Link>
                ) : null
              })()}
              {(() => {
                const stale = leads.filter(l => !l.qualified && !isWithinDays(l.created_at, 3)).length
                return stale > 0 ? (
                  <Link to="/admin/pessoas?journey=lead" className="group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all hover:bg-white/4"
                    style={{ border: '1px solid rgba(239,68,68,0.15)' }}>
                    <Activity className="w-3.5 h-3.5" style={{ color: '#F87171' }} />
                    <span className="text-[12.5px] font-medium text-[#DADCE6]">
                      <strong className="tabular-nums" style={{ color: '#F87171' }}>{stale}</strong> lead{stale !== 1 ? 's' : ''} sem contato há +3 dias
                    </span>
                    <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors" />
                  </Link>
                ) : null
              })()}
            </div>
          </div>
        )}

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Leads Hoje"
            value={todayLeads}
            sub={`${weekLeads} nos últimos 7 dias`}
            accent="#60A5FA"
            icon={Users}
            loading={isLoading}
          />
          <StatCard
            label="Taxa de Qualificação"
            value={`${qualRate}%`}
            sub={`${qualLeads} de ${leads.length} qualificados`}
            accent="#A78BFA"
            icon={TrendingUp}
            loading={isLoading}
          />
          <StatCard
            label="Alunos Ativos"
            value={activeStudents}
            sub={`${lockedStudents} trancados · ${cancelledStudents} cancelados`}
            accent="#34D399"
            icon={GraduationCap}
            loading={isLoading}
          />
          <StatCard
            label="Receita Mensal"
            value={isLoading ? '—' : fmtBRL(monthlyRevenue)}
            sub={`${activeStudents} alunos pagantes (estimado)`}
            accent="#FB923C"
            icon={DollarSign}
            loading={isLoading}
          />
        </div>

        {/* ── Chart + Pipeline ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          <div className="lg:col-span-3 rounded-2xl p-5" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[13px] font-semibold text-[#EDEDED]">Leads — últimos 30 dias</p>
                <p className="text-[11px] text-white/25 mt-0.5">{leads.length} lead{leads.length !== 1 ? 's' : ''} no total</p>
              </div>
              <Link to="/admin/leads"
                className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
                Ver todos <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <LeadsChart data={chartData} loading={isLoading} />
          </div>

          <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[13px] font-semibold text-[#EDEDED]">Pipeline de Contatos</p>
                <p className="text-[11px] text-white/25 mt-0.5">{totalContacts} contato{totalContacts !== 1 ? 's' : ''} únicos</p>
              </div>
              <Link to="/admin/contatos"
                className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
                Ver CRM <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <PipelineFunnel dist={pipelineDist} total={totalContacts} loading={isLoading} />
          </div>
        </div>

        {/* ── Activity + Sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Activity feed */}
          <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-[#EDEDED]">Atividade Recente</p>
              <Link to="/admin/leads"
                className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
                Leads <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {isLoading ? (
              <div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="h-3 w-40 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      <div className="h-2 w-24 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                    </div>
                    <div className="w-10 h-2 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                ))}
              </div>
            ) : activityItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Activity className="w-8 h-8 text-white/10" />
                <p className="text-[12px] text-white/25">Nenhuma atividade ainda</p>
              </div>
            ) : (
              <div>
                {activityItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5"
                    style={{ borderBottom: i < activityItems.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: item.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#EDEDED] truncate">{item.text}</p>
                      <p className="text-[10px] text-white/30 mt-0.5 truncate">{item.sub}</p>
                    </div>
                    <span className="text-[10px] text-white/20 shrink-0 mt-0.5">{item.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-4">

            {/* UTM breakdown */}
            <div className="rounded-2xl p-5" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-[13px] font-semibold text-[#EDEDED] mb-4">Origem dos Leads</p>
              <UTMList sources={utmSources} total={leads.length} loading={isLoading} />
            </div>

            {/* Students */}
            <div className="rounded-2xl p-5" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[13px] font-semibold text-[#EDEDED]">Alunos</p>
                <Link to="/admin/alunos"
                  className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
                  Gerenciar <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-9 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {[
                      { label: 'Ativos',     value: activeStudents,    color: '#34D399', bg: 'rgba(52,211,153,0.08)',  bd: 'rgba(52,211,153,0.15)'  },
                      { label: 'Trancados',  value: lockedStudents,    color: '#FCD34D', bg: 'rgba(251,191,36,0.08)', bd: 'rgba(251,191,36,0.15)'  },
                      { label: 'Cancelados', value: cancelledStudents, color: '#F87171', bg: 'rgba(239,68,68,0.06)',  bd: 'rgba(239,68,68,0.12)'   },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between px-3 py-2 rounded-lg"
                        style={{ background: item.bg, border: `1px solid ${item.bd}` }}>
                        <span className="text-[12px] font-medium" style={{ color: item.color }}>{item.label}</span>
                        <span className="text-[15px] font-bold tabular-nums" style={{ color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                  {monthlyRevenue > 0 && (
                    <div className="mt-3 pt-3 flex items-center justify-between"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-[11px] text-white/30">Receita estimada</span>
                      <span className="text-[13px] font-semibold" style={{ color: '#FB923C' }}>
                        {fmtBRL(monthlyRevenue)}/mês
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Quick links */}
            <div className="rounded-2xl p-4" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-3">Acesso rápido</p>
              <div className="flex flex-col gap-1">
                {[
                  { to: '/admin/leads',    label: 'Leads CRM',  sub: `${leads.length} leads`,        color: '#60A5FA' },
                  { to: '/admin/contatos', label: 'Contatos',   sub: `${totalContacts} únicos`,       color: '#A78BFA' },
                  { to: '/admin/alunos',   label: 'Alunos',     sub: `${activeStudents} ativos`,      color: '#34D399' },
                  { to: '/admin/products', label: 'Produtos',   sub: `${activeProducts} publicados`,  color: '#FB923C' },
                ].map(item => (
                  <Link key={item.to} to={item.to}
                    className="group flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-white/4">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#EDEDED] truncate">{item.label}</p>
                      <p className="text-[10px] text-white/25">{isLoading ? '…' : item.sub}</p>
                    </div>
                    <ArrowUpRight className="w-3 h-3 text-white/15 group-hover:text-white/40 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Products */}
            <div className="rounded-2xl p-5" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-semibold text-[#EDEDED]">Produtos</p>
                <Link to="/admin/products"
                  className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
                  Ver todos <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {isLoading ? (
                <div className="flex flex-col gap-2 pt-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="w-7 h-7 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                      <div className="flex-1 h-3 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    </div>
                  ))}
                </div>
              ) : recentProds.length === 0 ? (
                <p className="text-[12px] text-white/25 py-4 text-center">Nenhum produto ainda</p>
              ) : (
                <div>
                  {recentProds.map((p, idx) => {
                    const s = STATUS_STYLE[p.status] ?? STATUS_STYLE.draft
                    return (
                      <Link key={p.id} to={`/admin/products/${p.id}`}
                        className="group flex items-center gap-3 py-2.5 transition-colors"
                        style={{ borderBottom: idx < recentProds.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 text-white"
                          style={{ background: 'linear-gradient(135deg, rgba(232,82,26,0.5), rgba(194,63,18,0.5))' }}>
                          {p.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-[#EDEDED] truncate group-hover:text-white transition-colors">
                            {p.name}
                          </p>
                        </div>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: s.bg, color: s.color }}>
                          {s.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Summary chip ── */}
        <div className="rounded-2xl p-4 flex items-center gap-6 flex-wrap"
          style={{ background: 'rgba(232,82,26,0.05)', border: '1px solid rgba(232,82,26,0.12)' }}>
          {[
            { value: todayLeads,    label: 'leads hoje',     color: '#E8521A'  },
            { value: `${qualRate}%`, label: 'qualificação',  color: '#A78BFA'  },
            { value: activeStudents, label: 'alunos ativos', color: '#34D399'  },
            ...(monthlyRevenue > 0 ? [{ value: fmtBRL(monthlyRevenue), label: 'receita/mês', color: '#FB923C' }] : []),
          ].map((item, i, arr) => (
            <div key={i} className="flex items-center gap-6">
              <div>
                <p className="text-[22px] font-bold tabular-nums" style={{ color: item.color }}>
                  {isLoading ? '—' : item.value}
                </p>
                <p className="text-[11px] text-white/35 mt-0.5">{item.label}</p>
              </div>
              {i < arr.length - 1 && (
                <div className="w-px h-8" style={{ background: 'rgba(232,82,26,0.2)' }} />
              )}
            </div>
          ))}
        </div>

        <p className="text-[11px] text-white/15 text-center pb-2">
          Bridge HUB · Dados em tempo real
        </p>
      </div>
    </div>
  )
}

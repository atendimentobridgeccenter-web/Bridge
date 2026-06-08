import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, TrendingUp, Users, Package,
  ArrowUpRight, CheckCircle2, XCircle,
  ChevronRight, RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/cn'

// ── Tokens ─────────────────────────────────────────────────────

const BG_PAGE  = '#0D0E12'
const BG_CARD  = '#1A1C23'
const BORDER   = 'rgba(255,255,255,0.07)'

// ── Types ──────────────────────────────────────────────────────

interface LeadRow {
  id:         string
  qualified:  boolean
  created_at: string
  products:   { name: string } | null
  name:       string | null
  email:      string | null
  phone:      string | null
}

interface ProductRow {
  id:            string
  name:          string
  slug:          string
  status:        string
  thumbnail_url: string | null
  created_at:    string
}

// ── Helpers ────────────────────────────────────────────────────

function greeting(user: User | null): string {
  const h = new Date().getHours()
  const name = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]
    ?? (user?.user_metadata?.name as string | undefined)?.split(' ')[0]
    ?? 'Admin'
  const period = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  return `${period}, ${name}`
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
  const d = new Date(iso), n = new Date()
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
}

function leadDisplayName(l: LeadRow) {
  if (l.name) return l.name
  return l.email ?? l.phone ?? 'Lead anônimo'
}

/** Build last-N-days labels and counts from a list of leads */
function buildChart(leads: LeadRow[], days = 7) {
  const buckets: { label: string; qualified: number; total: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const next = new Date(d); next.setDate(next.getDate() + 1)
    const inDay = leads.filter(l => {
      const t = new Date(l.created_at).getTime()
      return t >= d.getTime() && t < next.getTime()
    })
    buckets.push({
      label:     new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(d),
      total:     inDay.length,
      qualified: inDay.filter(l => l.qualified).length,
    })
  }
  return buckets
}

// ── Stat card ──────────────────────────────────────────────────

function StatCard({ label, value, sub, accent, icon: Icon, loading }: {
  label:   string
  value:   string | number
  sub?:    string
  accent?: string
  icon:    React.ElementType
  loading: boolean
}) {
  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl"
      style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
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

// ── Mini bar chart ─────────────────────────────────────────────

function MiniChart({ data }: { data: { label: string; total: number; qualified: number }[] }) {
  const max = Math.max(...data.map(d => d.total), 1)
  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex flex-col-reverse rounded-t-sm overflow-hidden" style={{ height: 48 }}>
            {/* total bar */}
            <div
              className="w-full rounded-sm transition-all duration-500"
              style={{
                height:  `${(d.total / max) * 100}%`,
                background: 'rgba(232,82,26,0.25)',
                minHeight: d.total > 0 ? 3 : 0,
              }}
            />
          </div>
          <span className="text-[9px] text-white/20 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Recent leads row ───────────────────────────────────────────

function LeadItem({ lead }: { lead: LeadRow }) {
  const name = leadDisplayName(lead)
  return (
    <div className="flex items-center gap-3 py-3"
      style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0"
        style={{ background: 'rgba(232,82,26,0.1)', color: '#E8521A' }}>
        {name[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#EDEDED] truncate">{name}</p>
        <p className="text-[11px] text-white/25 truncate">{lead.products?.name ?? 'Produto removido'}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {lead.qualified
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          : <XCircle      className="w-3.5 h-3.5 text-red-400/60" />}
        <span className="text-[10px] text-white/20">{timeAgo(lead.created_at)}</span>
      </div>
    </div>
  )
}

// ── Product item ───────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  published: { bg: 'rgba(52,211,153,0.08)', color: '#34D399', label: 'Publicado'  },
  draft:     { bg: 'rgba(255,255,255,0.05)', color: '#71717A', label: 'Rascunho'  },
  archived:  { bg: 'rgba(239,68,68,0.08)',  color: '#F87171', label: 'Arquivado'  },
}

function ProductItem({ p }: { p: ProductRow }) {
  const s = STATUS_STYLE[p.status] ?? STATUS_STYLE.draft
  return (
    <Link to={`/admin/products/${p.id}`}
      className="group flex items-center gap-3 py-3 transition-colors"
      style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 text-white"
        style={{ background: 'linear-gradient(135deg, rgba(232,82,26,0.5), rgba(194,63,18,0.5))' }}>
        {p.name[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#EDEDED] truncate group-hover:text-white transition-colors">
          {p.name}
        </p>
        <p className="text-[11px] text-white/25">/{p.slug}</p>
      </div>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0"
        style={{ background: s.bg, color: s.color }}>
        {s.label}
      </span>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function AdminHome() {
  const [user,     setUser]     = useState<User | null>(null)
  const [leads,    setLeads]    = useState<LeadRow[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading,  setLoading]  = useState(true)

  async function load() {
    setLoading(true)
    const [{ data: { user: u } }, leadsRes, productsRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('leads')
        .select('id, qualified, created_at, name, email, phone, products(name)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('products')
        .select('id, name, slug, status, thumbnail_url, created_at')
        .order('created_at', { ascending: false }),
    ])

    setUser(u)
    setLeads((leadsRes.data ?? []) as unknown as LeadRow[])
    setProducts((productsRes.data ?? []) as ProductRow[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Derived stats ────────────────────────────────────────────

  const totalLeads      = leads.length
  const qualifiedLeads  = leads.filter(l => l.qualified).length
  const todayLeads      = leads.filter(l => isToday(l.created_at)).length
  const qualRate        = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0
  const activeProducts  = products.filter(p => p.status === 'published').length

  const chartData       = buildChart(leads, 7)
  const recentLeads     = leads.slice(0, 8)
  const recentProducts  = products.slice(0, 6)

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col min-h-full" style={{ background: BG_PAGE }}>
      <div className="max-w-6xl w-full mx-auto px-8 py-8 flex flex-col gap-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#EDEDED] tracking-tight">{greeting(user)}</h1>
            <p className="text-[13px] text-white/30 mt-0.5 capitalize">{today}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.35)' }}>
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              Atualizar
            </button>
            <Link to="/admin/products/new"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all"
              style={{ background: '#E8521A' }}>
              <Plus className="w-3.5 h-3.5" />
              Novo Produto
            </Link>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total de Leads"
            value={totalLeads}
            icon={Users}
            sub={`${todayLeads} captados hoje`}
            accent="#60A5FA"
            loading={loading}
          />
          <StatCard
            label="Qualificados"
            value={qualifiedLeads}
            icon={CheckCircle2}
            sub={`${totalLeads - qualifiedLeads} desqualificados`}
            accent="#34D399"
            loading={loading}
          />
          <StatCard
            label="Taxa de Qualificação"
            value={`${qualRate}%`}
            icon={TrendingUp}
            sub="dos leads responderam"
            accent="#A78BFA"
            loading={loading}
          />
          <StatCard
            label="Produtos Ativos"
            value={activeProducts}
            icon={Package}
            sub={`${products.length} produtos no total`}
            accent="#FB923C"
            loading={loading}
          />
        </div>

        {/* ── Main content grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: chart + recent leads ── */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Chart card */}
            <div className="rounded-2xl p-5" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[13px] font-semibold text-[#EDEDED]">Leads — últimos 7 dias</p>
                  <p className="text-[11px] text-white/25 mt-0.5">{totalLeads} lead{totalLeads !== 1 ? 's' : ''} no período</p>
                </div>
                <Link to="/admin/leads"
                  className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
                  Ver todos <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {loading ? (
                <div className="h-16 flex items-end gap-1.5">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex-1 rounded-sm animate-pulse"
                      style={{ height: `${Math.random() * 80 + 20}%`, background: 'rgba(255,255,255,0.04)' }} />
                  ))}
                </div>
              ) : (
                <MiniChart data={chartData} />
              )}
            </div>

            {/* Recent leads card */}
            <div className="rounded-2xl p-5" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-semibold text-[#EDEDED]">Leads recentes</p>
                <Link to="/admin/leads"
                  className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
                  Ver todos <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {loading ? (
                <div className="flex flex-col gap-3 pt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="h-3 w-32 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                        <div className="h-2.5 w-20 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                    <Users className="w-4 h-4 text-white/15" />
                  </div>
                  <p className="text-[13px] text-white/25">Nenhum lead ainda</p>
                  <p className="text-[11px] text-white/15">Os leads aparecem aqui conforme o formulário é preenchido</p>
                </div>
              ) : (
                <div>
                  {recentLeads.map(lead => (
                    <LeadItem key={lead.id} lead={lead} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: products + quick actions ── */}
          <div className="flex flex-col gap-5">

            {/* Products */}
            <div className="rounded-2xl p-5" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-semibold text-[#EDEDED]">Produtos</p>
                <Link to="/admin/products"
                  className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
                  Ver todos <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {loading ? (
                <div className="flex flex-col gap-3 pt-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="w-8 h-8 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                      <div className="flex-1 h-3 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    </div>
                  ))}
                </div>
              ) : recentProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <p className="text-[12px] text-white/25">Nenhum produto criado</p>
                  <Link to="/admin/products"
                    className="text-[12px] hover:underline" style={{ color: '#E8521A' }}>
                    Criar produto →
                  </Link>
                </div>
              ) : (
                <div>
                  {recentProducts.map(p => <ProductItem key={p.id} p={p} />)}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="rounded-2xl p-5" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-[13px] font-semibold text-[#EDEDED] mb-4">Ações rápidas</p>
              <div className="flex flex-col gap-2">
                {[
                  { to: '/admin/leads',    label: 'Ver todos os leads',    sub: `${totalLeads} captados`,          color: '#60A5FA' },
                  { to: '/admin/products', label: 'Gerenciar produtos',    sub: `${activeProducts} ativos`,        color: '#FB923C' },
                  { to: '/admin/settings', label: 'Configurações',         sub: 'Perfil e notificações',           color: '#A78BFA' },
                ].map(item => (
                  <Link key={item.to} to={item.to}
                    className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    style={{ background: '#13151A', border: `1px solid ${BORDER}` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.14)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = BORDER }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#EDEDED] truncate">{item.label}</p>
                      <p className="text-[11px] text-white/25">{loading ? '…' : item.sub}</p>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Today summary chip */}
            <div className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background: 'rgba(232,82,26,0.06)', border: '1px solid rgba(232,82,26,0.15)' }}>
              <div>
                <p className="text-[22px] font-bold tabular-nums" style={{ color: '#E8521A' }}>
                  {loading ? '—' : todayLeads}
                </p>
                <p className="text-[11px] text-white/35 mt-0.5">leads hoje</p>
              </div>
              <div className="w-px self-stretch" style={{ background: 'rgba(232,82,26,0.2)' }} />
              <div>
                <p className="text-[22px] font-bold tabular-nums" style={{ color: '#34D399' }}>
                  {loading ? '—' : `${qualRate}%`}
                </p>
                <p className="text-[11px] text-white/35 mt-0.5">qualificação</p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer note */}
        <p className="text-[11px] text-white/15 text-center pb-2">
          Dados do dia {fmtDateShort(new Date().toISOString())} · Atualizado agora
        </p>
      </div>
    </div>
  )
}

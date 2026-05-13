import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, ExternalLink, Edit3, TrendingUp,
  Users, Globe, Package, ArrowUpRight, FileText,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { LandingPage } from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Types ─────────────────────────────────────────────────────

interface Stats {
  leads: number
  leadsCompleted: number
  pagesPublished: number
  productsActive: number
}

// ── Stat card ─────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, sub, accent,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  sub?: string
  accent?: string
}) {
  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-xl"
      style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-[#71717A]">{label}</span>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: accent ? `${accent}18` : 'rgba(255,255,255,0.04)' }}
        >
          <Icon
            className="w-3.5 h-3.5"
            style={{ color: accent ?? '#52525B' }}
          />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-[#EDEDED] tracking-tight leading-none">{value}</p>
        {sub && <p className="text-[11px] text-[#52525B] mt-1.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Quick action ───────────────────────────────────────────────

function QuickAction({
  to, icon: Icon, label, description,
}: {
  to: string
  icon: React.ElementType
  label: string
  description: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 p-4 rounded-xl transition-all duration-150"
      style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.12)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.06)'
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.15)' }}
      >
        <Icon className="w-4 h-4 text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#EDEDED] leading-none">{label}</p>
        <p className="text-[11px] text-[#52525B] mt-1">{description}</p>
      </div>
      <ArrowUpRight className="w-4 h-4 text-[#3F3F46] group-hover:text-[#71717A] transition-colors shrink-0" />
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function AdminHome() {
  const [pages,   setPages]   = useState<LandingPage[]>([])
  const [stats,   setStats]   = useState<Stats>({ leads: 0, leadsCompleted: 0, pagesPublished: 0, productsActive: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [pagesRes, leadsRes, productsRes] = await Promise.all([
        supabase.from('landing_pages').select('id, slug, title, published, created_at').order('created_at', { ascending: false }),
        supabase.from('bridge_leads').select('id, completed'),
        supabase.from('products').select('id, status'),
      ])

      const pagesData    = (pagesRes.data ?? []) as LandingPage[]
      const leadsData    = (leadsRes.data ?? []) as { id: string; completed: boolean }[]
      const productsData = (productsRes.data ?? []) as { id: string; status: string }[]

      setPages(pagesData)
      setStats({
        leads:          leadsData.length,
        leadsCompleted: leadsData.filter(l => l.completed).length,
        pagesPublished: pagesData.filter(p => p.published).length,
        productsActive: productsData.filter(p => p.status === 'published').length,
      })
      setLoading(false)
    }
    load()
  }, [])

  const convRate = stats.leads > 0
    ? Math.round((stats.leadsCompleted / stats.leads) * 100)
    : 0

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="flex flex-col h-full" style={{ background: '#0A0A0A' }}>
      <div className="max-w-5xl w-full mx-auto px-8 py-8 flex flex-col gap-8">

        {/* Welcome */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#EDEDED] tracking-tight">
              Bom dia, Everton
            </h1>
            <p className="text-[13px] text-[#52525B] mt-0.5 capitalize">{today}</p>
          </div>
          <Link
            to="/admin/builder"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold
                       bg-white text-black hover:bg-[#F0F0F0] transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Página
          </Link>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total de Leads"
            value={loading ? '—' : stats.leads}
            icon={Users}
            sub={`${stats.leadsCompleted} formulários completos`}
            accent="#60A5FA"
          />
          <StatCard
            label="Taxa de Conversão"
            value={loading ? '—' : `${convRate}%`}
            icon={TrendingUp}
            sub="leads qualificados"
            accent="#34D399"
          />
          <StatCard
            label="Páginas Publicadas"
            value={loading ? '—' : stats.pagesPublished}
            icon={Globe}
            sub={`${pages.length} páginas no total`}
            accent="#A78BFA"
          />
          <StatCard
            label="Produtos Ativos"
            value={loading ? '—' : stats.productsActive}
            icon={Package}
            sub="disponíveis para venda"
            accent="#FB923C"
          />
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Landing pages list */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest">
                Landing Pages
              </p>
              <Link
                to="/admin/builder"
                className="text-[11px] text-[#71717A] hover:text-[#EDEDED] transition-colors"
              >
                Ver todas →
              </Link>
            </div>

            {!loading && pages.length === 0 && (
              <div
                className="flex flex-col items-center justify-center py-14 rounded-xl text-center"
                style={{ background: '#161616', border: '1px dashed rgba(255,255,255,0.08)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <FileText className="w-4.5 h-4.5 text-[#3F3F46]" />
                </div>
                <p className="text-[13px] font-medium text-[#52525B]">Nenhuma página ainda</p>
                <p className="text-[11px] text-[#3F3F46] mt-1">Crie sua primeira landing page</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {pages.slice(0, 6).map(page => (
                <div
                  key={page.id}
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-100"
                  style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)'
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <FileText className="w-3.5 h-3.5 text-[#52525B]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#EDEDED] truncate">
                      {page.title || 'Sem título'}
                    </p>
                    <p className="text-[11px] text-[#52525B] truncate">/{page.slug}</p>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0',
                      page.published ? 'text-emerald-400' : 'text-[#52525B]',
                    )}
                    style={{
                      background: page.published
                        ? 'rgba(52,211,153,0.08)'
                        : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    {page.published ? 'Publicado' : 'Rascunho'}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      to={`/${page.slug}`}
                      target="_blank"
                      className="p-1.5 rounded-lg text-[#52525B] hover:text-[#EDEDED] transition-colors hover:bg-white/6"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    <Link
                      to={`/admin/builder/${page.id}`}
                      className="p-1.5 rounded-lg text-[#52525B] hover:text-[#EDEDED] transition-colors hover:bg-white/6"
                    >
                      <Edit3 className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest">
              Ações Rápidas
            </p>
            <div className="flex flex-col gap-2">
              <QuickAction
                to="/admin/builder"
                icon={FileText}
                label="Nova Landing Page"
                description="Crie uma página com o builder visual"
              />
              <QuickAction
                to="/admin/leads"
                icon={Users}
                label="Ver Pipeline"
                description="Acompanhe leads no CRM Kanban"
              />
              <QuickAction
                to="/admin/products"
                icon={Package}
                label="Gerenciar Produtos"
                description="Configure ofertas e conteúdos"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

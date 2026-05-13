import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ExternalLink, Edit3, LayoutDashboard, Globe, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { LandingPage } from '@/lib/types'
import { cn } from '@/lib/cn'

export default function AdminHome() {
  const [pages, setPages] = useState<LandingPage[]>([])

  useEffect(() => {
    supabase
      .from('landing_pages')
      .select('id, slug, title, published, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setPages((data ?? []) as LandingPage[]))
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0A0A0A' }}>
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-8 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#EDEDED]">Dashboard</h1>
          <p className="text-xs text-[#71717A] mt-0.5">Visão geral das landing pages</p>
        </div>
        <Link
          to="/admin/builder"
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                     bg-white text-black hover:bg-[#EBEBEB] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Página
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#52525B] mb-5">
          Landing Pages
        </p>

        {pages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <FileText className="w-5 h-5 text-[#52525B]" />
            </div>
            <p className="text-sm font-medium text-[#A1A1AA]">Nenhuma página criada ainda</p>
            <p className="text-xs text-[#52525B] mt-1 mb-6">Clique em "Nova Página" para começar.</p>
            <Link
              to="/admin/builder"
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                         bg-white text-black hover:bg-[#EBEBEB] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Página
            </Link>
          </div>
        )}

        <div className="space-y-2 max-w-3xl">
          {pages.map(page => (
            <div
              key={page.id}
              className="flex items-center justify-between p-4 rounded-xl transition-all duration-150"
              style={{
                background: '#111111',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.12)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)'
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: '#1C1C1C' }}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#71717A]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#EDEDED] truncate tracking-tight">
                    {page.title || 'Sem título'}
                  </p>
                  <p className="text-xs text-[#52525B] mt-0.5 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    /{page.slug}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-4">
                <span className={cn(
                  'text-[10px] px-2 py-1 rounded-md font-medium',
                  page.published
                    ? 'text-emerald-400'
                    : 'text-[#52525B]',
                )}
                style={{
                  background: page.published ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                  border: page.published
                    ? '1px solid rgba(16,185,129,0.15)'
                    : '1px solid rgba(255,255,255,0.06)',
                }}>
                  {page.published ? 'Publicado' : 'Rascunho'}
                </span>
                <Link
                  to={`/${page.slug}`}
                  target="_blank"
                  className="p-1.5 rounded-lg text-[#52525B] hover:text-[#EDEDED] transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to={`/admin/builder/${page.id}`}
                  className="p-1.5 rounded-lg text-[#52525B] hover:text-[#EDEDED] transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

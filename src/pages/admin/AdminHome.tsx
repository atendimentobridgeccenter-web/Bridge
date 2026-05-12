import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ExternalLink, Edit3, LayoutDashboard } from 'lucide-react'
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
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-white/6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">Dashboard</h1>
            <p className="text-xs text-zinc-500">Visão geral das landing pages</p>
          </div>
        </div>
        <Link
          to="/admin/builder"
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white',
            'bg-violet-600 hover:bg-violet-500 transition-colors',
            'shadow-lg shadow-violet-900/30',
          )}
        >
          <Plus className="w-4 h-4" /> Nova Página
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-5">
          Landing Pages
        </p>

        {pages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
              <LayoutDashboard className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">Nenhuma página criada ainda.</p>
            <p className="text-xs text-zinc-600 mt-1">Clique em "Nova Página" para começar.</p>
          </div>
        )}

        <div className="space-y-2 max-w-3xl">
          {pages.map(page => (
            <div
              key={page.id}
              className={cn(
                'flex items-center justify-between p-4 rounded-xl',
                'border border-white/6 bg-zinc-900/60',
                'hover:border-white/10 hover:bg-zinc-900 transition-all duration-150',
              )}
            >
              <div>
                <p className="text-sm font-medium text-white">{page.title || 'Sem título'}</p>
                <p className="text-xs text-zinc-500 mt-0.5">/{page.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-xs px-2.5 py-1 rounded-full font-medium',
                  page.published
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-500 border border-white/6',
                )}>
                  {page.published ? 'Publicado' : 'Rascunho'}
                </span>
                <Link
                  to={`/${page.slug}`}
                  target="_blank"
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to={`/admin/builder/${page.id}`}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
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

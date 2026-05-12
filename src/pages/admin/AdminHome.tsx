import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ExternalLink, Edit3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { LandingPage } from '@/lib/types'

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
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Bridge — Admin</h1>
          <p className="text-sm text-slate-500 mt-0.5">Motor de Lançamentos</p>
        </div>
        <Link
          to="/admin/builder"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Página
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-10">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-6">
          Landing Pages
        </h2>

        {pages.length === 0 && (
          <div className="text-center py-20 text-slate-600">
            <p className="text-4xl mb-3">🚀</p>
            <p>Nenhuma página ainda. Crie a sua primeira!</p>
          </div>
        )}

        <div className="space-y-3">
          {pages.map(page => (
            <div
              key={page.id}
              className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-colors"
            >
              <div>
                <p className="font-medium text-white">{page.title || 'Sem título'}</p>
                <p className="text-sm text-slate-500 mt-0.5">/{page.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  page.published
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}>
                  {page.published ? 'Publicado' : 'Rascunho'}
                </span>
                <Link
                  to={`/${page.slug}`}
                  target="_blank"
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <Link
                  to={`/admin/builder/${page.id}`}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

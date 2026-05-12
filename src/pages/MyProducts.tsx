import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/lib/types'

export default function MyProducts() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const [user,     setUser]     = useState<{ email?: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate('/login'); return }
      setUser({ email: data.user.email })

      // Load purchased products via user_access join
      supabase
        .from('user_access')
        .select('product_id, purchased_at, products(id, name, slug, description, thumbnail_url, status)')
        .eq('user_id', data.user.id)
        .then(({ data: rows }) => {
          const prods = (rows ?? [])
            .map(r => r.products)
            .filter(Boolean) as unknown as Product[]
          setProducts(prods)
          setLoading(false)
        })
    })
  }, [navigate])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-8 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">Bem-vindo, {user?.email}</p>
          <h1 className="text-2xl font-bold tracking-tight">Meus Produtos</h1>
        </div>
        <button
          onClick={() => supabase.auth.signOut().then(() => navigate('/apply'))}
          className="text-sm text-slate-500 hover:text-white transition-colors"
        >
          Sair
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-12">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-24 text-slate-600">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-lg font-medium text-slate-400">Nenhum produto ainda</p>
            <p className="text-sm mt-1 mb-8">Complete sua compra para liberar o acesso.</p>
            <Link to="/apply" className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors">
              Ver produtos
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {products.map(p => (
            <Link
              key={p.id}
              to={`/view/${p.slug}`}
              className="group rounded-3xl border border-slate-800 bg-slate-900/40 hover:border-violet-500/40 hover:bg-violet-500/5 overflow-hidden transition-all"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-violet-900/40 to-slate-900 flex items-center justify-center overflow-hidden">
                {p.thumbnail_url
                  ? <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                  : <span className="text-5xl">📦</span>
                }
              </div>
              <div className="p-5">
                <h2 className="font-bold text-white text-lg mb-1 group-hover:text-violet-300 transition-colors">{p.name}</h2>
                <p className="text-slate-500 text-sm line-clamp-2">{p.description}</p>
                <p className="mt-4 text-xs text-violet-400 font-semibold">Acessar conteúdo →</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, LogOut, Package, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/lib/types'
import { cn } from '@/lib/cn'

function Spinner() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  )
}

export default function MyProducts() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const [email,    setEmail]    = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate('/login'); return }
      setEmail(data.user.email ?? '')

      supabase
        .from('user_access')
        .select('product_id, purchased_at, products(id, name, slug, description, thumbnail_url, status)')
        .eq('user_id', data.user.id)
        .then(({ data: rows }) => {
          const prods = (rows ?? []).map(r => r.products).filter(Boolean) as unknown as Product[]
          setProducts(prods)
          setLoading(false)
        })
    })
  }, [navigate])

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/apply')
  }

  if (loading) return <Spinner />

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Top nav */}
      <header className="border-b border-white/6 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <span className="text-sm font-semibold text-white">Bridge</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-600 truncate max-w-[200px]">{email}</span>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Meus Produtos</h1>
        <p className="text-sm text-zinc-500 mb-10">Acesse os conteúdos que você adquiriu.</p>

        {/* Empty */}
        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-white/6
                            flex items-center justify-center mb-5">
              <Package className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-400 mb-1">Nenhum produto ainda</p>
            <p className="text-xs text-zinc-600 mb-7">Complete sua compra para liberar o acesso.</p>
            <Link
              to="/apply"
              className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500
                         text-white text-sm font-medium transition-colors"
            >
              Ver produtos
            </Link>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map(p => (
            <Link
              key={p.id}
              to={`/view/${p.slug}`}
              className={cn(
                'group rounded-2xl border border-white/6 bg-zinc-900/50 overflow-hidden',
                'hover:border-violet-500/25 hover:bg-zinc-900 transition-all duration-200',
              )}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-violet-900/30 to-zinc-900
                              flex items-center justify-center overflow-hidden">
                {p.thumbnail_url ? (
                  <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center">
                    <Package className="w-5 h-5 text-zinc-600" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-5">
                <h2 className="font-semibold text-white text-sm mb-1 leading-tight group-hover:text-violet-300 transition-colors">
                  {p.name}
                </h2>
                {p.description && (
                  <p className="text-zinc-600 text-xs line-clamp-2 mb-4">{p.description}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-violet-400 font-medium">
                  Acessar conteúdo
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}

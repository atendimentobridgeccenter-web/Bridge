import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Edit3, Globe, EyeOff, Archive, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { Product, ProductStatus } from '@/lib/types'

const STATUS_BADGE: Record<ProductStatus, { label: string; cls: string }> = {
  draft:     { label: 'Rascunho',  cls: 'bg-slate-800 text-slate-400 border-slate-700' },
  published: { label: 'Publicado', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  archived:  { label: 'Arquivado', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
}

export default function Products() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)

  async function load() {
    const { data } = await supabase
      .from('products')
      .select('id,name,slug,status,thumbnail_url,price_id_stripe,created_at')
      .order('created_at', { ascending: false })
    setProducts((data ?? []) as Product[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function createProduct() {
    const { data, error } = await supabase
      .from('products')
      .insert({ name: 'Novo Produto', slug: `produto-${Date.now()}`, status: 'draft' })
      .select('id')
      .single()
    if (!error && data) navigate(`/admin/products/${data.id}/edit`)
  }

  async function deleteProduct(id: string) {
    if (!confirm('Excluir este produto? Esta ação não pode ser desfeita.')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(ps => ps.filter(p => p.id !== id))
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-8 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Bridge Admin</p>
          <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
        </div>
        <button
          onClick={createProduct}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-10">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-24 text-slate-600">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-lg font-medium text-slate-400">Nenhum produto ainda</p>
            <p className="text-sm mt-1 mb-8">Clique em "Novo Produto" para começar.</p>
            <button onClick={createProduct} className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors">
              Criar primeiro produto
            </button>
          </div>
        )}

        <div className="space-y-3">
          {products.map(p => {
            const badge = STATUS_BADGE[p.status]
            return (
              <div
                key={p.id}
                className="group flex items-center gap-5 p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {p.thumbnail_url
                    ? <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-2xl">📦</span>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-white truncate">{p.name}</h2>
                    <span className={cn('text-xs px-2.5 py-0.5 rounded-full border font-medium shrink-0', badge.cls)}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">/{p.slug}</p>
                  {p.price_id_stripe && (
                    <p className="text-xs text-violet-400 mt-0.5 font-mono">{p.price_id_stripe}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {p.status === 'published' && (
                    <Link
                      to={`/product/${p.slug}`}
                      target="_blank"
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                      title="Ver página pública"
                    >
                      <Globe className="w-4 h-4" />
                    </Link>
                  )}
                  {p.status === 'draft' && (
                    <span className="p-2 text-slate-600" title="Rascunho — não público">
                      <EyeOff className="w-4 h-4" />
                    </span>
                  )}
                  {p.status === 'published' && (
                    <button
                      onClick={async () => {
                        await supabase.from('products').update({ status: 'archived' }).eq('id', p.id)
                        load()
                      }}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400"
                      title="Arquivar"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                  <Link
                    to={`/admin/products/${p.id}/edit`}
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => deleteProduct(p.id)}
                    className="p-2 rounded-lg hover:bg-red-900/40 text-slate-600 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Edit3, Globe, Archive, Trash2, Package, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { Product, ProductStatus } from '@/lib/types'

const STATUS: Record<ProductStatus, { label: string; dot: string; cls: string }> = {
  draft:     { label: 'Rascunho',  dot: 'bg-zinc-500',    cls: 'bg-zinc-800 text-zinc-400 border-white/8'              },
  published: { label: 'Publicado', dot: 'bg-emerald-500', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  archived:  { label: 'Arquivado', dot: 'bg-amber-500',   cls: 'bg-amber-500/10  text-amber-400  border-amber-500/20'  },
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
      .select('id').single()
    if (!error && data) navigate(`/admin/products/${data.id}/edit`)
  }

  async function deleteProduct(id: string) {
    if (!confirm('Excluir este produto permanentemente?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(ps => ps.filter(p => p.id !== id))
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-white/6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Package className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">Produtos</h1>
            <p className="text-xs text-zinc-500">{products.length} produto{products.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={createProduct}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white
                     bg-violet-600 hover:bg-violet-500 transition-colors shadow-lg shadow-violet-900/30"
        >
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-8">
        {/* Loading */}
        {loading && (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mb-5">
              <Package className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-400 mb-1">Nenhum produto criado</p>
            <p className="text-xs text-zinc-600 mb-7">Crie seu primeiro produto digital agora.</p>
            <button
              onClick={createProduct}
              className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              Criar primeiro produto
            </button>
          </div>
        )}

        {/* List */}
        <div className="space-y-2 max-w-4xl">
          {products.map(p => {
            const st = STATUS[p.status]
            return (
              <div
                key={p.id}
                className={cn(
                  'group flex items-center gap-4 p-4 rounded-xl transition-all duration-150',
                  'border border-white/6 bg-zinc-900/50',
                  'hover:border-white/10 hover:bg-zinc-900',
                )}
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {p.thumbnail_url
                    ? <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    : <Package className="w-5 h-5 text-zinc-600" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-0.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', st.dot)} />
                    <h2 className="font-medium text-white text-sm truncate">{p.name}</h2>
                    <span className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0',
                      st.cls,
                    )}>
                      {st.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 pl-4">/{p.slug}</p>
                  {p.price_id_stripe && (
                    <p className="text-[11px] text-violet-400/70 font-mono pl-4 mt-0.5 truncate">
                      {p.price_id_stripe}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {p.status === 'published' ? (
                    <Link
                      to={`/product/${p.slug}`} target="_blank"
                      className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="p-2 text-zinc-700">
                      <EyeOff className="w-3.5 h-3.5" />
                    </span>
                  )}

                  {p.status === 'published' && (
                    <button
                      onClick={async () => {
                        await supabase.from('products').update({ status: 'archived' }).eq('id', p.id)
                        load()
                      }}
                      className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <Link
                    to={`/admin/products/${p.id}/edit`}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => deleteProduct(p.id)}
                    className="p-2 rounded-lg hover:bg-red-950/60 text-zinc-700 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ModuleSidebar from '@/members/ModuleSidebar'
import LessonView    from '@/members/LessonView'
import type { Product, ProductModule, Lesson } from '@/lib/types'

function Spinner() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  )
}

export default function ProductViewer() {
  const { product_slug } = useParams<{ product_slug: string }>()
  const navigate = useNavigate()

  const [product,   setProduct]   = useState<Product | null>(null)
  const [modules,   setModules]   = useState<ProductModule[]>([])
  const [lesson,    setLesson]    = useState<Lesson | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const { data: prod, error: prodErr } = await supabase
        .from('products').select('*')
        .eq('slug', product_slug!)
        .eq('status', 'published')
        .single()

      if (prodErr || !prod) { setForbidden(true); setLoading(false); return }

      const { data: access } = await supabase
        .from('user_access').select('id')
        .eq('user_id', user.id)
        .eq('product_id', prod.id)
        .single()

      if (!access) { setForbidden(true); setLoading(false); return }

      const { data: mods } = await supabase
        .from('product_structure').select('*')
        .eq('product_id', prod.id).order('order_index')

      setProduct(prod as Product)
      const sorted = (mods ?? []) as ProductModule[]
      setModules(sorted)

      const firstLesson = sorted[0]?.content_json?.lessons?.[0]
      if (firstLesson) setLesson(firstLesson)
      setLoading(false)
    }
    load()
  }, [product_slug, navigate])

  if (loading) return <Spinner />

  if (forbidden) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-white/6
                          flex items-center justify-center mx-auto mb-6">
            <Lock className="w-7 h-7 text-zinc-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Acesso Restrito</h1>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            Você não tem acesso a este produto.<br />
            Complete a compra para liberar o conteúdo.
          </p>
          <Link
            to="/apply"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg
                       bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium
                       transition-colors"
          >
            Adquirir acesso
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Top bar */}
      <header className="h-12 shrink-0 flex items-center gap-3 px-5
                         border-b border-white/6 bg-zinc-900/80 backdrop-blur-sm">
        <Link
          to="/my-products"
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-px h-4 bg-white/8" />
        <span className="text-sm font-semibold text-white truncate">{product?.name}</span>
        {lesson && (
          <>
            <span className="text-zinc-700 text-xs">›</span>
            <span className="text-xs text-zinc-500 truncate">{lesson.title}</span>
          </>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          modules={modules}
          activeLessonId={lesson?.id ?? null}
          onSelect={l => setLesson(l)}
        />
        <main className="flex-1 overflow-y-auto px-8 py-10">
          <LessonView lesson={lesson} />
        </main>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ModuleSidebar from '@/members/ModuleSidebar'
import LessonView    from '@/members/LessonView'
import type { Product, ProductModule, Lesson } from '@/lib/types'

export default function ProductViewer() {
  const { product_slug } = useParams<{ product_slug: string }>()
  const navigate = useNavigate()

  const [product,  setProduct]  = useState<Product | null>(null)
  const [modules,  setModules]  = useState<ProductModule[]>([])
  const [lesson,   setLesson]   = useState<Lesson | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    async function load() {
      // 1. Auth check
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      // 2. Load product
      const { data: prod, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('slug', product_slug!)
        .eq('status', 'published')
        .single()

      if (prodErr || !prod) { setForbidden(true); setLoading(false); return }

      // 3. Check access (RLS will also block the next query, but we give a nice error)
      const { data: access } = await supabase
        .from('user_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', prod.id)
        .single()

      if (!access) { setForbidden(true); setLoading(false); return }

      // 4. Load modules — RLS double-checks purchase server-side
      const { data: mods } = await supabase
        .from('product_structure')
        .select('*')
        .eq('product_id', prod.id)
        .order('order_index')

      setProduct(prod as Product)
      const sorted = (mods ?? []) as ProductModule[]
      setModules(sorted)

      // Auto-select first lesson
      const firstLesson = sorted[0]?.content_json?.lessons?.[0]
      if (firstLesson) setLesson(firstLesson)

      setLoading(false)
    }
    load()
  }, [product_slug, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-center px-6">
        <div>
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold text-white mb-3">Acesso Restrito</h1>
          <p className="text-slate-500 mb-8">Você não tem acesso a este produto.<br/>Complete a compra para liberar o conteúdo.</p>
          <Link to="/apply" className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors">
            Adquirir acesso
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
      {/* Top bar */}
      <header className="h-12 shrink-0 flex items-center gap-3 px-5 border-b border-slate-800 bg-slate-900">
        <Link to="/my-products" className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-sm font-semibold text-white truncate">{product?.name}</span>
        {lesson && (
          <>
            <span className="text-slate-700 text-xs">›</span>
            <span className="text-sm text-slate-400 truncate">{lesson.title}</span>
          </>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          modules={modules}
          activeLessonId={lesson?.id ?? null}
          onSelect={(l) => setLesson(l)}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto px-8 py-10">
          <LessonView lesson={lesson} />
        </main>
      </div>
    </div>
  )
}

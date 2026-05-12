import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { HeroBlock, FeaturesBlock, CallToActionBlock } from '@/blocks'
import type { LandingPage, PageBlock, HeroProps, FeaturesProps, CTAProps } from '@/lib/types'

// ── Block dispatcher — only loads what's in blocks_config ─────

function BlockRenderer({ block }: { block: PageBlock }) {
  switch (block.type) {
    case 'HeroBlock':
      return <HeroBlock data={block.props as HeroProps} />
    case 'FeaturesBlock':
      return <FeaturesBlock data={block.props as FeaturesProps} />
    case 'CallToActionBlock':
      return <CallToActionBlock data={block.props as CTAProps} />
    default:
      return null
  }
}

// ── Page ──────────────────────────────────────────────────────

export default function LandingPageRenderer() {
  const { slug } = useParams<{ slug: string }>()
  const [page,    setPage]    = useState<LandingPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    supabase
      .from('landing_pages')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true) }
        else { setPage(data as LandingPage) }
        setLoading(false)
      })
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="text-center">
          <p className="text-6xl font-bold text-zinc-700 mb-4">404</p>
          <p className="text-lg">Página não encontrada.</p>
        </div>
      </div>
    )
  }

  const blocks = [...(page.blocks_config?.blocks ?? [])].sort((a, b) => a.order - b.order)

  return (
    <main className="bg-zinc-950">
      {blocks.map(block => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </main>
  )
}

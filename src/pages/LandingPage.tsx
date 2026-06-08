import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { HeroBlock, FeaturesBlock, CallToActionBlock } from '@/blocks'
import type { LandingPage, PageBlock, HeroProps, FeaturesProps, CTAProps, GrapesJSConfig, BlocksConfig } from '@/lib/types'

// ── Block dispatcher ──────────────────────────────────────────

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

// ── GrapesJS renderer ─────────────────────────────────────────

function GrapesRenderer({ config }: { config: GrapesJSConfig }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: config.css }} />
      <div dangerouslySetInnerHTML={{ __html: config.html }} />
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function LandingPageRenderer() {
  const { slug } = useParams<{ slug: string }>()
  const [blocksConfig, setBlocksConfig] = useState<BlocksConfig | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [notFound,     setNotFound]     = useState(false)

  useEffect(() => {
    if (!slug) return

    async function resolve() {
      // 1. Try landing_pages table first
      const { data: lp } = await supabase
        .from('landing_pages')
        .select('blocks_config')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle()

      if (lp?.blocks_config) {
        setBlocksConfig(lp.blocks_config as BlocksConfig)
        setLoading(false)
        return
      }

      // 2. Fall back to products.landing_page_config
      const { data: product } = await supabase
        .from('products')
        .select('landing_page_config')
        .eq('slug', slug)
        .neq('status', 'archived')
        .maybeSingle()

      if (product?.landing_page_config) {
        setBlocksConfig(product.landing_page_config as BlocksConfig)
        setLoading(false)
        return
      }

      setNotFound(true)
      setLoading(false)
    }

    resolve()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (notFound || !blocksConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div className="text-center">
          <p className="text-6xl font-bold text-[#3F3F46] mb-4">404</p>
          <p className="text-[#71717A]">Página não encontrada.</p>
        </div>
      </div>
    )
  }

  // GrapesJS page — inject style + raw HTML
  if ('type' in blocksConfig && blocksConfig.type === 'grapesjs') {
    return <GrapesRenderer config={blocksConfig as GrapesJSConfig} />
  }

  // Legacy block-based page
  const blocks = [...((blocksConfig as { blocks: PageBlock[] })?.blocks ?? [])].sort(
    (a, b) => a.order - b.order,
  )

  return (
    <main style={{ background: '#0A0A0A' }}>
      {blocks.map(block => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </main>
  )
}

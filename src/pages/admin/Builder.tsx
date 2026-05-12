import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import { supabase } from '@/lib/supabase'
import BlockPalette from '@/builder/BlockPalette'
import BlockCanvas from '@/builder/BlockCanvas'
import BuilderHeader from '@/builder/BuilderHeader'
import type { PageBlock, BlockType, BlocksConfig } from '@/lib/types'

// ── Default props per block type ──────────────────────────────

function defaultProps(type: BlockType): PageBlock['props'] {
  switch (type) {
    case 'HeroBlock':
      return {
        title: 'Seu título impactante aqui',
        subtitle: 'Uma proposta de valor clara e persuasiva para o seu público.',
        backgroundImage: '',
        buttonText: 'Quero começar',
        buttonLink: '/apply',
      }
    case 'FeaturesBlock':
      return {
        headline: 'Por que escolher a Bridge?',
        features: [
          { icon: 'Zap',        title: 'Rápido',    description: 'Resultados em dias, não meses.' },
          { icon: 'Shield',     title: 'Seguro',     description: 'Infraestrutura enterprise robusta.' },
          { icon: 'TrendingUp', title: 'Escalável',  description: 'Cresce junto com o seu negócio.' },
        ],
      }
    case 'CallToActionBlock':
      return {
        title: 'Pronto para o próximo nível?',
        subtitle: 'Junte-se a centenas de empresas que já crescem com Bridge.',
        buttonText: 'Aplicar Agora',
        buttonLink: '/apply',
      }
  }
}

// ── Page ──────────────────────────────────────────────────────

export default function Builder() {
  const { id } = useParams<{ id?: string }>()
  const navigate  = useNavigate()

  const [title,     setTitle]     = useState('Nova Landing Page')
  const [slug,      setSlug]      = useState('')
  const [published, setPublished] = useState(false)
  const [blocks,    setBlocks]    = useState<PageBlock[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [pageId,    setPageId]    = useState<string | null>(id ?? null)

  // Load existing page
  useEffect(() => {
    if (!id) return
    supabase
      .from('landing_pages')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return
        setTitle(data.title)
        setSlug(data.slug)
        setPublished(data.published)
        const cfg = data.blocks_config as BlocksConfig
        setBlocks([...(cfg?.blocks ?? [])].sort((a, b) => a.order - b.order))
      })
  }, [id])

  const addBlock = useCallback((type: BlockType) => {
    const block: PageBlock = {
      id: uuid(),
      type,
      order: blocks.length,
      props: defaultProps(type),
    }
    setBlocks(prev => [...prev, block])
    setSelectedId(block.id)
  }, [blocks.length])

  async function handleSave() {
    if (!slug) { alert('Defina um slug para a página.'); return }
    setSaving(true)

    const blocksConfig: BlocksConfig = { blocks }

    if (pageId) {
      await supabase
        .from('landing_pages')
        .update({ title, slug, published, blocks_config: blocksConfig })
        .eq('id', pageId)
    } else {
      const { data, error } = await supabase
        .from('landing_pages')
        .insert({ title, slug, published, blocks_config: blocksConfig })
        .select('id')
        .single()
      if (!error && data) {
        setPageId(data.id)
        navigate(`/admin/builder/${data.id}`, { replace: true })
      }
    }

    setSaving(false)
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
      <BuilderHeader
        title={title}
        slug={slug}
        published={published}
        saving={saving}
        onSave={handleSave}
        onTogglePublish={() => setPublished(p => !p)}
        onTitleChange={setTitle}
        onSlugChange={setSlug}
      />

      <div className="flex flex-1 overflow-hidden">
        <BlockPalette onAdd={addBlock} />

        <BlockCanvas
          blocks={blocks}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChange={setBlocks}
        />
      </div>
    </div>
  )
}

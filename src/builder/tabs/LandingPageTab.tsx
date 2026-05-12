import { useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import BlockPalette from '@/builder/BlockPalette'
import BlockCanvas from '@/builder/BlockCanvas'
import type { BlocksConfig, BlockType, PageBlock, Product, HeroProps, FeaturesProps, CTAProps } from '@/lib/types'

function defaultProps(type: BlockType): PageBlock['props'] {
  switch (type) {
    case 'HeroBlock':
      return {
        title: 'Título impactante do produto',
        subtitle: 'Uma proposta de valor clara e direta.',
        backgroundImage: '',
        buttonText: 'Quero me inscrever',
        buttonLink: '/apply',
      } as HeroProps
    case 'FeaturesBlock':
      return {
        headline: 'O que você vai aprender',
        features: [
          { icon: 'Zap',        title: 'Resultado 1', description: 'Descrição do resultado.' },
          { icon: 'Shield',     title: 'Resultado 2', description: 'Descrição do resultado.' },
          { icon: 'TrendingUp', title: 'Resultado 3', description: 'Descrição do resultado.' },
        ],
      } as FeaturesProps
    case 'CallToActionBlock':
      return {
        title: 'Pronto para começar?',
        subtitle: 'Vagas limitadas. Garanta a sua agora.',
        buttonText: 'Quero minha vaga',
        buttonLink: '/apply',
      } as CTAProps
  }
}

interface Props {
  product: Product
  selectedBlockId: string | null
  onSelectBlock: (id: string) => void
  onChange: (patch: Partial<Product>) => void
  onSelectBlockChange: (id: string | null) => void
}

export default function LandingPageTab({ product, selectedBlockId, onChange, onSelectBlockChange }: Props) {
  const blocks = product.landing_page_config?.blocks ?? []

  const addBlock = useCallback((type: BlockType) => {
    const block: PageBlock = { id: uuid(), type, order: blocks.length, props: defaultProps(type) }
    onChange({ landing_page_config: { blocks: [...blocks, block] } })
    onSelectBlockChange(block.id)
  }, [blocks, onChange, onSelectBlockChange])

  function updateBlocks(updated: PageBlock[]) {
    onChange({ landing_page_config: { blocks: updated } as BlocksConfig })
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <BlockPalette onAdd={addBlock} />
      <BlockCanvas
        blocks={blocks}
        selectedId={selectedBlockId}
        onSelect={onSelectBlockChange}
        onChange={updateBlocks}
      />
    </div>
  )
}

import { useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import BlockPalette      from '@/builder/BlockPalette'
import BlockCanvas       from '@/builder/BlockCanvas'
import PropertiesPanel   from '@/builder/PropertiesPanel'
import type {
  BlocksConfig, BlockType, PageBlock, Product, BlockProps,
  HeroProps, FeaturesProps, CTAProps,
  HeadingProps, TextBlockProps, ImageBlockProps,
  ButtonBlockProps, AccordionBlockProps, VideoBlockProps, CarouselBlockProps,
} from '@/lib/types'

// ── Default props per block type ──────────────────────────────

function defaultProps(type: BlockType, productSlug?: string): PageBlock['props'] {
  switch (type) {
    case 'HeroBlock': return {
      title:           'Título impactante do produto',
      subtitle:        'Uma proposta de valor clara e direta.',
      backgroundImage: '',
      buttonText:      'Quero começar',
      buttonLink:      `/apply?product=${productSlug ?? ''}`,
    } as HeroProps

    case 'FeaturesBlock': return {
      headline: 'Por que escolher este produto',
      features: [
        { icon: 'Zap',        title: 'Resultado 1', description: 'Descreva o benefício aqui.' },
        { icon: 'Shield',     title: 'Resultado 2', description: 'Descreva o benefício aqui.' },
        { icon: 'TrendingUp', title: 'Resultado 3', description: 'Descreva o benefício aqui.' },
      ],
    } as FeaturesProps

    case 'CallToActionBlock': return {
      title:      'Pronto para começar?',
      subtitle:   'Vagas limitadas. Garanta a sua agora.',
      buttonText: 'Quero minha vaga',
      buttonLink: `/apply?product=${productSlug ?? ''}`,
    } as CTAProps

    case 'HeadingBlock': return {
      text:       'Seu título aqui',
      level:      'h2',
      fontSize:   '4xl',
      fontWeight: 'bold',
      style:      { align: 'center', color: '#EDEDED', paddingY: 48 },
    } as HeadingProps

    case 'TextBlock': return {
      text:     'Escreva seu texto aqui. Clique para editar.',
      fontSize: 'base',
      maxWidth: true,
      style:    { align: 'left', color: 'rgba(255,255,255,0.65)', paddingY: 24 },
    } as TextBlockProps

    case 'ImageBlock': return {
      src:    '',
      alt:    '',
      width:  'lg',
      radius: 12,
      shadow: true,
      style:  { paddingY: 32 },
    } as ImageBlockProps

    case 'ButtonBlock': return {
      label:       'Quero me inscrever',
      target:      'form',
      url:         `/apply?product=${productSlug ?? ''}`,
      productSlug: productSlug ?? '',
      variant:     'solid',
      size:        'lg',
      color:       '#E8521A',
      textColor:   '#ffffff',
      fullWidth:   false,
      style:       { align: 'center', paddingY: 32 },
    } as ButtonBlockProps

    case 'AccordionBlock': return {
      title: 'Perguntas frequentes',
      items: [
        { id: uuid(), question: 'Como funciona?',              answer: 'Resposta para a primeira pergunta.' },
        { id: uuid(), question: 'Para quem é indicado?',      answer: 'Resposta para a segunda pergunta.'  },
        { id: uuid(), question: 'Qual é o prazo de entrega?', answer: 'Resposta para a terceira pergunta.' },
      ],
      style: { paddingY: 64 },
    } as AccordionBlockProps

    case 'VideoBlock': return {
      url:     '',
      caption: '',
      style:   { paddingY: 48 },
    } as VideoBlockProps

    case 'CarouselBlock': return {
      slides:   [],
      autoplay: true,
      interval: 4,
      showDots: true,
      style:    { paddingY: 48 },
    } as CarouselBlockProps
  }
}

// ── Component ─────────────────────────────────────────────────

interface Props {
  product:             Product
  selectedBlockId:     string | null
  onSelectBlock:       (id: string) => void
  onChange:            (patch: Partial<Product>) => void
  onSelectBlockChange: (id: string | null) => void
}

export default function LandingPageTab({
  product, selectedBlockId, onChange, onSelectBlockChange,
}: Props) {
  const blocks = (product.landing_page_config as { blocks?: PageBlock[] })?.blocks ?? []
  const slug   = product.slug

  const addBlock = useCallback((type: BlockType) => {
    const block: PageBlock = {
      id:    uuid(),
      type,
      order: blocks.length,
      props: defaultProps(type, slug),
    }
    onChange({ landing_page_config: { blocks: [...blocks, block] } as BlocksConfig })
    onSelectBlockChange(block.id)
  }, [blocks, onChange, onSelectBlockChange, slug])

  function updateBlocks(updated: PageBlock[]) {
    onChange({ landing_page_config: { blocks: updated } as BlocksConfig })
  }

  function updateBlockProps(id: string, props: BlockProps) {
    updateBlocks(blocks.map(b => b.id === id ? { ...b, props } : b))
  }

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) ?? null

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <BlockPalette onAdd={addBlock} />
      <BlockCanvas
        blocks={blocks}
        selectedId={selectedBlockId}
        onSelect={onSelectBlockChange}
        onChange={updateBlocks}
      />
      <PropertiesPanel
        block={selectedBlock}
        onChange={updateBlockProps}
        productSlug={slug}
      />
    </div>
  )
}

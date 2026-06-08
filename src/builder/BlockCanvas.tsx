import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Layers } from 'lucide-react'
import {
  HeroBlock, FeaturesBlock, CallToActionBlock,
  HeadingBlock, TextBlock, ImageBlock, ButtonBlock,
  AccordionBlock, VideoBlock, CarouselBlock,
} from '@/blocks'
import type {
  PageBlock, BlockType, HeroProps, FeaturesProps, CTAProps,
  HeadingProps, TextBlockProps, ImageBlockProps, ButtonBlockProps,
  AccordionBlockProps, VideoBlockProps, CarouselBlockProps,
} from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Block dispatcher ──────────────────────────────────────────

export function BlockRenderer({
  block, editable, onEdit,
}: {
  block:     PageBlock
  editable?: boolean
  onEdit?:   (path: string, value: string) => void
}) {
  const p   = block.props
  const ed  = editable ?? false
  const upd = (f: string, v: string) => onEdit?.(f, v)

  switch (block.type as BlockType) {
    case 'HeroBlock':
      return <HeroBlock         data={p as HeroProps}         editable={ed} onEdit={upd} />
    case 'FeaturesBlock':
      return <FeaturesBlock     data={p as FeaturesProps}     editable={ed} onEdit={upd} />
    case 'CallToActionBlock':
      return <CallToActionBlock data={p as CTAProps}           editable={ed} onEdit={upd} />
    case 'HeadingBlock':
      return <HeadingBlock      data={p as HeadingProps}       editable={ed} onEdit={upd} />
    case 'TextBlock':
      return <TextBlock         data={p as TextBlockProps}     editable={ed} onEdit={upd} />
    case 'ImageBlock':
      return <ImageBlock        data={p as ImageBlockProps} />
    case 'ButtonBlock':
      return <ButtonBlock       data={p as ButtonBlockProps}   editable={ed} />
    case 'AccordionBlock':
      return <AccordionBlock    data={p as AccordionBlockProps} />
    case 'VideoBlock':
      return <VideoBlock        data={p as VideoBlockProps} />
    case 'CarouselBlock':
      return <CarouselBlock     data={p as CarouselBlockProps} />
    default:
      return null
  }
}

// ── Sortable wrapper ──────────────────────────────────────────

const BLOCK_LABELS: Record<string, string> = {
  HeroBlock: 'Hero', FeaturesBlock: 'Benefícios', CallToActionBlock: 'CTA',
  HeadingBlock: 'Título', TextBlock: 'Texto', ImageBlock: 'Imagem',
  ButtonBlock: 'Botão', AccordionBlock: 'Acordeão',
  VideoBlock: 'Vídeo', CarouselBlock: 'Carrossel',
}

function SortableBlock({
  block, selected, onSelect, onDelete, onEdit,
}: {
  block:    PageBlock
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onEdit:   (path: string, value: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      onClick={onSelect}
      className={cn(
        'relative group cursor-pointer ring-2 transition-all duration-150',
        selected ? 'ring-[#E8521A]' : 'ring-transparent hover:ring-[#E8521A]/30',
      )}
    >
      {/* Floating label + controls */}
      <div className={cn(
        'absolute top-2 left-2 z-20 flex items-center gap-1',
        'opacity-0 group-hover:opacity-100 transition-opacity',
        selected && 'opacity-100',
      )}>
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-white/70"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          {BLOCK_LABELS[block.type] ?? block.type}
        </span>
      </div>
      <div className={cn(
        'absolute top-2 right-2 z-20 flex items-center gap-1',
        'opacity-0 group-hover:opacity-100 transition-opacity',
        selected && 'opacity-100',
      )}>
        <button
          {...attributes} {...listeners}
          className="p-1.5 rounded-lg text-white/50 hover:text-white cursor-grab active:cursor-grabbing transition-colors"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1.5 rounded-lg text-red-400 hover:text-white transition-colors"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={e => { e.stopPropagation(); onDelete() }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <BlockRenderer block={block} editable onEdit={onEdit} />
    </div>
  )
}

// ── Canvas ────────────────────────────────────────────────────

interface Props {
  blocks:     PageBlock[]
  selectedId: string | null
  onSelect:   (id: string) => void
  onChange:   (blocks: PageBlock[]) => void
}

export default function BlockCanvas({ blocks, selectedId, onSelect, onChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = blocks.findIndex(b => b.id === active.id)
    const newIdx = blocks.findIndex(b => b.id === over.id)
    onChange(arrayMove(blocks, oldIdx, newIdx).map((b, i) => ({ ...b, order: i })))
  }

  function handleDelete(id: string) {
    onChange(blocks.filter(b => b.id !== id).map((b, i) => ({ ...b, order: i })))
  }

  function handleEdit(blockId: string, path: string, value: string) {
    onChange(blocks.map(b => {
      if (b.id !== blockId) return b
      const props = structuredClone(b.props) as unknown as Record<string, unknown>
      const keys  = path.split('.')
      let cur = props
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]] as Record<string, unknown>
      cur[keys[keys.length - 1]] = value
      return { ...b, props: props as unknown as typeof b.props }
    }))
  }

  if (blocks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0D0E12' }}>
        <div className="text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Layers className="w-6 h-6 text-white/15" />
          </div>
          <p className="text-[14px] font-medium text-white/30">Página vazia</p>
          <p className="text-[12px] text-white/15 mt-1">Clique em um bloco no painel esquerdo</p>
        </div>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto" style={{ background: '#0D0E12' }}>
          {blocks.map(block => (
            <SortableBlock
              key={block.id}
              block={block}
              selected={block.id === selectedId}
              onSelect={() => onSelect(block.id)}
              onDelete={() => handleDelete(block.id)}
              onEdit={(path, value) => handleEdit(block.id, path, value)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Layers } from 'lucide-react'
import { HeroBlock, FeaturesBlock, CallToActionBlock } from '@/blocks'
import type { PageBlock, BlockType, HeroProps, FeaturesProps, CTAProps } from '@/lib/types'
import { cn } from '@/lib/cn'

function SortableBlock({
  block, selected, onSelect, onDelete, onEdit,
}: {
  block: PageBlock
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onEdit: (path: string, value: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        'relative group cursor-pointer ring-2 transition-all duration-150',
        selected ? 'ring-violet-500' : 'ring-transparent hover:ring-violet-500/25',
      )}
    >
      {/* Floating controls */}
      <div className={cn(
        'absolute top-3 right-3 z-20 flex items-center gap-1',
        'opacity-0 group-hover:opacity-100 transition-opacity',
        selected && 'opacity-100',
      )}>
        <button
          {...attributes} {...listeners}
          className="p-1.5 rounded-lg bg-zinc-900/90 border border-white/8
                     text-zinc-400 hover:text-white cursor-grab active:cursor-grabbing
                     backdrop-blur-sm transition-colors"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1.5 rounded-lg bg-red-950/90 border border-red-800/40
                     text-red-400 hover:text-white backdrop-blur-sm transition-colors"
          onClick={e => { e.stopPropagation(); onDelete() }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <BlockRenderer block={block} editable onEdit={onEdit} />
    </div>
  )
}

function BlockRenderer({
  block, editable, onEdit,
}: {
  block: PageBlock
  editable?: boolean
  onEdit?: (path: string, value: string) => void
}) {
  switch (block.type as BlockType) {
    case 'HeroBlock':
      return <HeroBlock data={block.props as HeroProps} editable={editable} onEdit={(f, v) => onEdit?.(f, v)} />
    case 'FeaturesBlock':
      return <FeaturesBlock data={block.props as FeaturesProps} editable={editable} onEdit={(p, v) => onEdit?.(p, v)} />
    case 'CallToActionBlock':
      return <CallToActionBlock data={block.props as CTAProps} editable={editable} onEdit={(f, v) => onEdit?.(f, v)} />
    default:
      return null
  }
}

interface Props {
  blocks: PageBlock[]
  selectedId: string | null
  onSelect: (id: string) => void
  onChange: (blocks: PageBlock[]) => void
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
    onChange(
      blocks.map(b => {
        if (b.id !== blockId) return b
        const props = structuredClone(b.props) as Record<string, unknown>
        const keys = path.split('.')
        let cur = props as Record<string, unknown>
        for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]] as Record<string, unknown>
        cur[keys[keys.length - 1]] = value
        return { ...b, props: props as typeof b.props }
      }),
    )
  }

  if (blocks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-white/6
                          flex items-center justify-center mx-auto mb-5">
            <Layers className="w-7 h-7 text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-1">Página vazia</p>
          <p className="text-xs text-zinc-600">Arraste blocos do painel à esquerda</p>
        </div>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto bg-zinc-950">
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

export { BlockRenderer }

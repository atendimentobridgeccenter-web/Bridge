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
import { GripVertical, Trash2 } from 'lucide-react'
import { HeroBlock, FeaturesBlock, CallToActionBlock } from '@/blocks'
import type { PageBlock, BlockType, HeroProps, FeaturesProps, CTAProps } from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Sortable wrapper around each block ──────────────────────

function SortableBlock({
  block,
  selected,
  onSelect,
  onDelete,
  onEdit,
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
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        'relative group cursor-pointer rounded-2xl ring-2 transition-all',
        selected ? 'ring-violet-500' : 'ring-transparent hover:ring-violet-500/30',
      )}
    >
      {/* Drag handle + delete — visible on hover/select */}
      <div className={cn(
        'absolute top-3 right-3 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
        selected && 'opacity-100',
      )}>
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white cursor-grab active:cursor-grabbing"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          className="p-1.5 rounded-lg bg-red-900/80 text-red-400 hover:text-white"
          onClick={e => { e.stopPropagation(); onDelete() }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Block renderer */}
      <BlockRenderer block={block} editable onEdit={onEdit} />
    </div>
  )
}

// ── Dispatch to the right component ─────────────────────────

function BlockRenderer({
  block,
  editable,
  onEdit,
}: {
  block: PageBlock
  editable?: boolean
  onEdit?: (path: string, value: string) => void
}) {
  const makeHeroEdit = (field: string, value: string) => onEdit?.(field, value)
  const makeFeatEdit = (path: string, value: string) => onEdit?.(path, value)
  const makeCtaEdit  = (field: string, value: string) => onEdit?.(field, value)

  switch (block.type as BlockType) {
    case 'HeroBlock':
      return (
        <HeroBlock
          data={block.props as HeroProps}
          editable={editable}
          onEdit={(f, v) => makeHeroEdit(f, v)}
        />
      )
    case 'FeaturesBlock':
      return (
        <FeaturesBlock
          data={block.props as FeaturesProps}
          editable={editable}
          onEdit={(p, v) => makeFeatEdit(p, v)}
        />
      )
    case 'CallToActionBlock':
      return (
        <CallToActionBlock
          data={block.props as CTAProps}
          editable={editable}
          onEdit={(f, v) => makeCtaEdit(f, v)}
        />
      )
    default:
      return null
  }
}

// ── Canvas ────────────────────────────────────────────────────

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
    const reordered = arrayMove(blocks, oldIdx, newIdx).map((b, i) => ({ ...b, order: i }))
    onChange(reordered)
  }

  function handleDelete(id: string) {
    onChange(blocks.filter(b => b.id !== id).map((b, i) => ({ ...b, order: i })))
  }

  function handleEdit(blockId: string, path: string, value: string) {
    onChange(
      blocks.map(b => {
        if (b.id !== blockId) return b
        // deep-set by dot path, e.g. "features.0.title"
        const props = structuredClone(b.props) as Record<string, unknown>
        const keys = path.split('.')
        let cursor = props as Record<string, unknown>
        for (let i = 0; i < keys.length - 1; i++) {
          const k = keys[i]
          cursor = cursor[k] as Record<string, unknown>
        }
        cursor[keys[keys.length - 1]] = value
        return { ...b, props: props as typeof b.props }
      }),
    )
  }

  if (blocks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        <div className="text-center">
          <div className="text-6xl mb-4">🧱</div>
          <p className="text-lg font-medium text-slate-400">Página vazia</p>
          <p className="text-sm mt-1">Adicione blocos pelo painel à esquerda</p>
        </div>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto bg-slate-950">
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

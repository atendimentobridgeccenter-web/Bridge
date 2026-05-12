import { Image, LayoutGrid, Megaphone } from 'lucide-react'
import type { BlockType } from '@/lib/types'
import { cn } from '@/lib/cn'

const PALETTE_ITEMS: { type: BlockType; label: string; desc: string; icon: React.ReactNode }[] = [
  { type: 'HeroBlock',         label: 'Hero',    desc: 'Título + CTA principal',  icon: <Image className="w-4 h-4" /> },
  { type: 'FeaturesBlock',     label: 'Features', desc: 'Grade de benefícios',    icon: <LayoutGrid className="w-4 h-4" /> },
  { type: 'CallToActionBlock', label: 'CTA',     desc: 'Apelo forte com botão',   icon: <Megaphone className="w-4 h-4" /> },
]

interface Props {
  onAdd: (type: BlockType) => void
}

export default function BlockPalette({ onAdd }: Props) {
  return (
    <aside className="w-56 shrink-0 flex flex-col bg-zinc-900/60 border-r border-white/6 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Blocos</p>
      </div>
      <div className="flex flex-col gap-1.5 p-3 overflow-y-auto">
        {PALETTE_ITEMS.map(item => (
          <button
            key={item.type}
            onClick={() => onAdd(item.type)}
            className={cn(
              'group flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all duration-150',
              'border border-white/6 bg-zinc-800/30',
              'hover:bg-violet-500/10 hover:border-violet-500/30',
            )}
          >
            <span className="mt-0.5 text-zinc-500 group-hover:text-violet-400 transition-colors">
              {item.icon}
            </span>
            <span>
              <span className="block text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
                {item.label}
              </span>
              <span className="block text-[11px] text-zinc-600 mt-0.5">{item.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}

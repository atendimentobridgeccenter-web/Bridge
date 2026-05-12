import { Image, LayoutGrid, Megaphone } from 'lucide-react'
import type { BlockType } from '@/lib/types'

const PALETTE_ITEMS: { type: BlockType; label: string; desc: string; icon: React.ReactNode }[] = [
  { type: 'HeroBlock',         label: 'Hero',        desc: 'Título + CTA principal',       icon: <Image className="w-5 h-5" /> },
  { type: 'FeaturesBlock',     label: 'Features',    desc: 'Grade de 3 benefícios',         icon: <LayoutGrid className="w-5 h-5" /> },
  { type: 'CallToActionBlock', label: 'CTA',         desc: 'Apelo forte com botão',         icon: <Megaphone className="w-5 h-5" /> },
]

interface Props {
  onAdd: (type: BlockType) => void
}

export default function BlockPalette({ onAdd }: Props) {
  return (
    <aside className="w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="px-5 py-4 border-b border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Blocos</p>
      </div>
      <div className="p-4 flex flex-col gap-3 overflow-y-auto">
        {PALETTE_ITEMS.map(item => (
          <button
            key={item.type}
            onClick={() => onAdd(item.type)}
            className="group flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-violet-500/10 hover:border-violet-500/50 text-left transition-all"
          >
            <span className="mt-0.5 text-slate-400 group-hover:text-violet-400 transition-colors">
              {item.icon}
            </span>
            <span>
              <span className="block text-sm font-medium text-white">{item.label}</span>
              <span className="block text-xs text-slate-500 mt-0.5">{item.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}

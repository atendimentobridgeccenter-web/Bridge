import {
  Image, AlignLeft, Heading2, MousePointerClick,
  ChevronDown, Video, GalleryHorizontal,
  LayoutGrid, Megaphone, Layers,
} from 'lucide-react'
import type { BlockType } from '@/lib/types'

interface PaletteItem { type: BlockType; label: string; desc: string; icon: React.ReactNode }

const GROUPS: { label: string; items: PaletteItem[] }[] = [
  {
    label: 'Conteúdo',
    items: [
      { type: 'HeadingBlock',   label: 'Título',      desc: 'Heading H1–H4',            icon: <Heading2 className="w-3.5 h-3.5" /> },
      { type: 'TextBlock',      label: 'Texto',        desc: 'Parágrafo de texto',        icon: <AlignLeft className="w-3.5 h-3.5" /> },
      { type: 'ImageBlock',     label: 'Imagem',       desc: 'Foto ou ilustração',        icon: <Image className="w-3.5 h-3.5" /> },
      { type: 'VideoBlock',     label: 'Vídeo',        desc: 'YouTube, Vimeo ou MP4',     icon: <Video className="w-3.5 h-3.5" /> },
      { type: 'CarouselBlock',  label: 'Carrossel',    desc: 'Slides de imagens',         icon: <GalleryHorizontal className="w-3.5 h-3.5" /> },
    ],
  },
  {
    label: 'Interação',
    items: [
      { type: 'ButtonBlock',    label: 'Botão',        desc: 'CTA com destino configurável', icon: <MousePointerClick className="w-3.5 h-3.5" /> },
      { type: 'AccordionBlock', label: 'Acordeão',     desc: 'Perguntas e respostas',     icon: <ChevronDown className="w-3.5 h-3.5" /> },
    ],
  },
  {
    label: 'Seções prontas',
    items: [
      { type: 'HeroBlock',         label: 'Hero',      desc: 'Título + CTA principal',    icon: <Layers className="w-3.5 h-3.5" /> },
      { type: 'FeaturesBlock',     label: 'Benefícios', desc: 'Grade de destaques',       icon: <LayoutGrid className="w-3.5 h-3.5" /> },
      { type: 'CallToActionBlock', label: 'CTA',        desc: 'Chamada forte com botão',  icon: <Megaphone className="w-3.5 h-3.5" /> },
    ],
  },
]

interface Props { onAdd: (type: BlockType) => void }

export default function BlockPalette({ onAdd }: Props) {
  return (
    <aside
      className="w-52 shrink-0 flex flex-col overflow-hidden"
      style={{ background: '#13151A', borderRight: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25">Blocos</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {GROUPS.map(group => (
          <div key={group.label} className="mb-1">
            <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/20">
              {group.label}
            </p>
            <div className="px-2 flex flex-col gap-0.5">
              {group.items.map(item => (
                <button
                  key={item.type}
                  onClick={() => onAdd(item.type)}
                  className="group flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <span className="shrink-0 text-white/25 group-hover:text-[#E8521A] transition-colors">
                    {item.icon}
                  </span>
                  <span>
                    <span className="block text-[12px] font-medium text-white/55 group-hover:text-white/90 transition-colors leading-none">
                      {item.label}
                    </span>
                    <span className="block text-[10px] text-white/20 mt-0.5 leading-none">{item.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

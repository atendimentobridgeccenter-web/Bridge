import { ChevronDown, Video, FileText, Download, Lock, Play } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import type { ProductModule, Lesson } from '@/lib/types'

const TYPE_ICON = {
  video:    <Play     className="w-3.5 h-3.5" />,
  text:     <FileText className="w-3.5 h-3.5" />,
  download: <Download className="w-3.5 h-3.5" />,
}

interface Props {
  modules: ProductModule[]
  activeLessonId: string | null
  onSelect: (lesson: Lesson, moduleId: string) => void
}

export default function ModuleSidebar({ modules, activeLessonId, onSelect }: Props) {
  const [openMods, setOpenMods] = useState<Set<string>>(
    new Set(modules[0] ? [modules[0].id] : [])
  )

  function toggle(id: string) {
    setOpenMods(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Conteúdo</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {modules.map((mod, mi) => (
          <div key={mod.id}>
            {/* Module toggle */}
            <button
              onClick={() => toggle(mod.id)}
              className="w-full flex items-center gap-2.5 px-5 py-3 hover:bg-slate-900 transition-colors text-left"
            >
              <span className="w-5 h-5 rounded bg-violet-500/15 text-violet-400 text-xs flex items-center justify-center font-bold shrink-0">
                {mi + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-slate-300 truncate">{mod.title}</span>
              <ChevronDown className={cn(
                'w-3.5 h-3.5 text-slate-600 transition-transform shrink-0',
                openMods.has(mod.id) && 'rotate-180'
              )} />
            </button>

            {/* Lessons */}
            {openMods.has(mod.id) && (
              <div className="pb-2">
                {mod.content_json.lessons.map((lesson, li) => {
                  const isActive = lesson.id === activeLessonId
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => onSelect(lesson, mod.id)}
                      className={cn(
                        'w-full flex items-center gap-3 pl-12 pr-5 py-2.5 text-left transition-colors',
                        isActive
                          ? 'bg-violet-500/10 text-violet-300'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60',
                      )}
                    >
                      <span className={cn(
                        'shrink-0 transition-colors',
                        isActive ? 'text-violet-400' : 'text-slate-600',
                      )}>
                        {TYPE_ICON[lesson.type]}
                      </span>
                      <span className="flex-1 text-xs truncate">{lesson.title}</span>
                      {lesson.duration_min ? (
                        <span className="text-xs text-slate-600 shrink-0">{lesson.duration_min}m</span>
                      ) : null}
                    </button>
                  )
                })}
                {mod.content_json.lessons.length === 0 && (
                  <div className="pl-12 pr-5 py-2 text-xs text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> Sem aulas ainda
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}

import { ChevronDown, Play, FileText, Download } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import type { ProductModule, Lesson } from '@/lib/types'

const TYPE_ICON = {
  video:    <Play     className="w-3 h-3" />,
  text:     <FileText className="w-3 h-3" />,
  download: <Download className="w-3 h-3" />,
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

  const totalLessons = modules.reduce((n, m) => n + m.content_json.lessons.length, 0)

  return (
    <aside className="w-72 shrink-0 border-r border-white/6 bg-zinc-950 flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-white/6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Conteúdo</p>
        <p className="text-xs text-zinc-600 mt-0.5">{modules.length} módulos · {totalLessons} aulas</p>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {modules.map((mod, mi) => {
          const isOpen = openMods.has(mod.id)
          const lessons = mod.content_json.lessons

          return (
            <div key={mod.id}>
              {/* Module header */}
              <button
                onClick={() => toggle(mod.id)}
                className="w-full flex items-center gap-3 px-4 py-3
                           hover:bg-zinc-900/60 transition-colors text-left"
              >
                <span className="w-6 h-6 rounded-lg bg-zinc-800 text-violet-400
                                 text-xs flex items-center justify-center font-bold shrink-0">
                  {mi + 1}
                </span>
                <span className="flex-1 text-xs font-medium text-zinc-300 truncate leading-tight">
                  {mod.title}
                </span>
                <ChevronDown className={cn(
                  'w-3.5 h-3.5 text-zinc-600 transition-transform duration-200 shrink-0',
                  isOpen && 'rotate-180',
                )} />
              </button>

              {/* Lessons */}
              {isOpen && (
                <div className="pb-1">
                  {lessons.length === 0 ? (
                    <p className="pl-14 pr-4 py-2 text-[11px] text-zinc-700">Sem aulas ainda</p>
                  ) : (
                    lessons.map(lesson => {
                      const isActive = lesson.id === activeLessonId
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => onSelect(lesson, mod.id)}
                          className={cn(
                            'w-full flex items-center gap-2.5 pl-11 pr-4 py-2.5 text-left transition-colors',
                            isActive
                              ? 'bg-violet-500/8 text-violet-300'
                              : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/40',
                          )}
                        >
                          <span className={cn(
                            'shrink-0 transition-colors',
                            isActive ? 'text-violet-400' : 'text-zinc-700',
                          )}>
                            {TYPE_ICON[lesson.type]}
                          </span>
                          <span className="flex-1 text-[11px] truncate leading-tight">
                            {lesson.title}
                          </span>
                          {lesson.duration_min ? (
                            <span className="text-[11px] text-zinc-700 shrink-0 tabular-nums">
                              {lesson.duration_min}m
                            </span>
                          ) : null}
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

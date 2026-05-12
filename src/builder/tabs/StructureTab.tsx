import { useState, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import { Plus, Trash2, ChevronDown, Video, FileText, Download, GripVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { ProductModule, Lesson } from '@/lib/types'

const LESSON_ICONS = {
  video:    <Video    className="w-4 h-4" />,
  text:     <FileText className="w-4 h-4" />,
  download: <Download className="w-4 h-4" />,
}

interface Props {
  productId: string
}

export default function StructureTab({ productId }: Props) {
  const [modules,  setModules]  = useState<ProductModule[]>([])
  const [openMod,  setOpenMod]  = useState<string | null>(null)
  const [openLes,  setOpenLes]  = useState<string | null>(null)
  const [saving,   setSaving]   = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('product_structure')
      .select('*')
      .eq('product_id', productId)
      .order('order_index')
      .then(({ data }) => {
        setModules((data ?? []) as ProductModule[])
        if (data?.length) setOpenMod(data[0].id)
      })
  }, [productId])

  async function addModule() {
    const mod: Omit<ProductModule, 'created_at' | 'updated_at'> = {
      id:           uuid(),
      product_id:   productId,
      title:        'Novo Módulo',
      description:  '',
      content_json: { lessons: [] },
      order_index:  modules.length,
    }
    const { data, error } = await supabase
      .from('product_structure')
      .insert(mod)
      .select()
      .single()
    if (!error && data) {
      setModules(m => [...m, data as ProductModule])
      setOpenMod(data.id)
    }
  }

  async function updateModule(mod: ProductModule) {
    setSaving(mod.id)
    await supabase.from('product_structure').update({
      title:        mod.title,
      description:  mod.description,
      content_json: mod.content_json,
      order_index:  mod.order_index,
    }).eq('id', mod.id)
    setSaving(null)
  }

  function patchModule(id: string, patch: Partial<ProductModule>) {
    setModules(ms => ms.map(m => m.id === id ? { ...m, ...patch } : m))
  }

  function addLesson(modId: string) {
    const lesson: Lesson = {
      id: uuid(), title: 'Nova Aula', type: 'video',
      video_url: '', text_content: '', file_url: '',
      duration_min: 0, order: 0, free_preview: false,
    }
    setModules(ms => ms.map(m => {
      if (m.id !== modId) return m
      const lessons = [...(m.content_json.lessons ?? []), { ...lesson, order: m.content_json.lessons.length }]
      return { ...m, content_json: { lessons } }
    }))
    setOpenLes(lesson.id)
  }

  function patchLesson(modId: string, lessonId: string, patch: Partial<Lesson>) {
    setModules(ms => ms.map(m => {
      if (m.id !== modId) return m
      return {
        ...m,
        content_json: {
          lessons: m.content_json.lessons.map(l => l.id === lessonId ? { ...l, ...patch } : l)
        }
      }
    }))
  }

  function removeLesson(modId: string, lessonId: string) {
    setModules(ms => ms.map(m => {
      if (m.id !== modId) return m
      return { ...m, content_json: { lessons: m.content_json.lessons.filter(l => l.id !== lessonId) } }
    }))
  }

  async function deleteModule(id: string) {
    if (!confirm('Excluir este módulo e todas as aulas?')) return
    await supabase.from('product_structure').delete().eq('id', id)
    setModules(ms => ms.filter(m => m.id !== id))
  }

  return (
    <div className="max-w-2xl space-y-3">
      {modules.map((mod, mi) => (
        <div key={mod.id} className={cn(
          'rounded-2xl border transition-colors',
          openMod === mod.id ? 'border-violet-500/40 bg-slate-900' : 'border-slate-800 bg-slate-900/40',
        )}>
          {/* Module header */}
          <div className="flex items-center gap-2 p-4">
            <GripVertical className="w-4 h-4 text-slate-600 shrink-0" />
            <span className="w-6 h-6 rounded-lg bg-violet-500/15 text-violet-400 text-xs flex items-center justify-center font-bold shrink-0">
              {mi + 1}
            </span>
            <input
              value={mod.title}
              onChange={e => patchModule(mod.id, { title: e.target.value })}
              onBlur={() => updateModule(mod)}
              className="flex-1 bg-transparent text-white font-semibold text-sm outline-none"
            />
            {saving === mod.id && <span className="text-xs text-slate-600">salvando...</span>}
            <button onClick={() => deleteModule(mod.id)} className="p-1.5 text-red-400/40 hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setOpenMod(openMod === mod.id ? null : mod.id)}>
              <ChevronDown className={cn('w-4 h-4 text-slate-500 transition-transform', openMod === mod.id && 'rotate-180')} />
            </button>
          </div>

          {/* Module body: lessons */}
          {openMod === mod.id && (
            <div className="border-t border-slate-800 px-4 pb-4 pt-3 space-y-2">
              {mod.content_json.lessons.map(lesson => (
                <div key={lesson.id} className={cn(
                  'rounded-xl border p-3 transition-colors',
                  openLes === lesson.id ? 'border-slate-600 bg-slate-800/60' : 'border-slate-800 bg-slate-800/20',
                )}>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{LESSON_ICONS[lesson.type]}</span>
                    <input
                      value={lesson.title}
                      onChange={e => patchLesson(mod.id, lesson.id, { title: e.target.value })}
                      onBlur={() => updateModule(mod)}
                      className="flex-1 bg-transparent text-sm text-white outline-none"
                    />
                    <label className="flex items-center gap-1 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={lesson.free_preview ?? false}
                        onChange={e => { patchLesson(mod.id, lesson.id, { free_preview: e.target.checked }); updateModule(mod) }}
                        className="accent-violet-500"
                      />
                      Preview
                    </label>
                    <button onClick={() => setOpenLes(openLes === lesson.id ? null : lesson.id)}>
                      <ChevronDown className={cn('w-3.5 h-3.5 text-slate-600 transition-transform', openLes === lesson.id && 'rotate-180')} />
                    </button>
                    <button onClick={() => { removeLesson(mod.id, lesson.id); updateModule({ ...mod, content_json: { lessons: mod.content_json.lessons.filter(l => l.id !== lesson.id) } }) }}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400/40 hover:text-red-400" />
                    </button>
                  </div>

                  {openLes === lesson.id && (
                    <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
                      <select
                        value={lesson.type}
                        onChange={e => { patchLesson(mod.id, lesson.id, { type: e.target.value as Lesson['type'] }); updateModule(mod) }}
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="video">Vídeo</option>
                        <option value="text">Texto</option>
                        <option value="download">Download</option>
                      </select>

                      {lesson.type === 'video' && (
                        <input
                          value={lesson.video_url ?? ''}
                          onChange={e => patchLesson(mod.id, lesson.id, { video_url: e.target.value })}
                          onBlur={() => updateModule(mod)}
                          placeholder="URL do vídeo (YouTube, Vimeo, Panda...)"
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500 placeholder:text-slate-500"
                        />
                      )}
                      {lesson.type === 'text' && (
                        <textarea
                          value={lesson.text_content ?? ''}
                          onChange={e => patchLesson(mod.id, lesson.id, { text_content: e.target.value })}
                          onBlur={() => updateModule(mod)}
                          placeholder="Conteúdo em Markdown ou HTML..."
                          rows={4}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500 placeholder:text-slate-500 resize-none"
                        />
                      )}
                      {lesson.type === 'download' && (
                        <input
                          value={lesson.file_url ?? ''}
                          onChange={e => patchLesson(mod.id, lesson.id, { file_url: e.target.value })}
                          onBlur={() => updateModule(mod)}
                          placeholder="URL do arquivo"
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500 placeholder:text-slate-500"
                        />
                      )}
                      <input
                        type="number"
                        value={lesson.duration_min ?? 0}
                        onChange={e => patchLesson(mod.id, lesson.id, { duration_min: Number(e.target.value) })}
                        onBlur={() => updateModule(mod)}
                        placeholder="Duração (min)"
                        className="w-32 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500"
                      />
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => addLesson(mod.id)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-400 transition-colors pt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar aula
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addModule}
        className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:border-violet-500/50 hover:text-violet-400 text-sm transition-colors"
      >
        <Plus className="w-4 h-4" /> Adicionar módulo
      </button>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { STAGES, stageOf } from '@/lib/stageConfig'
import { useUpdateContactStage } from '@/hooks/useContactStage'
import type { Stage } from '@/lib/stageConfig'
import type { ContactStageRow } from '@/hooks/useContactStage'

interface Props {
  contactKey:   string
  currentStage: ContactStageRow | null | undefined
  compact?:     boolean   // smaller badge style for table rows
}

export default function StageSelector({ contactKey, currentStage, compact = false }: Props) {
  const [open,    setOpen]    = useState(false)
  const [note,    setNote]    = useState('')
  const [pending, setPending] = useState<Stage | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const mutation = useUpdateContactStage()

  const stage  = currentStage?.stage ?? 'novo'
  const def    = stageOf(stage)

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setNote(''); setPending(null)
      }
    }
    if (open) document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [open])

  async function apply(newStage: Stage) {
    if (newStage === stage) { setOpen(false); return }
    mutation.mutate({
      contactKey,
      stage:         newStage,
      previousStage: stage as Stage,
      note:          note.trim() || undefined,
    })
    setOpen(false); setNote(''); setPending(null)
  }

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'inline-flex items-center gap-1 font-medium transition-all rounded-lg',
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        )}
        style={{ background: def.bg, color: def.color, border: `1px solid ${def.border}` }}
      >
        {def.label}
        <ChevronDown className={cn('shrink-0 transition-transform', compact ? 'w-2.5 h-2.5' : 'w-3 h-3', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 top-full mt-1.5 rounded-xl overflow-hidden shadow-2xl"
          style={{
            minWidth: 200,
            background: '#16181F',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
            left: compact ? 0 : undefined,
          }}
        >
          {/* Stage options */}
          <div className="p-1.5 flex flex-col gap-0.5">
            {STAGES.map(s => (
              <button
                key={s.value}
                onClick={() => {
                  if (s.value === stage) { setOpen(false); return }
                  setPending(s.value as Stage)
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] font-medium transition-all text-left',
                  pending === s.value ? 'ring-1' : 'hover:bg-white/5',
                )}
                style={pending === s.value
                  ? { background: s.bg, color: s.color, ringColor: s.border }
                  : s.value === stage
                    ? { background: s.bg, color: s.color }
                    : { color: 'rgba(255,255,255,0.55)' }
                }
              >
                <span>{s.label}</span>
                {s.value === stage && <Check className="w-3 h-3 shrink-0" />}
              </button>
            ))}
          </div>

          {/* Note input — shown when a different stage is clicked */}
          {pending && pending !== stage && (
            <div className="px-3 pb-3 pt-1 flex flex-col gap-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Nota (opcional)</p>
              <input
                autoFocus
                value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') apply(pending) }}
                placeholder="Ex: ligou, pediu retorno..."
                className="w-full bg-[#0D0E12] text-[12px] text-[#EDEDED] placeholder:text-white/20 px-2.5 py-2 rounded-lg outline-none"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <button
                onClick={() => apply(pending)}
                disabled={mutation.isPending}
                className="w-full py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: stageOf(pending).bg,
                  color: stageOf(pending).color,
                  border: `1px solid ${stageOf(pending).border}`,
                  opacity: mutation.isPending ? 0.5 : 1,
                }}
              >
                {mutation.isPending ? 'Salvando…' : `Mover para ${stageOf(pending).label}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

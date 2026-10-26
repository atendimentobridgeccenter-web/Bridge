import { useState } from 'react'
import {
  X, Save, Loader2, AlertCircle, Sparkles, Users, UserCheck,
} from 'lucide-react'
import { useClasses, formatSchedule } from '@/hooks/useClasses'
import { useActivateEnrollment, useStudents } from '@/hooks/useStudents'
import type { Student } from '@/hooks/useStudents'
import { useRecommendedClass } from '@/hooks/useEvaluations'
import { BG_CARD, BG_INPUT, BORDER2, BORDER, ACCENT } from '@/lib/theme'

const inputCls = 'w-full px-3 py-2 rounded-xl text-[13px] text-ink placeholder:text-ink-faint outline-none transition-all'
const inputStyle = { background: BG_INPUT, border: `1px solid ${BORDER}` }
const selectCls = inputCls + ' appearance-none cursor-pointer'

function focusBorder(e: React.FocusEvent<HTMLElement>) {
  e.target.style.borderColor = 'rgba(232,82,26,0.45)'
}
function blurBorder(e: React.FocusEvent<HTMLElement>) {
  e.target.style.borderColor = BORDER
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="text-[10.5px] font-medium text-ink-mute">{children}</label>
}

export default function ActivateEnrollmentModal({ student, onClose }: {
  student: Student
  onClose: () => void
}) {
  const activate   = useActivateEnrollment()
  const allClasses = useClasses()
  const recommended = useRecommendedClass(student.lead_id)
  // Para contar vaga é preciso saber quantos ativos cada turma já tem; a lista
  // completa de alunos já está em cache por causa da página de matrículas.
  const students = useStudents()

  const [classId, setClassId] = useState('')
  const [fee, setFee]         = useState<number | ''>(student.monthly_fee ?? '')
  const [start, setStart]     = useState(student.start_date ?? new Date().toISOString().slice(0, 10))
  const [error, setError]     = useState<string | null>(null)
  const [touchedClass, setTouchedClass] = useState(false)

  const recClass = recommended.data?.recommended_class ?? null

  // A recomendação só preenche enquanto o usuário não escolheu nada: sobrescrever
  // uma escolha manual quando a consulta chega seria pior que não sugerir.
  const effectiveClassId = touchedClass ? classId : (classId || recClass?.id || '')

  const activeByClass = (() => {
    const map = new Map<string, number>()
    for (const s of students.data ?? []) {
      if (s.class_id && s.status === 'ativo') map.set(s.class_id, (map.get(s.class_id) ?? 0) + 1)
    }
    return map
  })()

  const options = (allClasses.data ?? []).filter(
    c => c.status === 'ativa' || c.id === effectiveClassId,
  )
  const chosen = options.find(c => c.id === effectiveClassId) ?? null
  const chosenOccupied = chosen ? (activeByClass.get(chosen.id) ?? 0) : 0
  const chosenFull = chosen?.capacity != null && chosenOccupied >= chosen.capacity

  async function submit() {
    setError(null)
    if (!effectiveClassId) {
      setError('Escolha a turma. Sem turma o aluno fica fora do controle de matrícula.')
      return
    }
    try {
      await activate.mutateAsync({
        id:          student.id,
        class_id:    effectiveClassId,
        monthly_fee: fee === '' ? null : Number(fee),
        start_date:  start || null,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível ativar.')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-5 py-8 overflow-y-auto">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[440px] rounded-2xl my-auto"
        style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>

        <div className="px-5 py-4 flex items-start justify-between gap-3" style={{ borderBottom: `1px solid ${BORDER2}` }}>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink flex items-center gap-2">
              <UserCheck className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
              Ativar matrícula
            </p>
            <p className="text-[11.5px] text-ink-mute mt-1 truncate">{student.student_name}</p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-ink-mute hover:text-ink hover:bg-tint/6 transition-all shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3.5">

          {/* Recomendação da avaliação */}
          {recClass && (
            <div className="rounded-xl px-3.5 py-3 flex flex-col gap-1.5"
              style={{ background: 'rgba(94,234,212,0.06)', border: '1px solid rgba(94,234,212,0.2)' }}>
              <p className="text-[11.5px] font-medium flex items-center gap-1.5" style={{ color: '#5EEAD4' }}>
                <Sparkles className="w-3 h-3 shrink-0" />
                A avaliação indicou {recClass.name}
              </p>
              <p className="text-[11px] text-ink-mute tabular-nums">
                {formatSchedule(recClass.sessions)}
                {recommended.data?.recommended_level && ` · nível ${recommended.data.recommended_level}`}
              </p>
              {recommended.data?.outcome_note && (
                <p className="text-[11px] text-ink-mute whitespace-pre-wrap">
                  {recommended.data.outcome_note}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Lbl>Turma</Lbl>
            <select className={selectCls} style={inputStyle}
              value={effectiveClassId}
              onChange={e => { setTouchedClass(true); setClassId(e.target.value) }}
              onFocus={focusBorder} onBlur={blurBorder}>
              <option value="">Escolher turma…</option>
              {options.map(c => {
                const occ  = activeByClass.get(c.id) ?? 0
                const full = c.capacity != null && occ >= c.capacity
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} — {formatSchedule(c.sessions)}
                    {c.capacity != null ? ` (${occ}/${c.capacity}${full ? ' lotada' : ''})` : ''}
                    {c.status === 'encerrada' ? ' — encerrada' : ''}
                  </option>
                )
              })}
            </select>
            {options.length === 0 && (
              <p className="text-[11px] text-ink-mute">
                Nenhuma turma ativa cadastrada — crie em Turmas antes de ativar.
              </p>
            )}
            {chosenFull && (
              <p className="text-[11px] flex items-start gap-1.5" style={{ color: '#FCD34D' }}>
                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                Esta turma já está na capacidade ({chosenOccupied}/{chosen?.capacity}).
                Dá para ativar de todo jeito, mas vale conferir.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Lbl>Mensalidade (¥)</Lbl>
              <input type="number" min={0} className={inputCls} style={inputStyle}
                value={fee}
                onChange={e => setFee(e.target.value === '' ? '' : Number(e.target.value))}
                onFocus={focusBorder} onBlur={blurBorder}
                placeholder="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Lbl>Início</Lbl>
              <input type="date" className={inputCls} style={inputStyle}
                value={start}
                onChange={e => setStart(e.target.value)}
                onFocus={focusBorder} onBlur={blurBorder} />
            </div>
          </div>

          <p className="text-[11px] text-ink-faint leading-relaxed flex items-start gap-1.5">
            <Users className="w-3 h-3 shrink-0 mt-0.5" />
            Ao ativar, o aluno passa a ocupar vaga na turma e aparece no portal do
            professor responsável.
          </p>
        </div>

        <div className="px-5 py-4 flex items-center gap-2 flex-wrap" style={{ borderTop: `1px solid ${BORDER2}` }}>
          {error && (
            <p className="text-[11px] flex items-start gap-1.5 w-full" style={{ color: '#F87171' }}>
              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" /> {error}
            </p>
          )}
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-[12.5px] font-medium text-ink-sub hover:text-ink hover:bg-tint/5 transition-all ml-auto">
            Cancelar
          </button>
          <button onClick={submit} disabled={activate.isPending}
            className="px-4 py-2 rounded-xl text-[12.5px] font-semibold flex items-center gap-2 transition-all disabled:opacity-40"
            style={{ background: ACCENT, color: '#fff' }}>
            {activate.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Save className="w-3.5 h-3.5" />}
            Ativar matrícula
          </button>
        </div>
      </div>
    </div>
  )
}

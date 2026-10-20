import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Clock, User, MapPin, Video, BookOpen, Users, Loader2,
  Plus, Save, Pencil, AlertCircle, GraduationCap, Phone,
} from 'lucide-react'
import { useMyClasses, useMyStudents } from '@/hooks/useTeacherPortal'
import type { PortalStudent } from '@/hooks/useTeacherPortal'
import { formatSchedule } from '@/hooks/useClasses'
import DeleteButton from '@/components/ui/DeleteButton'
import {
  useGrades, useCreateGrade, useUpdateGrade, useDeleteGrade,
} from '@/hooks/useGrades'
import type { Grade } from '@/hooks/useGrades'
import { useMyTeacherProfile } from '@/hooks/useTeacherPortal'

const BG_CARD  = '#13151A'
const BG_CARD2 = '#16181F'
const BG_INPUT = '#0D0E12'
const BORDER   = 'rgba(255,255,255,0.07)'
const BORDER2  = 'rgba(255,255,255,0.05)'
const ACCENT   = '#E8521A'

const STATUS: Record<string, { label: string; color: string }> = {
  rascunho:  { label: 'Rascunho',  color: '#FDBA74' },
  ativo:     { label: 'Ativo',     color: '#34D399' },
  trancado:  { label: 'Trancado',  color: '#FCD34D' },
  cancelado: { label: 'Cancelado', color: '#F87171' },
}

const inputCls = 'w-full px-3 py-2 rounded-xl text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none transition-all'
const inputStyle = { background: BG_INPUT, border: `1px solid ${BORDER}` }

function focusBorder(e: React.FocusEvent<HTMLElement>) {
  e.target.style.borderColor = 'rgba(232,82,26,0.45)'
}
function blurBorder(e: React.FocusEvent<HTMLElement>) {
  e.target.style.borderColor = BORDER
}

function fmtShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Lançamento de nota ────────────────────────────────────────

function GradeForm({ studentId, classId, teacherId, row, onClose }: {
  studentId: string; classId: string; teacherId: string | null
  row: Grade | null; onClose: () => void
}) {
  const create = useCreateGrade()
  const update = useUpdateGrade()

  const [form, setForm] = useState({
    title:       row?.title ?? '',
    score:       row?.score ?? ('' as number | ''),
    max_score:   row?.max_score ?? 100,
    assessed_on: row?.assessed_on ?? new Date().toISOString().slice(0, 10),
    note:        row?.note ?? '',
  })
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    if (!form.title.trim()) { setError('Dê um título à avaliação.'); return }
    // assessed_on é NOT NULL no banco: se o campo for apagado, o normalizador
    // manda null e o insert falha com erro cru. Melhor barrar aqui.
    if (!form.assessed_on) { setError('Informe a data da avaliação.'); return }
    if (form.score !== '' && form.max_score && Number(form.score) > Number(form.max_score)) {
      setError('A nota não pode ser maior que o valor máximo.')
      return
    }
    // class_id é obrigatório no lançamento: é por ele que a RLS confere se a
    // turma é de quem está lançando.
    const patch = {
      title:       form.title.trim(),
      score:       form.score === '' ? null : Number(form.score),
      max_score:   form.max_score || null,
      assessed_on: form.assessed_on,
      note:        form.note.trim() || null,
      class_id:    classId,
      teacher_id:  teacherId,
    }
    try {
      if (row) await update.mutateAsync({ id: row.id, patch })
      else     await create.mutateAsync({ ...patch, student_id: studentId, title: patch.title })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <div className="rounded-xl p-3.5 flex flex-col gap-2.5"
      style={{ background: BG_CARD2, border: `1px solid ${BORDER}` }}>
      <input className={inputCls} style={inputStyle}
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        onFocus={focusBorder} onBlur={blurBorder}
        placeholder="Ex: Simulado N3 — Leitura" />
      <div className="grid grid-cols-3 gap-2.5">
        <input type="number" step="0.01" className={inputCls} style={inputStyle}
          value={form.score}
          onChange={e => setForm(f => ({ ...f, score: e.target.value === '' ? '' : Number(e.target.value) }))}
          onFocus={focusBorder} onBlur={blurBorder} placeholder="Nota" />
        <input type="number" step="0.01" className={inputCls} style={inputStyle}
          value={form.max_score ?? ''}
          onChange={e => setForm(f => ({ ...f, max_score: e.target.value ? Number(e.target.value) : 0 }))}
          onFocus={focusBorder} onBlur={blurBorder} placeholder="Máx." />
        <input type="date" className={inputCls} style={inputStyle}
          value={form.assessed_on}
          onChange={e => setForm(f => ({ ...f, assessed_on: e.target.value }))}
          onFocus={focusBorder} onBlur={blurBorder} />
      </div>
      <textarea className={inputCls + ' resize-none'} style={{ ...inputStyle, minHeight: 52 }}
        value={form.note}
        onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
        onFocus={focusBorder} onBlur={blurBorder}
        placeholder="Observação sobre o desempenho…" />
      <div className="flex items-center gap-2">
        {error && (
          <p className="text-[11px] flex items-center gap-1 mr-auto" style={{ color: '#F87171' }}>
            <AlertCircle className="w-3 h-3 shrink-0" /> {error}
          </p>
        )}
        <button onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-[11.5px] font-medium text-white/45 hover:text-white/80 hover:bg-white/5 transition-all ml-auto">
          Cancelar
        </button>
        <button onClick={save} disabled={saving}
          className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
          style={{ background: ACCENT, color: '#fff' }}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          {row ? 'Salvar' : 'Lançar'}
        </button>
      </div>
    </div>
  )
}

// ── Aluno expansível ──────────────────────────────────────────

function StudentPanel({ student, classId, teacherId }: {
  student: PortalStudent; classId: string; teacherId: string | null
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<{ row: Grade | null } | null>(null)
  const grades = useGrades(open ? student.id : undefined)
  const del = useDeleteGrade()

  const st = STATUS[student.status] ?? STATUS.ativo
  const rows = grades.data ?? []

  const avg = useMemo(() => {
    const scored = rows.filter(g => g.score != null && g.max_score)
    if (scored.length === 0) return null
    return Math.round(scored.reduce((a, g) => a + (g.score! / g.max_score!) * 100, 0) / scored.length)
  }, [rows])

  return (
    <div style={{ borderBottom: `1px solid ${BORDER2}` }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors">
        <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0 text-[11px] font-semibold"
          style={{ background: 'rgba(232,82,26,0.1)', color: ACCENT }}>
          {student.student_name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-[#EDEDED] truncate">{student.student_name}</p>
          <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
            {student.responsible_name && (
              <span className="text-[10.5px] text-white/25 truncate">{student.responsible_name}</span>
            )}
            {student.phone_responsible && (
              <span className="text-[10.5px] text-white/25 flex items-center gap-1 tabular-nums">
                <Phone className="w-2.5 h-2.5" /> {student.phone_responsible}
              </span>
            )}
            <span className="text-[10.5px] text-white/20 tabular-nums">
              desde {fmtShort(student.start_date)}
            </span>
          </div>
        </div>
        {avg != null && (
          <span className="text-[12px] font-semibold tabular-nums shrink-0"
            style={{ color: avg >= 70 ? '#34D399' : avg >= 50 ? '#FCD34D' : '#F87171' }}>
            {avg}%
          </span>
        )}
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: `${st.color}14`, color: st.color, border: `1px solid ${st.color}2E` }}>
          {st.label}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-2.5" style={{ background: BG_CARD2 }}>
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25">Notas</p>
            {!form && (
              <button onClick={() => setForm({ row: null })}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all"
                style={{ background: 'rgba(232,82,26,0.12)', color: ACCENT, border: '1px solid rgba(232,82,26,0.22)' }}>
                <Plus className="w-3 h-3" /> Lançar nota
              </button>
            )}
          </div>

          {form && (
            <GradeForm
              key={form.row?.id ?? 'nova'}
              studentId={student.id} classId={classId} teacherId={teacherId}
              row={form.row} onClose={() => setForm(null)} />
          )}

          {grades.isLoading ? (
            <div className="py-4 flex justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-white/20" />
            </div>
          ) : rows.length === 0 && !form ? (
            <p className="text-[11.5px] text-white/25 py-2">Nenhuma nota lançada.</p>
          ) : (
            rows.map(g => {
              const pct = g.score != null && g.max_score ? (g.score / g.max_score) * 100 : null
              const tone = pct == null ? '#9CA3AF' : pct >= 70 ? '#34D399' : pct >= 50 ? '#FCD34D' : '#F87171'
              return (
                <div key={g.id} className="group rounded-lg px-3 py-2.5 flex items-start gap-3"
                  style={{ background: BG_CARD, border: `1px solid ${BORDER2}` }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-[#EDEDED] truncate">{g.title}</p>
                    <p className="text-[10.5px] text-white/25 tabular-nums mt-0.5">{fmtShort(g.assessed_on)}</p>
                    {g.note && <p className="text-[11px] text-white/40 mt-1 whitespace-pre-wrap">{g.note}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-semibold tabular-nums" style={{ color: tone }}>
                      {g.score ?? '—'}
                      {g.max_score != null && <span className="text-[10px] text-white/25"> / {g.max_score}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setForm({ row: g })} title="Editar"
                      className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/6 transition-all">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <DeleteButton onConfirm={() => del.mutate(g.id)} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────

export default function ProfessorClassPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const classes  = useMyClasses()
  const students = useMyStudents()
  const profile  = useMyTeacherProfile()

  const row = (classes.data ?? []).find(c => c.id === id) ?? null
  const rows = useMemo(
    () => (students.data ?? []).filter(s => s.class_id === id),
    [students.data, id],
  )

  if (classes.isLoading || students.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-white/20" />
      </div>
    )
  }

  // Turma que não é do professor simplesmente não volta da consulta: a RLS a
  // filtrou. Não há como distinguir "não existe" de "não é sua", e está certo.
  if (!row) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle className="w-9 h-9 text-white/10" />
        <p className="text-[13px] text-white/35">Turma não encontrada entre as suas</p>
        <button onClick={() => navigate('/professor')}
          className="text-[12px] px-3 py-1.5 rounded-lg transition-all"
          style={{ background: BG_CARD, border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.55)' }}>
          Voltar
        </button>
      </div>
    )
  }

  const active = rows.filter(s => s.status === 'ativo')

  return (
    <div className="flex flex-col gap-5 max-w-[900px] mx-auto">
      <button onClick={() => navigate('/professor')}
        className="flex items-center gap-1.5 text-[12px] text-white/35 hover:text-white/70 transition-colors w-fit">
        <ArrowLeft className="w-3.5 h-3.5" /> Minhas turmas
      </button>

      <div>
        <h1 className="text-[19px] font-semibold text-[#EDEDED]">{row.name}</h1>
        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          <span className="text-[12px] text-white/45 flex items-center gap-1.5 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-white/25" /> {formatSchedule(row.sessions)}
          </span>
          <span className="text-[12px] text-white/45 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-white/25" /> {row.teacher?.name ?? '—'}
          </span>
          {(row.modality || row.unit) && (
            <span className="text-[12px] text-white/45 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-white/25" />
              {[row.modality === 'online' ? 'Online' : row.modality === 'presencial' ? 'Presencial' : null, row.unit]
                .filter(Boolean).join(' · ')}
            </span>
          )}
          <span className="text-[12px] text-white/45 flex items-center gap-1.5 tabular-nums">
            <Users className="w-3.5 h-3.5 text-white/25" />
            {active.length}{row.capacity != null && <span className="text-white/25">/{row.capacity}</span>}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          {row.meet_link && (
            <a href={row.meet_link} target="_blank" rel="noreferrer"
              className="text-[11.5px] flex items-center gap-1.5 transition-opacity hover:opacity-75"
              style={{ color: ACCENT }}>
              <Video className="w-3 h-3" /> Entrar no Meet
            </a>
          )}
          {row.classroom_link && (
            <a href={row.classroom_link} target="_blank" rel="noreferrer"
              className="text-[11.5px] flex items-center gap-1.5 transition-opacity hover:opacity-75"
              style={{ color: ACCENT }}>
              <BookOpen className="w-3 h-3" /> Abrir Classroom
            </a>
          )}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${BORDER2}` }}>
          <GraduationCap className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          <p className="text-[12px] font-semibold text-[#EDEDED]">Alunos</p>
          <p className="text-[11px] text-white/25">· clique para ver e lançar notas</p>
        </div>

        {rows.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2">
            <Users className="w-7 h-7 text-white/8" />
            <p className="text-[12.5px] text-white/30">Nenhum aluno nesta turma</p>
          </div>
        ) : (
          rows.map(s => (
            <StudentPanel key={s.id} student={s} classId={row.id}
              teacherId={profile.data?.id ?? null} />
          ))
        )}
      </div>
    </div>
  )
}

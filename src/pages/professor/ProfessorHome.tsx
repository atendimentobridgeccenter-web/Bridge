import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, Clock, Users, MapPin, Video, BookOpen, Loader2,
  ChevronRight, Sparkles,
} from 'lucide-react'
import { useMyClasses, useMyStudents } from '@/hooks/useTeacherPortal'
import { WEEKDAYS, formatSchedule } from '@/hooks/useClasses'
import type { ClassRow } from '@/hooks/useClasses'
import type { PortalStudent } from '@/hooks/useTeacherPortal'

const BG_CARD  = '#13151A'
const BG_CARD2 = '#16181F'
const BORDER   = 'rgba(255,255,255,0.07)'
const BORDER2  = 'rgba(255,255,255,0.05)'
const ACCENT   = '#E8521A'

const SUBJECT_LABEL: Record<string, string> = {
  jlpt: 'JLPT', refesco: 'Reforço Escolar', ingles: 'Inglês',
}

// Aluno cadastrado nos últimos 14 dias conta como novo na turma — é o aviso de
// "chegou gente nova" que o professor precisa ver ao abrir o portal.
const NOVO_POR_DIAS = 14

function isRecent(iso: string | null): boolean {
  if (!iso) return false
  const diff = Date.now() - new Date(iso).getTime()
  return diff >= 0 && diff < NOVO_POR_DIAS * 24 * 60 * 60 * 1000
}

export default function ProfessorHome() {
  const navigate = useNavigate()
  const classes  = useMyClasses()
  const students = useMyStudents()

  const activeByClass = useMemo(() => {
    const map = new Map<string, PortalStudent[]>()
    for (const s of students.data ?? []) {
      if (!s.class_id || s.status !== 'ativo') continue
      const list = map.get(s.class_id) ?? []
      list.push(s)
      map.set(s.class_id, list)
    }
    return map
  }, [students.data])

  const newcomers = useMemo(
    () => (students.data ?? []).filter(s => s.status === 'ativo' && isRecent(s.start_date)),
    [students.data],
  )

  const rows = (classes.data ?? []).filter(c => c.status === 'ativa')
  const ended = (classes.data ?? []).filter(c => c.status === 'encerrada')

  const loading = classes.isLoading || students.isLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-white/20" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 max-w-[1100px] mx-auto">

      <div>
        <h1 className="text-[20px] font-semibold text-[#EDEDED] flex items-center gap-2">
          <CalendarDays className="w-5 h-5" style={{ color: ACCENT }} />
          Minhas turmas
        </h1>
        <p className="text-[12.5px] text-white/35 mt-1">
          {rows.length === 0
            ? 'Nenhuma turma ativa atribuída a você.'
            : `${rows.length} turma${rows.length !== 1 ? 's' : ''} ativa${rows.length !== 1 ? 's' : ''} · ${
                Array.from(activeByClass.values()).reduce((a, l) => a + l.length, 0)
              } aluno${Array.from(activeByClass.values()).reduce((a, l) => a + l.length, 0) !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Alunos novos */}
      {newcomers.length > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-start gap-3"
          style={{ background: 'rgba(94,234,212,0.06)', border: '1px solid rgba(94,234,212,0.2)' }}>
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#5EEAD4' }} />
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium" style={{ color: '#5EEAD4' }}>
              {newcomers.length} aluno{newcomers.length !== 1 ? 's' : ''} novo
              {newcomers.length !== 1 ? 's' : ''} nos últimos {NOVO_POR_DIAS} dias
            </p>
            <p className="text-[11.5px] text-white/40 mt-0.5">
              {newcomers.map(s => s.student_name).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {rows.length === 0 && ended.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CalendarDays className="w-10 h-10 text-white/8" />
          <p className="text-[13px] text-white/30">Nenhuma turma atribuída</p>
          <p className="text-[12px] text-white/20 max-w-[320px] text-center">
            Quando a secretaria atribuir uma turma a você, ela aparece aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {rows.map(c => (
            <ClassCard key={c.id} row={c}
              students={activeByClass.get(c.id) ?? []}
              onOpen={() => navigate(`/professor/turmas/${c.id}`)} />
          ))}
        </div>
      )}

      {ended.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25">
            Turmas encerradas
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {ended.map(c => (
              <ClassCard key={c.id} row={c}
                students={activeByClass.get(c.id) ?? []}
                onOpen={() => navigate(`/professor/turmas/${c.id}`)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ClassCard({ row, students, onOpen }: {
  row: ClassRow; students: PortalStudent[]; onOpen: () => void
}) {
  const ended = row.status === 'encerrada'
  // Uma turma pode ter vários encontros; a etiqueta mostra os dias da semana.
  const days = row.sessions.flatMap(s => {
    const d = WEEKDAYS.find(w => w.value === s.weekday)
    return d ? [d.short] : []
  })
  return (
    <button onClick={onOpen}
      className="group rounded-2xl overflow-hidden text-left transition-all hover:border-white/15"
      style={{ background: BG_CARD, border: `1px solid ${BORDER}`, opacity: ended ? 0.6 : 1 }}>

      <div className="px-4 py-3.5 flex items-start gap-3" style={{ borderBottom: `1px solid ${BORDER2}` }}>
        {days.length > 0 && (
          <div className="shrink-0 rounded-xl py-1.5 px-2 text-center"
            style={{ background: 'rgba(232,82,26,0.1)' }}>
            <p className="text-[10px] font-semibold uppercase whitespace-nowrap" style={{ color: ACCENT }}>
              {days.join(' · ')}
            </p>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-[#EDEDED] truncate">{row.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {row.subject && (
              <span className="text-[11px] text-white/40">{SUBJECT_LABEL[row.subject] ?? row.subject}</span>
            )}
            {row.jlpt_level && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                {row.jlpt_level}
              </span>
            )}
            {ended && <span className="text-[10px] text-white/25">encerrada</span>}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-white/15 shrink-0 mt-1 group-hover:text-white/40 transition-colors" />
      </div>

      <div className="px-4 py-3 flex items-center gap-4 flex-wrap" style={{ background: BG_CARD2 }}>
        <span className="text-[12px] text-white/55 flex items-center gap-1.5 tabular-nums">
          <Clock className="w-3.5 h-3.5 text-white/25" /> {formatSchedule(row.sessions)}
        </span>
        {(row.modality || row.unit) && (
          <span className="text-[12px] text-white/55 flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-white/25 shrink-0" />
            <span className="truncate">
              {[row.modality === 'online' ? 'Online' : row.modality === 'presencial' ? 'Presencial' : null, row.unit]
                .filter(Boolean).join(' · ')}
            </span>
          </span>
        )}
        {row.meet_link && (
          <span onClick={e => { e.stopPropagation(); window.open(row.meet_link!, '_blank') }}
            className="text-[11.5px] text-white/35 hover:text-white/70 flex items-center gap-1 transition-colors">
            <Video className="w-3 h-3" /> Meet
          </span>
        )}
        {row.classroom_link && (
          <span onClick={e => { e.stopPropagation(); window.open(row.classroom_link!, '_blank') }}
            className="text-[11.5px] text-white/35 hover:text-white/70 flex items-center gap-1 transition-colors">
            <BookOpen className="w-3 h-3" /> Classroom
          </span>
        )}
        <span className="ml-auto text-[12px] font-medium text-white/50 flex items-center gap-1.5 tabular-nums">
          <Users className="w-3.5 h-3.5 text-white/25" />
          {students.length}
          {row.capacity != null && <span className="text-white/25">/{row.capacity}</span>}
        </span>
      </div>
    </button>
  )
}

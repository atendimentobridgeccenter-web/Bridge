import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Search, X, Loader2, Phone, Mail, CalendarDays, ChevronRight } from 'lucide-react'
import { useMyClasses, useMyStudents } from '@/hooks/useTeacherPortal'
import { formatSchedule } from '@/hooks/useClasses'
import { BG_CARD, BORDER2, BORDER, ACCENT } from '@/lib/theme'

const STATUS: Record<string, { label: string; color: string }> = {
  rascunho:  { label: 'Rascunho',  color: '#FDBA74' },
  ativo:     { label: 'Ativo',     color: '#34D399' },
  trancado:  { label: 'Trancado',  color: '#FCD34D' },
  cancelado: { label: 'Cancelado', color: '#F87171' },
}

const SUBJECT_LABEL: Record<string, string> = {
  jlpt: 'JLPT', refesco: 'Reforço Escolar', ingles: 'Inglês',
}

export default function ProfessorStudentsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [onlyActive, setOnlyActive] = useState(true)

  const classes  = useMyClasses()
  const students = useMyStudents()

  const classById = useMemo(() => {
    const map = new Map<string, { name: string; schedule: string }>()
    for (const c of classes.data ?? []) {
      map.set(c.id, { name: c.name, schedule: formatSchedule(c.sessions) })
    }
    return map
  }, [classes.data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (students.data ?? []).filter(s => {
      if (onlyActive && s.status !== 'ativo') return false
      if (!q) return true
      const turma = s.class_id ? classById.get(s.class_id)?.name ?? '' : ''
      return [s.student_name, s.responsible_name ?? '', s.email ?? '', turma]
        .join(' ').toLowerCase().includes(q)
        || (s.phone_responsible ?? '').includes(q)
    })
  }, [students.data, search, onlyActive, classById])

  if (classes.isLoading || students.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-ink-faint" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 max-w-[900px] mx-auto">
      <div>
        <h1 className="text-[20px] font-semibold text-ink flex items-center gap-2">
          <Users className="w-5 h-5" style={{ color: ACCENT }} />
          Meus alunos
        </h1>
        <p className="text-[12.5px] text-ink-mute mt-1">
          Todos os alunos das turmas sob sua responsabilidade.
        </p>
      </div>

      <div className="rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap"
        style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-ink-faint shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar aluno, responsável, turma…"
            className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-faint outline-none min-w-0" />
          {search && (
            <button onClick={() => setSearch('')} className="text-ink-faint hover:text-ink-sub transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button onClick={() => setOnlyActive(a => !a)}
          className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-all"
          style={onlyActive
            ? { background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.22)' }
            : { background: 'transparent', color: 'rgba(var(--tint), 0.35)', border: `1px solid ${BORDER}` }}>
          Só ativos
        </button>
        <span className="text-[11.5px] text-ink-faint tabular-nums">
          {filtered.length} aluno{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Users className="w-10 h-10 text-ink-ghost" />
          <p className="text-[13px] text-ink-mute">
            {search || !onlyActive ? 'Nenhum aluno encontrado' : 'Nenhum aluno ativo nas suas turmas'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
          {filtered.map((s, i) => {
            const st = STATUS[s.status] ?? STATUS.ativo
            const turma = s.class_id ? classById.get(s.class_id) : null
            return (
              <button key={s.id}
                onClick={() => s.class_id && navigate(`/professor/turmas/${s.class_id}`)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
                style={i === 0 ? undefined : { borderTop: `1px solid ${BORDER2}` }}>
                <div className="w-8 h-8 rounded-xl grid place-items-center shrink-0 text-[12px] font-semibold"
                  style={{ background: 'rgba(232,82,26,0.1)', color: ACCENT }}>
                  {s.student_name.trim().charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-ink truncate">{s.student_name}</p>
                  <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                    {s.responsible_name && (
                      <span className="text-[10.5px] text-ink-faint truncate">{s.responsible_name}</span>
                    )}
                    {s.phone_responsible && (
                      <span className="text-[10.5px] text-ink-faint flex items-center gap-1 tabular-nums">
                        <Phone className="w-2.5 h-2.5" /> {s.phone_responsible}
                      </span>
                    )}
                    {s.email && (
                      <span className="text-[10.5px] text-ink-faint flex items-center gap-1 truncate">
                        <Mail className="w-2.5 h-2.5 shrink-0" /> {s.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="hidden sm:block text-right shrink-0 min-w-0">
                  {turma && (
                    <>
                      <p className="text-[11.5px] text-ink-sub truncate max-w-[170px]">{turma.name}</p>
                      <p className="text-[10.5px] text-ink-faint tabular-nums flex items-center gap-1 justify-end">
                        <CalendarDays className="w-2.5 h-2.5" /> {turma.schedule}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {s.subject && (
                    <span className="hidden md:inline text-[10.5px] text-ink-mute">
                      {SUBJECT_LABEL[s.subject] ?? s.subject}
                      {s.jlpt_level ? ` ${s.jlpt_level}` : ''}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${st.color}14`, color: st.color, border: `1px solid ${st.color}2E` }}>
                    {st.label}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-ink-ghost" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

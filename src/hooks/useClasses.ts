import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { StudentSubject, JlptLevel, Modality } from './useStudents'

export type ClassStatus = 'ativa' | 'encerrada'

export interface ClassSession {
  id:         string
  weekday:    number
  time_start: string | null
  time_end:   string | null
}

// Um encontro ainda sem id, como existe no formulário antes de salvar.
export type SessionDraft = Omit<ClassSession, 'id'> & { id?: string }

export interface ClassRow {
  id:             string
  name:           string
  subject:        StudentSubject | null
  jlpt_level:     JlptLevel | null
  teacher_id:     string | null
  product_id:     string | null
  modality:       Modality | null
  unit:           string | null
  meet_link:      string | null
  classroom_link: string | null
  capacity:       number | null
  school_year:    string | null
  notes:          string | null
  status:         ClassStatus
  created_at:     string
  updated_at:     string
  teacher:        { id: string; name: string } | null
  product:        { id: string; name: string } | null
  sessions:       ClassSession[]
}

export type ClassPatch = Partial<
  Omit<ClassRow, 'id' | 'created_at' | 'updated_at' | 'teacher' | 'product' | 'sessions'>
>

// ── Display helpers ───────────────────────────────────────────

export const WEEKDAYS = [
  { value: 0, label: 'Domingo',  short: 'Dom' },
  { value: 1, label: 'Segunda',  short: 'Seg' },
  { value: 2, label: 'Terça',    short: 'Ter' },
  { value: 3, label: 'Quarta',   short: 'Qua' },
  { value: 4, label: 'Quinta',   short: 'Qui' },
  { value: 5, label: 'Sexta',    short: 'Sex' },
  { value: 6, label: 'Sábado',   short: 'Sáb' },
] as const

function hhmm(time: string | null): string {
  return time ? time.slice(0, 5) : ''
}

function hours(s: Pick<ClassSession, 'time_start' | 'time_end'>): string {
  const a = hhmm(s.time_start)
  const b = hhmm(s.time_end)
  return a && b ? `${a}–${b}` : a
}

export function sortSessions<T extends Pick<ClassSession, 'weekday' | 'time_start'>>(list: T[]): T[] {
  return [...list].sort(
    (a, b) => a.weekday - b.weekday || (a.time_start ?? '').localeCompare(b.time_start ?? ''),
  )
}

/**
 * Horário da turma a partir dos encontros semanais.
 *
 * Encontros no mesmo horário são agrupados ("Seg, Qua · 19:00–20:30") em vez de
 * repetidos, porque esse é o caso comum — turma de duas aulas na semana no mesmo
 * horário — e listar duas vezes o mesmo intervalo só ocupa espaço.
 */
export function formatSchedule(sessions: ClassSession[] | null | undefined): string {
  if (!sessions || sessions.length === 0) return '—'

  const ordered = sortSessions(sessions)
  const groups = new Map<string, number[]>()
  for (const s of ordered) {
    const key = hours(s)
    groups.set(key, [...(groups.get(key) ?? []), s.weekday])
  }

  return Array.from(groups.entries())
    .map(([hrs, days]) => {
      const names = days
        .map(d => WEEKDAYS.find(w => w.value === d)?.short ?? '')
        .filter(Boolean)
        .join(', ')
      return [names, hrs].filter(Boolean).join(' · ')
    })
    .join('  |  ')
}

export const CLASS_SELECT = `*,
  teacher:teachers(id, name),
  product:products(id, name),
  sessions:class_sessions(id, weekday, time_start, time_end)`

function normalize(rows: unknown[]): ClassRow[] {
  return (rows as ClassRow[]).map(c => ({ ...c, sessions: sortSessions(c.sessions ?? []) }))
}

// ── List ──────────────────────────────────────────────────────

export function useClasses(status?: ClassStatus | null) {
  return useQuery<ClassRow[]>({
    queryKey: ['classes', status ?? 'all'],
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase.from('classes').select(CLASS_SELECT).order('name', { ascending: true })
      if (status) q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return normalize(data ?? [])
    },
  })
}

// ── Produtos (para vincular a turma) ──────────────────────────

export function useProductsForClasses() {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['products-for-classes'],
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .order('name', { ascending: true })
      if (error) throw error
      return (data ?? []) as { id: string; name: string }[]
    },
  })
}

// ── Sessões ───────────────────────────────────────────────────

/**
 * Substitui os encontros de uma turma pelo conjunto informado.
 *
 * Apaga e reinsere em vez de calcular o diff: são poucas linhas por turma, e
 * um diff errado deixaria encontro fantasma na grade. As notas não dependem de
 * class_sessions.id, então recriar não perde histórico.
 */
async function replaceSessions(classId: string, sessions: SessionDraft[]) {
  const { error: delErr } = await supabase
    .from('class_sessions')
    .delete()
    .eq('class_id', classId)
  if (delErr) throw delErr

  const rows = sessions
    .filter(s => s.weekday != null)
    .map(s => ({
      class_id:   classId,
      weekday:    s.weekday,
      time_start: s.time_start || null,
      time_end:   s.time_end   || null,
    }))

  if (rows.length === 0) return
  const { error: insErr } = await supabase.from('class_sessions').insert(rows)
  if (insErr) throw insErr
}

// ── Create / Update / Delete ──────────────────────────────────

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['classes'] })
  qc.invalidateQueries({ queryKey: ['my-classes'] })
  // A ficha do aluno lê horário, professor e links da turma.
  qc.invalidateQueries({ queryKey: ['students'] })
  qc.invalidateQueries({ queryKey: ['student'] })
}

export function useCreateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ patch, sessions }: {
      patch: ClassPatch & { name: string }
      sessions: SessionDraft[]
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('classes')
        .insert({ ...patch, created_by: user?.id ?? null })
        .select('id')
        .single()
      if (error) throw error
      await replaceSessions(data.id, sessions)
      return data.id as string
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch, sessions }: {
      id: string
      patch: ClassPatch
      sessions?: SessionDraft[]
    }) => {
      const { error } = await supabase.from('classes').update(patch).eq('id', id)
      if (error) throw error
      if (sessions) await replaceSessions(id, sessions)
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // class_sessions tem CASCADE; students.class_id tem SET NULL.
      const { error } = await supabase.from('classes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(qc),
  })
}

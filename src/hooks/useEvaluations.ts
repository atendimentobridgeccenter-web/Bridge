import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { emptyToNull } from '@/lib/emptyToNull'
import type { JlptLevel } from './useStudents'

export type EvaluationStatus = 'agendada' | 'realizada' | 'cancelada' | 'nao_compareceu'

export interface Evaluation {
  id:                    string
  contact_key:           string
  lead_id:               string | null
  scheduled_at:          string | null
  duration_minutes:      number | null
  specialist_teacher_id: string | null
  meet_link:             string | null
  status:                EvaluationStatus
  outcome_note:          string | null
  recommended_class_id:  string | null
  recommended_level:     JlptLevel | null
  calendar_event_id:     string | null
  meet_generated_at:     string | null
  created_at:            string
  updated_at:            string
  specialist:            { id: string; name: string } | null
  recommended_class:     {
    id: string; name: string; capacity: number | null
    sessions: { id: string; weekday: number; time_start: string | null; time_end: string | null }[]
  } | null
}

export type EvaluationPatch = Partial<
  Omit<Evaluation, 'id' | 'created_at' | 'updated_at' | 'specialist' | 'recommended_class'>
>

const SELECT = `*,
  specialist:teachers(id, name),
  recommended_class:classes(id, name, capacity, sessions:class_sessions(id, weekday, time_start, time_end))`

export const EVALUATION_STATUS: Record<EvaluationStatus, { label: string; color: string }> = {
  agendada:       { label: 'Agendada',        color: '#7DD3FC' },
  realizada:      { label: 'Realizada',       color: '#5EEAD4' },
  cancelada:      { label: 'Cancelada',       color: '#9CA3AF' },
  nao_compareceu: { label: 'Não compareceu',  color: '#F87171' },
}

// ── Por contato ───────────────────────────────────────────────

export function useEvaluations(contactKey: string | undefined) {
  return useQuery<Evaluation[]>({
    queryKey: ['evaluations', contactKey],
    enabled:  !!contactKey,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select(SELECT)
        .eq('contact_key', contactKey!)
        .order('scheduled_at', { ascending: false, nullsFirst: false })
      if (error) throw error
      return (data ?? []) as Evaluation[]
    },
  })
}

// ── Agenda do time (avaliações marcadas, da mais próxima em diante) ──

export function useUpcomingEvaluations() {
  return useQuery<Evaluation[]>({
    queryKey: ['evaluations', 'upcoming'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select(SELECT)
        .eq('status', 'agendada')
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Evaluation[]
    },
  })
}

/**
 * Turma que a avaliação recomendou para este lead, se houver.
 *
 * Busca por lead_id e não por contact_key: é FK direta, não casamento de texto.
 * Serve para a ativação da matrícula já abrir com a turma que o especialista
 * indicou — sem isso a recomendação morre registrada e ninguém a usa.
 */
export interface RecommendedClass {
  recommended_class_id: string | null
  recommended_level:    JlptLevel | null
  outcome_note:         string | null
  scheduled_at:         string | null
  recommended_class: {
    id: string; name: string; capacity: number | null; status: 'ativa' | 'encerrada'
    sessions: { id: string; weekday: number; time_start: string | null; time_end: string | null }[]
  } | null
}

export function useRecommendedClass(leadId: string | null | undefined) {
  return useQuery<RecommendedClass | null>({
    queryKey: ['recommended-class', leadId],
    enabled:  !!leadId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select(`recommended_class_id, recommended_level, outcome_note, scheduled_at,
                 recommended_class:classes(id, name, capacity, status, sessions:class_sessions(id, weekday, time_start, time_end))`)
        .eq('lead_id', leadId!)
        .not('recommended_class_id', 'is', null)
        .order('scheduled_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (!data) return null

      // O cliente sem tipos gerados infere o embed to-one como array, enquanto o
      // PostgREST devolve objeto. Normalizar aqui evita um cast duplo por
      // `unknown` e funciona com qualquer uma das duas formas.
      const embed = data.recommended_class as unknown
      const cls = (Array.isArray(embed) ? embed[0] : embed) as RecommendedClass['recommended_class']

      return {
        recommended_class_id: data.recommended_class_id,
        recommended_level:    data.recommended_level,
        outcome_note:         data.outcome_note,
        scheduled_at:         data.scheduled_at,
        recommended_class:    cls ?? null,
      }
    },
  })
}

// ── Mutations ─────────────────────────────────────────────────

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['evaluations'] })
}

export function useCreateEvaluation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: EvaluationPatch & { contact_key: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('evaluations')
        .insert({ ...emptyToNull(patch), created_by: user?.id ?? null })
        .select(SELECT)
        .single()
      if (error) throw error
      return data as Evaluation
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateEvaluation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: EvaluationPatch }) => {
      const { error } = await supabase.from('evaluations').update(emptyToNull(patch)).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(qc),
  })
}

/**
 * Gera (ou reagenda) o evento no Google Calendar com link do Meet.
 *
 * Só o id da avaliação é enviado: data, duração e convidados são lidos no
 * servidor, para o cliente não escolher para quem o convite vai.
 */
export function useGenerateMeetLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (evaluationId: string) => {
      const { data, error } = await supabase.functions.invoke<{
        meetLink: string | null
        eventId?: string
        htmlLink?: string
        warning?: string
      }>('create-meet-event', { body: { evaluationId } })

      if (error) throw error
      if (!data) throw new Error('A função não retornou resposta.')
      return data
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteEvaluation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('evaluations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      invalidate(qc)
      qc.invalidateQueries({ queryKey: ['follow-ups'] })
    },
  })
}

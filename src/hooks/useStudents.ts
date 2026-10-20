import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { emptyToNull } from '@/lib/emptyToNull'

// ── Types ─────────────────────────────────────────────────────

export type StudentStatus   = 'rascunho' | 'ativo' | 'trancado' | 'cancelado'
export type StudentSubject  = 'jlpt' | 'refesco' | 'ingles'
export type JlptLevel       = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
export type PaymentMethod   = 'deposito' | 'dinheiro' | 'stripe'
export type CancelReason    = 'financeiro' | 'horario' | 'mudanca' | 'desistencia' | 'nao_identificado' | 'outro'
export type Modality        = 'presencial' | 'online'

export interface Student {
  id:                string
  student_name:      string
  responsible_name:  string | null
  birth_date:        string | null
  phone_responsible: string | null
  phone_student:     string | null
  email:             string | null
  address:           string | null
  start_date:        string | null
  subject:           StudentSubject | null
  jlpt_level:        JlptLevel | null
  school_year:       string | null
  pocket_id:         string | null
  class_schedule:    string | null
  teacher:           string | null
  modality:          Modality | null
  unit:              string | null
  meet_link:         string | null
  classroom_link:    string | null
  monthly_fee:       number | null
  payment_method:    PaymentMethod | null
  deposit_name:      string | null
  discount_notes:    string | null
  notes:             string | null
  status:            StudentStatus
  lock_start:        string | null
  lock_end:          string | null
  cancel_date:       string | null
  cancel_reason:     CancelReason | null
  termo_url:         string | null
  lead_id:           string | null
  class_id:          string | null
  created_at:        string
  updated_at:        string
  // Turma vinculada, trazida por join. Horário, professor e links são lidos
  // daqui — os campos de texto class_schedule/teacher ficaram para trás.
  class:             StudentClass | null
  // Inscrição de origem. É daqui que sai a confirmação de pagamento: quem pagou
  // está registrado no lead, não na ficha.
  lead:              StudentLead | null
}

export type LeadPaymentStatus = 'none' | 'pending' | 'confirmed'

export interface StudentLead {
  id:             string
  payment_status: LeadPaymentStatus
  paid_at:        string | null
  created_at:     string
}

// A ficha na página de histórico traz também a origem da inscrição, que a
// listagem não precisa carregar.
export interface StudentDetail extends Student {
  lead: (StudentLead & {
    email:        string | null
    phone:        string | null
    utm_source:   string | null
    utm_campaign: string | null
  }) | null
}

export interface StudentClass {
  id:             string
  name:           string
  sessions:       { id: string; weekday: number; time_start: string | null; time_end: string | null }[]
  modality:       Modality | null
  unit:           string | null
  meet_link:      string | null
  classroom_link: string | null
  capacity:       number | null
  teacher:        { id: string; name: string } | null
}

export type StudentPatch = Partial<
  Omit<Student, 'id' | 'created_at' | 'updated_at' | 'class' | 'lead'>
>

// ── List ──────────────────────────────────────────────────────

export function useStudents(status?: StudentStatus | null) {
  return useQuery<Student[]>({
    queryKey: ['students', status ?? 'all'],
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from('students')
        .select(`*, class:classes(
          id, name, modality, unit, meet_link, classroom_link, capacity,
          teacher:teachers(id, name),
          sessions:class_sessions(id, weekday, time_start, time_end)
        ), lead:leads(id, payment_status, paid_at, created_at)`)
        .order('student_name', { ascending: true })
      if (status) q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Student[]
    },
  })
}

// ── Single (página de histórico) ───────────────────────────────

export function useStudent(id: string | undefined) {
  return useQuery<StudentDetail>({
    queryKey: ['student', id],
    enabled:  !!id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`*, class:classes(
          id, name, modality, unit, meet_link, classroom_link, capacity,
          teacher:teachers(id, name),
          sessions:class_sessions(id, weekday, time_start, time_end)
        ), lead:leads(
          id, payment_status, paid_at, created_at,
          email, phone, utm_source, utm_campaign
        )`)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as StudentDetail
    },
  })
}

// ── Create ────────────────────────────────────────────────────

export function useCreateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: StudentPatch & { student_name: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('students')
        .insert({ ...emptyToNull(patch), created_by: user?.id ?? null })
        .select()
        .single()
      if (error) throw error
      return data as Student
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

// ── Update ────────────────────────────────────────────────────

export function useUpdateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: StudentPatch }) => {
      const { error } = await supabase
        .from('students')
        .update(emptyToNull(patch))
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

// ── Ativar matrícula ──────────────────────────────────────────

/**
 * Promove um rascunho a aluno ativo.
 *
 * Existe separado de useUpdateStudent porque é uma transição de estado com
 * requisito próprio: sem turma o aluno ativo não ocupa vaga em lugar nenhum e
 * desaparece do controle de matrícula, então class_id é obrigatório aqui — e
 * não é na edição comum da ficha.
 */
export function useActivateEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id:          string
      class_id:    string
      monthly_fee: number | null
      start_date:  string | null
    }) => {
      const { error } = await supabase
        .from('students')
        .update({
          status:      'ativo',
          class_id:    input.class_id,
          monthly_fee: input.monthly_fee,
          start_date:  input.start_date,
        })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['student'] })
      // A ocupação das turmas é derivada da contagem de alunos ativos, então
      // ativar alguém muda o número de vagas exibido.
      qc.invalidateQueries({ queryKey: ['classes'] })
    },
  })
}

// ── Delete ────────────────────────────────────────────────────

export function useDeleteStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────

export type StudentStatus   = 'ativo' | 'trancado' | 'cancelado'
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
  discount_notes:    string | null
  notes:             string | null
  status:            StudentStatus
  lock_start:        string | null
  lock_end:          string | null
  cancel_date:       string | null
  cancel_reason:     CancelReason | null
  termo_url:         string | null
  created_at:        string
  updated_at:        string
}

export type StudentPatch = Partial<Omit<Student, 'id' | 'created_at' | 'updated_at'>>

// ── List ──────────────────────────────────────────────────────

export function useStudents(status?: StudentStatus | null) {
  return useQuery<Student[]>({
    queryKey: ['students', status ?? 'all'],
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from('students')
        .select('*')
        .order('student_name', { ascending: true })
      if (status) q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Student[]
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
        .insert({ ...patch, created_by: user?.id ?? null })
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
        .update(patch)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { emptyToNull } from '@/lib/emptyToNull'

export interface Grade {
  id:          string
  student_id:  string
  class_id:    string | null
  teacher_id:  string | null
  title:       string
  score:       number | null
  max_score:   number | null
  assessed_on: string
  note:        string | null
  created_at:  string
  updated_at:  string
  teacher:     { id: string; name: string } | null
  class:       { id: string; name: string } | null
}

export type GradePatch = Partial<
  Omit<Grade, 'id' | 'created_at' | 'updated_at' | 'teacher' | 'class'>
>

const SELECT = '*, teacher:teachers(id, name), class:classes(id, name)'

export function useGrades(studentId: string | undefined) {
  return useQuery<Grade[]>({
    queryKey: ['grades', studentId],
    enabled:  !!studentId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grades')
        .select(SELECT)
        .eq('student_id', studentId!)
        .order('assessed_on', { ascending: false })
      if (error) throw error
      return (data ?? []) as Grade[]
    },
  })
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['grades'] })
}

export function useCreateGrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: GradePatch & { student_id: string; title: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('grades')
        .insert({ ...emptyToNull(patch), created_by: user?.id ?? null })
        .select(SELECT)
        .single()
      if (error) throw error
      return data as Grade
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateGrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: GradePatch }) => {
      const { error } = await supabase.from('grades').update(emptyToNull(patch)).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteGrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('grades').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(qc),
  })
}


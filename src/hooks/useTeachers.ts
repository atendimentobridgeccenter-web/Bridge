import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { emptyToNull } from '@/lib/emptyToNull'

export type TeacherStatus = 'ativo' | 'inativo'

export interface Teacher {
  id:           string
  name:         string
  email:        string | null
  phone:        string | null
  notes:        string | null
  status:       TeacherStatus
  // Conta de acesso ao portal. Nulo significa professor cadastrado mas sem
  // login — as políticas de RLS não liberam nada até este campo ser preenchido.
  auth_user_id: string | null
  created_at:   string
  updated_at:   string
}

export type TeacherPatch = Partial<Omit<Teacher, 'id' | 'created_at' | 'updated_at'>>

export function useTeachers(status?: TeacherStatus | null) {
  return useQuery<Teacher[]>({
    queryKey: ['teachers', status ?? 'all'],
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase.from('teachers').select('*').order('name', { ascending: true })
      if (status) q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Teacher[]
    },
  })
}

export function useCreateTeacher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: TeacherPatch & { name: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('teachers')
        .insert({ ...emptyToNull(patch), created_by: user?.id ?? null })
        .select()
        .single()
      if (error) throw error
      return data as Teacher
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }) },
  })
}

export function useUpdateTeacher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TeacherPatch }) => {
      const { error } = await supabase.from('teachers').update(emptyToNull(patch)).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] })
      qc.invalidateQueries({ queryKey: ['classes'] })
    },
  })
}

/**
 * Cria a conta de acesso ao portal e vincula à ficha do professor.
 *
 * Passa pela Edge Function porque definir app_metadata.role exige service_role,
 * que não pode ir para o frontend. E não existe auto-cadastro: quem concede
 * acesso é o administrador — do contrário qualquer pessoa se registraria como
 * professor e veria alunos.
 */
export function useProvisionTeacherAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { teacherId: string; email: string; password?: string }) => {
      const { data, error } = await supabase.functions.invoke<{
        userId?: string
        email?: string
        reused?: boolean
        message?: string
        warning?: string
        error?: string
      }>('provision-teacher-access', { body: input })

      if (error) throw error
      if (!data) throw new Error('A função não retornou resposta.')
      if (data.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }) },
  })
}

// Professor com turma vinculada não é removido: a FK em classes.teacher_id usa
// SET NULL, então a turma ficaria sem responsável silenciosamente. Inativar
// preserva o histórico e tira o professor das listas de seleção.
export function useDeleteTeacher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('teachers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] })
      qc.invalidateQueries({ queryKey: ['classes'] })
    },
  })
}

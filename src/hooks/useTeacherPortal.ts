import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CLASS_SELECT, sortSessions } from './useClasses'
import type { ClassRow } from './useClasses'
import type { Student } from './useStudents'

/**
 * Dados do professor logado.
 *
 * Nenhuma destas consultas filtra por professor: quem filtra é a RLS, pela
 * função current_teacher_id(). Se a sessão não estiver vinculada a um professor
 * ativo, as consultas voltam vazias — negado por omissão, sem depender de o
 * frontend lembrar de passar o filtro certo.
 */

export function useMyTeacherProfile() {
  return useQuery({
    queryKey: ['my-teacher'],
    staleTime: 60_000,
    queryFn: async () => {
      // limit(1) antes de maybeSingle não é redundância: para o professor a RLS
      // já devolve uma linha só, mas um admin abrindo o portal vê todos os
      // professores, e maybeSingle lança erro com mais de uma linha.
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name, email, phone, status')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useMyClasses() {
  return useQuery<ClassRow[]>({
    queryKey: ['my-classes'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select(CLASS_SELECT)
        .order('name', { ascending: true })
      if (error) throw error
      return ((data ?? []) as ClassRow[]).map(c => ({ ...c, sessions: sortSessions(c.sessions ?? []) }))
    },
  })
}

// Alunos das turmas do professor. A ficha vem sem dados financeiros: a RLS
// libera a linha inteira, então a seleção de colunas é o que mantém mensalidade
// e nome de depósito fora do portal.
export type PortalStudent = Pick<
  Student,
  'id' | 'student_name' | 'responsible_name' | 'status' | 'class_id'
  | 'subject' | 'jlpt_level' | 'school_year' | 'start_date'
  | 'phone_responsible' | 'email'
>

export function useMyStudents() {
  return useQuery<PortalStudent[]>({
    queryKey: ['my-students'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`id, student_name, responsible_name, status, class_id,
                 subject, jlpt_level, school_year, start_date,
                 phone_responsible, email`)
        .order('student_name', { ascending: true })
      if (error) throw error
      return (data ?? []) as PortalStudent[]
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { emptyToNull } from '@/lib/emptyToNull'

export type FollowUpChannel = 'whatsapp' | 'ligacao' | 'email' | 'presencial' | 'outro'

export interface FollowUp {
  id:            string
  contact_key:   string
  evaluation_id: string | null
  seq:           number
  due_at:        string | null
  done_at:       string | null
  channel:       FollowUpChannel | null
  note:          string | null
  created_at:    string
  updated_at:    string
}

export type FollowUpPatch = Partial<Omit<FollowUp, 'id' | 'created_at' | 'updated_at'>>

export const FOLLOW_UP_CHANNEL: Record<FollowUpChannel, string> = {
  whatsapp:   'WhatsApp',
  ligacao:    'Ligação',
  email:      'E-mail',
  presencial: 'Presencial',
  outro:      'Outro',
}

export function useFollowUps(contactKey: string | undefined) {
  return useQuery<FollowUp[]>({
    queryKey: ['follow-ups', contactKey],
    enabled:  !!contactKey,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('contact_key', contactKey!)
        .order('seq', { ascending: true })
      if (error) throw error
      return (data ?? []) as FollowUp[]
    },
  })
}

// Pendências de todo o time, da mais atrasada em diante.
export function usePendingFollowUps() {
  return useQuery<FollowUp[]>({
    queryKey: ['follow-ups', 'pending'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*')
        .is('done_at', null)
        .not('due_at', 'is', null)
        .order('due_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as FollowUp[]
    },
  })
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['follow-ups'] })
}

export function useCreateFollowUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: FollowUpPatch & { contact_key: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('follow_ups')
        .insert({ ...emptyToNull(patch), created_by: user?.id ?? null })
        .select()
        .single()
      if (error) throw error
      return data as FollowUp
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateFollowUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: FollowUpPatch }) => {
      const { error } = await supabase.from('follow_ups').update(emptyToNull(patch)).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteFollowUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('follow_ups').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(qc),
  })
}

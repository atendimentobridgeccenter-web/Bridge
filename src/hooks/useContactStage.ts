import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Stage } from '@/lib/stageConfig'

// ── Types ─────────────────────────────────────────────────────

export interface ContactStageRow {
  contact_key: string
  stage:       Stage
  note:        string | null
  updated_at:  string
}

export interface StageHistoryRow {
  id:             string
  contact_key:    string
  stage:          Stage
  previous_stage: Stage | null
  note:           string | null
  changed_at:     string
}

// ── Single contact stage ───────────────────────────────────────

export function useContactStage(contactKey: string | undefined) {
  return useQuery<ContactStageRow | null>({
    queryKey: ['contact-stage', contactKey],
    enabled:  !!contactKey,
    staleTime: 30_000,
    queryFn:  async () => {
      const { data } = await supabase
        .from('contact_stages')
        .select('contact_key, stage, note, updated_at')
        .eq('contact_key', contactKey!)
        .maybeSingle()
      return (data as ContactStageRow | null) ?? null
    },
  })
}

// ── Batch stages for contacts list ────────────────────────────

export function useContactStagesBatch(contactKeys: string[]) {
  return useQuery<Record<string, ContactStageRow>>({
    queryKey: ['contact-stages-batch', contactKeys.slice().sort().join(',')],
    enabled:  contactKeys.length > 0,
    staleTime: 30_000,
    queryFn:  async () => {
      if (!contactKeys.length) return {}
      const { data } = await supabase
        .from('contact_stages')
        .select('contact_key, stage, note, updated_at')
        .in('contact_key', contactKeys)
      const map: Record<string, ContactStageRow> = {}
      for (const row of (data ?? []) as ContactStageRow[]) {
        map[row.contact_key] = row
      }
      return map
    },
  })
}

// ── Stage history ─────────────────────────────────────────────

export function useContactStageHistory(contactKey: string | undefined) {
  return useQuery<StageHistoryRow[]>({
    queryKey: ['contact-stage-history', contactKey],
    enabled:  !!contactKey,
    staleTime: 30_000,
    queryFn:  async () => {
      const { data } = await supabase
        .from('contact_stage_history')
        .select('id, contact_key, stage, previous_stage, note, changed_at')
        .eq('contact_key', contactKey!)
        .order('changed_at', { ascending: false })
      return (data ?? []) as StageHistoryRow[]
    },
  })
}

// ── Mutation ──────────────────────────────────────────────────

export function useUpdateContactStage() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      contactKey,
      stage,
      previousStage,
      note,
    }: {
      contactKey:    string
      stage:         Stage
      previousStage: Stage | null
      note?:         string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id ?? null
      const now = new Date().toISOString()

      // Upsert current stage
      const { error: e1 } = await supabase
        .from('contact_stages')
        .upsert({
          contact_key: contactKey,
          stage,
          note:        note ?? null,
          updated_at:  now,
          updated_by:  userId,
        }, { onConflict: 'contact_key' })
      if (e1) throw e1

      // Insert history entry
      const { error: e2 } = await supabase
        .from('contact_stage_history')
        .insert({
          contact_key:    contactKey,
          stage,
          previous_stage: previousStage,
          note:           note ?? null,
          changed_at:     now,
          changed_by:     userId,
        })
      if (e2) throw e2
    },

    onSuccess: (_, { contactKey }) => {
      qc.invalidateQueries({ queryKey: ['contact-stage', contactKey] })
      qc.invalidateQueries({ queryKey: ['contact-stage-history', contactKey] })
      qc.invalidateQueries({ queryKey: ['contact-stages-batch'] })
    },
  })
}

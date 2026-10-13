import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export type AppRole = 'admin' | 'professor' | null

export interface SessionRole {
  ready: boolean
  user:  User | null
  role:  AppRole
}

/**
 * Papel da sessão, lido de app_metadata.
 *
 * app_metadata só é gravável pela service_role, nunca pelo próprio usuário —
 * por isso serve como fonte de autorização. Ainda assim, quem decide o que cada
 * um alcança é a RLS no banco: isto aqui só escolhe qual interface mostrar.
 */
export function useRole(): SessionRole {
  const [state, setState] = useState<SessionRole>({ ready: false, user: null, role: null })

  useEffect(() => {
    function apply(user: User | null) {
      const raw = user?.app_metadata?.role
      const role: AppRole = raw === 'admin' || raw === 'professor' ? raw : null
      setState({ ready: true, user, role })
    }

    supabase.auth.getSession().then(({ data: { session } }) => apply(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => apply(session?.user ?? null),
    )
    return () => subscription.unsubscribe()
  }, [])

  return state
}

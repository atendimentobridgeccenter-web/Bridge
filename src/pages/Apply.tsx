import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import FormRunner from '@/form/FormRunner'
import type { BridgeForm } from '@/lib/types'

// Default form slug — can be overridden via ?form=slug
const DEFAULT_FORM_SLUG = 'bridge-enterprise'

export default function Apply() {
  const [params]  = useSearchParams()
  const formSlug  = params.get('form') ?? DEFAULT_FORM_SLUG
  const fromSlug  = params.get('from') ?? undefined

  const [form,    setForm]    = useState<BridgeForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    supabase
      .from('bridge_forms')
      .select('*')
      .eq('slug', formSlug)
      .eq('active', true)
      .single()
      .then(({ data, error: e }) => {
        if (e || !data) setError(true)
        else setForm(data as BridgeForm)
        setLoading(false)
      })
  }, [formSlug])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <p>Formulário não encontrado.</p>
      </div>
    )
  }

  return <FormRunner form={form} fromSlug={fromSlug} />
}

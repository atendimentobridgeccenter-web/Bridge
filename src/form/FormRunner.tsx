import { useState, useEffect, useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { v4 as uuid } from 'uuid'
import { Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { computeLineItems } from '@/lib/pricingEngine'
import FormStepView from './FormStepView'
import OrderSummary from './OrderSummary'
import type { BridgeForm, FormStep, LineItem } from '@/lib/types'

interface Props {
  form: BridgeForm
  fromSlug?: string
}

const CHECKOUT_SENTINEL = '__checkout__'

export default function FormRunner({ form, fromSlug }: Props) {
  const { schema } = form
  const steps = schema.steps

  const [stepId,      setStepId]      = useState<string>(steps[0]?.id ?? '')
  const [answers,     setAnswers]     = useState<Record<string, string | string[]>>({})
  const [leadId,      setLeadId]      = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [progress,    setProgress]    = useState(0)

  const currentStep: FormStep | undefined = steps.find(s => s.id === stepId)
  const stepIndex   = steps.findIndex(s => s.id === stepId)
  const totalSteps  = steps.length

  const lineItems: LineItem[] = useMemo(
    () => computeLineItems(answers, schema),
    [answers, schema],
  )

  useEffect(() => {
    setProgress(((stepIndex + 1) / (totalSteps + 1)) * 100)
  }, [stepIndex, totalSteps])

  const upsertLead = useCallback(async (
    patch: Partial<{ answers: typeof answers; current_step: number; completed: boolean; email: string }>
  ) => {
    if (leadId) {
      await supabase.from('bridge_leads')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', leadId)
    } else {
      const id = uuid()
      setLeadId(id)
      await supabase.from('bridge_leads').insert({
        id,
        form_id: form.id,
        landing_page_slug: fromSlug ?? null,
        answers: patch.answers ?? {},
        current_step: patch.current_step ?? 0,
        completed: false,
        email: patch.email ?? null,
      })
    }
  }, [leadId, form.id, fromSlug])

  function handleChange(value: string | string[]) {
    const field = currentStep?.field ?? stepId
    setAnswers(prev => ({ ...prev, [field]: value, [stepId]: value }))
  }

  async function handleNext() {
    if (!currentStep) return
    const value = answers[currentStep.field] ?? answers[stepId]
    const newAnswers = { ...answers, [currentStep.field]: value, [stepId]: value }
    setAnswers(newAnswers)

    if (currentStep.type === 'email' && value) {
      await upsertLead({ answers: newAnswers, current_step: stepIndex, email: value as string })
    } else {
      await upsertLead({ answers: newAnswers, current_step: stepIndex + 1 })
    }

    let next: string = CHECKOUT_SENTINEL
    if (currentStep.type === 'select' || currentStep.type === 'multiselect') {
      const selectedVal = Array.isArray(value) ? value[0] : value
      const matchedOpt  = currentStep.options?.find(o => o.value === selectedVal)
      next = matchedOpt?.nextStep ?? currentStep.nextStep ?? CHECKOUT_SENTINEL
    } else {
      next = currentStep.nextStep ?? CHECKOUT_SENTINEL
    }

    if (next === CHECKOUT_SENTINEL) {
      setProgress(100)
      setShowSummary(true)
    } else {
      setStepId(next)
    }
  }

  async function handleCheckout() {
    if (!leadId) {
      await upsertLead({ answers, current_step: totalSteps, completed: true })
    } else {
      await supabase.from('bridge_leads')
        .update({ completed: true, current_step: totalSteps })
        .eq('id', leadId)
    }
    setLoading(true)
    const priceIds = lineItems.map(i => i.price_id)
    const email = (answers['email'] ?? '') as string
    try {
      const res = await supabase.functions.invoke<{ url: string }>('create-bridge-checkout', {
        body: { lead_id: leadId, form_id: form.id, price_ids: priceIds, customer_email: email },
      })
      if (res.error) throw res.error
      if (res.data?.url) window.location.href = res.data.url
    } catch (err) {
      console.error('[checkout]', err)
      alert('Erro ao criar sessão de pagamento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const currentValue = currentStep
    ? (answers[currentStep.field] ?? answers[stepId] ?? (currentStep.type === 'multiselect' ? [] : ''))
    : ''

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[600px] rounded-full bg-violet-600/6 blur-[120px]" />
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-zinc-800 shrink-0 relative z-10">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Step counter */}
      <div className="shrink-0 flex items-center justify-between px-8 py-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center">
            <Zap className="w-3 h-3 text-white fill-white" />
          </div>
          <span className="text-xs font-semibold text-zinc-600">Bridge</span>
        </div>
        {!showSummary && (
          <span className="text-xs font-mono text-zinc-600">
            {stepIndex + 1} / {totalSteps}
          </span>
        )}
      </div>

      {/* Form area */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 relative z-10">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {showSummary ? (
              <OrderSummary
                key="summary"
                lineItems={lineItems}
                onConfirm={handleCheckout}
                loading={loading}
              />
            ) : currentStep ? (
              <FormStepView
                key={currentStep.id}
                step={currentStep}
                value={currentValue as string | string[]}
                onChange={handleChange}
                onNext={handleNext}
                stepIndex={stepIndex}
                totalSteps={totalSteps}
              />
            ) : (
              <p className="text-zinc-600 text-center text-sm">Formulário inválido.</p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 text-center text-xs text-zinc-800 relative z-10">
        Powered by <span className="text-zinc-600 font-semibold">Bridge</span>
      </div>
    </div>
  )
}

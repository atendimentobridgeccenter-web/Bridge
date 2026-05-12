import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { FormStep } from '@/lib/types'

interface Props {
  step: FormStep
  value: string | string[]
  onChange: (v: string | string[]) => void
  onNext: () => void
  stepIndex: number
  totalSteps: number
}

const variants = {
  enter:  { opacity: 0, y: 48, scale: 0.97 },
  center: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
  exit:   { opacity: 0, y: -32, scale: 0.97, transition: { duration: 0.3 } },
}

export default function FormStepView({ step, value, onChange, onNext, stepIndex, totalSteps }: Props) {
  const [localVal, setLocalVal] = useState<string | string[]>(value ?? (step.type === 'multiselect' ? [] : ''))

  // Sync when step changes
  useEffect(() => {
    setLocalVal(value ?? (step.type === 'multiselect' ? [] : ''))
  }, [step.id, value, step.type])

  function commit(v: string | string[]) {
    setLocalVal(v)
    onChange(v)
  }

  function handleNext() {
    if (step.required && (!localVal || (Array.isArray(localVal) && localVal.length === 0))) return
    onNext()
  }

  const canAdvance = !step.required || (Array.isArray(localVal) ? localVal.length > 0 : Boolean(localVal))

  return (
    <motion.div
      key={step.id}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      className="w-full max-w-xl mx-auto"
    >
      {/* Step counter */}
      <p className="text-sm text-violet-400 font-mono mb-4 tracking-wider">
        {String(stepIndex + 1).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
      </p>

      {/* Question */}
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-10 leading-tight">
        {step.question}
      </h2>

      {/* Input by type */}
      <div className="space-y-3">
        {(step.type === 'text' || step.type === 'email' || step.type === 'textarea') && (
          <div className="relative">
            {step.type === 'textarea' ? (
              <textarea
                autoFocus
                value={localVal as string}
                placeholder={step.placeholder}
                onChange={e => commit(e.target.value)}
                rows={4}
                className="w-full bg-transparent border-b-2 border-slate-700 focus:border-violet-500 text-white text-xl py-3 outline-none resize-none placeholder:text-slate-600 transition-colors"
              />
            ) : (
              <input
                autoFocus
                type={step.type}
                value={localVal as string}
                placeholder={step.placeholder}
                onChange={e => commit(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNext()}
                className="w-full bg-transparent border-b-2 border-slate-700 focus:border-violet-500 text-white text-xl py-3 outline-none placeholder:text-slate-600 transition-colors"
              />
            )}
          </div>
        )}

        {step.type === 'select' && step.options?.map(opt => (
          <button
            key={opt.value}
            onClick={() => { commit(opt.value); setTimeout(onNext, 260) }}
            className={cn(
              'w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-left transition-all duration-200',
              localVal === opt.value
                ? 'border-violet-500 bg-violet-500/15 text-white'
                : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800/60',
            )}
          >
            <span className="font-medium">{opt.label}</span>
            {localVal === opt.value && <Check className="w-5 h-5 text-violet-400 shrink-0" />}
          </button>
        ))}

        {step.type === 'multiselect' && step.options?.map(opt => {
          const selected = Array.isArray(localVal) && localVal.includes(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => {
                const arr = Array.isArray(localVal) ? [...localVal] : []
                commit(selected ? arr.filter(v => v !== opt.value) : [...arr, opt.value])
              }}
              className={cn(
                'w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-left transition-all duration-200',
                selected
                  ? 'border-violet-500 bg-violet-500/15 text-white'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800/60',
              )}
            >
              <span className="font-medium">{opt.label}</span>
              {selected && <Check className="w-5 h-5 text-violet-400 shrink-0" />}
            </button>
          )
        })}
      </div>

      {/* Next button — hidden for auto-advance selects */}
      {(step.type !== 'select') && (
        <motion.button
          initial={false}
          animate={canAdvance ? { opacity: 1, y: 0 } : { opacity: 0.3, y: 8 }}
          onClick={handleNext}
          disabled={!canAdvance}
          className="mt-10 flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:cursor-not-allowed text-white font-semibold text-lg shadow-lg shadow-violet-900/40 transition-colors"
        >
          Continuar <ArrowRight className="w-5 h-5" />
        </motion.button>
      )}

      {/* Keyboard hint */}
      {(step.type === 'text' || step.type === 'email') && (
        <p className="mt-4 text-xs text-slate-600">Pressione Enter ↵ para avançar</p>
      )}
    </motion.div>
  )
}

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
  enter:  { opacity: 0, y: 40, scale: 0.98 },
  center: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
  exit:   { opacity: 0, y: -24, scale: 0.98, transition: { duration: 0.28 } },
}

export default function FormStepView({ step, value, onChange, onNext, stepIndex, totalSteps }: Props) {
  const [localVal, setLocalVal] = useState<string | string[]>(value ?? (step.type === 'multiselect' ? [] : ''))

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

  const isText = step.type === 'text' || step.type === 'email' || step.type === 'textarea'

  return (
    <motion.div
      key={step.id}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      className="w-full"
    >
      {/* Step indicator */}
      <p className="text-xs font-mono text-violet-400/60 mb-5 tracking-widest">
        {String(stepIndex + 1).padStart(2, '0')} — {String(totalSteps).padStart(2, '0')}
      </p>

      {/* Question */}
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-10 leading-tight tracking-tight">
        {step.question}
      </h2>

      {/* Inputs */}
      <div className="space-y-2.5">
        {isText && (
          <div>
            {step.type === 'textarea' ? (
              <textarea
                autoFocus
                value={localVal as string}
                placeholder={step.placeholder}
                onChange={e => commit(e.target.value)}
                rows={4}
                className={cn(
                  'w-full bg-transparent border-b-2 border-zinc-700 focus:border-violet-500',
                  'text-white text-xl py-3 outline-none resize-none',
                  'placeholder:text-zinc-700 transition-colors leading-relaxed',
                )}
              />
            ) : (
              <input
                autoFocus
                type={step.type}
                value={localVal as string}
                placeholder={step.placeholder}
                onChange={e => commit(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNext()}
                className={cn(
                  'w-full bg-transparent border-b-2 border-zinc-700 focus:border-violet-500',
                  'text-white text-xl py-3 outline-none',
                  'placeholder:text-zinc-700 transition-colors',
                )}
              />
            )}
          </div>
        )}

        {step.type === 'select' && step.options?.map(opt => (
          <motion.button
            key={opt.value}
            whileHover={{ x: 2 }}
            onClick={() => { commit(opt.value); setTimeout(onNext, 240) }}
            className={cn(
              'w-full flex items-center justify-between px-5 py-4 rounded-xl border text-left',
              'transition-all duration-200 group',
              localVal === opt.value
                ? 'border-violet-500 bg-violet-500/10 text-white'
                : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60',
            )}
          >
            <span className="font-medium">{opt.label}</span>
            <span className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
              localVal === opt.value
                ? 'border-violet-500 bg-violet-500'
                : 'border-zinc-600 group-hover:border-zinc-500',
            )}>
              {localVal === opt.value && <Check className="w-3 h-3 text-white" />}
            </span>
          </motion.button>
        ))}

        {step.type === 'multiselect' && step.options?.map(opt => {
          const selected = Array.isArray(localVal) && localVal.includes(opt.value)
          return (
            <motion.button
              key={opt.value}
              whileHover={{ x: 2 }}
              onClick={() => {
                const arr = Array.isArray(localVal) ? [...localVal] : []
                commit(selected ? arr.filter(v => v !== opt.value) : [...arr, opt.value])
              }}
              className={cn(
                'w-full flex items-center justify-between px-5 py-4 rounded-xl border text-left',
                'transition-all duration-200 group',
                selected
                  ? 'border-violet-500 bg-violet-500/10 text-white'
                  : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60',
              )}
            >
              <span className="font-medium">{opt.label}</span>
              <span className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                selected
                  ? 'border-violet-500 bg-violet-500'
                  : 'border-zinc-600 group-hover:border-zinc-500',
              )}>
                {selected && <Check className="w-3 h-3 text-white" />}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* Next button */}
      {step.type !== 'select' && (
        <motion.button
          animate={canAdvance ? { opacity: 1, y: 0 } : { opacity: 0.25, y: 6 }}
          onClick={handleNext}
          disabled={!canAdvance}
          className={cn(
            'mt-10 flex items-center gap-2.5 px-7 py-3.5 rounded-xl',
            'bg-violet-600 hover:bg-violet-500 disabled:cursor-not-allowed',
            'text-white font-semibold text-base',
            'shadow-lg shadow-violet-900/30 transition-colors',
          )}
        >
          Continuar <ArrowRight className="w-4 h-4" />
        </motion.button>
      )}

      {(step.type === 'text' || step.type === 'email') && (
        <p className="mt-3 text-xs text-zinc-700">
          Pressione <kbd className="text-zinc-600">Enter ↵</kbd> para avançar
        </p>
      )}
    </motion.div>
  )
}

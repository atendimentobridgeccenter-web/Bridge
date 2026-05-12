import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { Plus, Trash2, GripVertical, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { FormStep, FormSchema, Product, QuestionType } from '@/lib/types'

const TYPE_LABELS: Record<QuestionType, string> = {
  text:        'Texto curto',
  email:       'E-mail',
  textarea:    'Texto longo',
  select:      'Seleção única',
  multiselect: 'Múltipla escolha',
}

interface Props {
  product: Product
  onChange: (patch: Partial<Product>) => void
}

function emptyStep(): FormStep {
  return {
    id:       uuid(),
    question: 'Nova pergunta',
    type:     'text',
    field:    `field_${Date.now()}`,
    required: true,
    nextStep: '',
  }
}

export default function FormBuilderTab({ product, onChange }: Props) {
  const schema = product.form_logic_config as FormSchema
  const steps  = schema?.steps ?? []
  const [openId, setOpenId] = useState<string | null>(steps[0]?.id ?? null)

  function patch(newSteps: FormStep[]) {
    onChange({
      form_logic_config: { ...schema, steps: newSteps } as FormSchema,
    })
  }

  function addStep() {
    const s = emptyStep()
    patch([...steps, s])
    setOpenId(s.id)
  }

  function removeStep(id: string) {
    patch(steps.filter(s => s.id !== id))
  }

  function updateStep(id: string, upd: Partial<FormStep>) {
    patch(steps.map(s => (s.id === id ? { ...s, ...upd } : s)))
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Global schema config */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 mb-2">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
          Precificação Padrão
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-slate-500 mb-1 block">Price ID padrão</span>
            <input
              value={schema?.default_price_id ?? ''}
              onChange={e => onChange({ form_logic_config: { ...schema, default_price_id: e.target.value } as FormSchema })}
              placeholder="price_..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500 font-mono"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500 mb-1 block">Valor padrão (centavos)</span>
            <input
              type="number"
              value={schema?.default_amount ?? 0}
              onChange={e => onChange({ form_logic_config: { ...schema, default_amount: Number(e.target.value) } as FormSchema })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
            />
          </label>
        </div>
      </div>

      {/* Steps */}
      {steps.map((step, i) => (
        <div key={step.id} className={cn(
          'rounded-2xl border transition-colors',
          openId === step.id ? 'border-violet-500/50 bg-slate-900' : 'border-slate-800 bg-slate-900/40',
        )}>
          {/* Header */}
          <button
            className="w-full flex items-center gap-3 p-4 text-left"
            onClick={() => setOpenId(openId === step.id ? null : step.id)}
          >
            <GripVertical className="w-4 h-4 text-slate-600 shrink-0" />
            <span className="text-xs font-mono text-slate-500 w-5 shrink-0">{i + 1}</span>
            <span className="flex-1 font-medium text-white text-sm truncate">{step.question}</span>
            <span className="text-xs text-slate-500 shrink-0">{TYPE_LABELS[step.type]}</span>
            <ChevronDown className={cn('w-4 h-4 text-slate-500 shrink-0 transition-transform', openId === step.id && 'rotate-180')} />
          </button>

          {/* Body */}
          {openId === step.id && (
            <div className="px-4 pb-5 space-y-4 border-t border-slate-800 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block col-span-2">
                  <span className="text-xs text-slate-500 mb-1 block">Pergunta</span>
                  <input
                    value={step.question}
                    onChange={e => updateStep(step.id, { question: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500 mb-1 block">Tipo</span>
                  <select
                    value={step.type}
                    onChange={e => updateStep(step.id, { type: e.target.value as QuestionType })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                  >
                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500 mb-1 block">Campo (field name)</span>
                  <input
                    value={step.field}
                    onChange={e => updateStep(step.id, { field: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-violet-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500 mb-1 block">Placeholder</span>
                  <input
                    value={step.placeholder ?? ''}
                    onChange={e => updateStep(step.id, { placeholder: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500 mb-1 block">Próximo passo (ID)</span>
                  <input
                    value={step.nextStep ?? ''}
                    onChange={e => updateStep(step.id, { nextStep: e.target.value })}
                    placeholder="ID do step ou __checkout__"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-violet-500 placeholder:text-slate-600"
                  />
                </label>
                <label className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    checked={step.required ?? true}
                    onChange={e => updateStep(step.id, { required: e.target.checked })}
                    className="accent-violet-500"
                  />
                  <span className="text-sm text-slate-300">Obrigatório</span>
                </label>
              </div>

              {/* Options for select/multiselect */}
              {(step.type === 'select' || step.type === 'multiselect') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">Opções</span>
                    <button
                      onClick={() => updateStep(step.id, {
                        options: [...(step.options ?? []), { value: uuid().slice(0, 6), label: 'Nova opção', nextStep: '' }]
                      })}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      + Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(step.options ?? []).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          value={opt.label}
                          onChange={e => {
                            const opts = [...(step.options ?? [])]
                            opts[oi] = { ...opts[oi], label: e.target.value }
                            updateStep(step.id, { options: opts })
                          }}
                          placeholder="Label"
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-violet-500"
                        />
                        <input
                          value={opt.nextStep}
                          onChange={e => {
                            const opts = [...(step.options ?? [])]
                            opts[oi] = { ...opts[oi], nextStep: e.target.value }
                            updateStep(step.id, { options: opts })
                          }}
                          placeholder="nextStep"
                          className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-400 font-mono outline-none focus:border-violet-500"
                        />
                        <button
                          onClick={() => {
                            const opts = [...(step.options ?? [])]
                            opts.splice(oi, 1)
                            updateStep(step.id, { options: opts })
                          }}
                          className="p-1.5 rounded text-red-400/60 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => removeStep(step.id)}
                className="flex items-center gap-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors pt-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remover pergunta
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addStep}
        className="flex items-center gap-2 px-5 py-3 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:border-violet-500/50 hover:text-violet-400 text-sm transition-colors w-full justify-center"
      >
        <Plus className="w-4 h-4" /> Adicionar pergunta
      </button>
    </div>
  )
}

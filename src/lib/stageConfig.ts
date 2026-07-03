export type Stage = 'novo' | 'em_contato' | 'proposta' | 'fechado' | 'perdido'

export interface StageDef {
  value:  Stage
  label:  string
  color:  string
  bg:     string
  border: string
}

export const STAGES: StageDef[] = [
  { value: 'novo',       label: 'Novo',       color: '#93C5FD', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.22)'  },
  { value: 'em_contato', label: 'Em contato', color: '#FCD34D', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.22)'  },
  { value: 'proposta',   label: 'Proposta',   color: '#C4B5FD', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.22)' },
  { value: 'fechado',    label: 'Fechado',    color: '#6EE7B7', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.22)'  },
  { value: 'perdido',    label: 'Perdido',    color: '#F87171', bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.18)'   },
]

export function stageOf(value: string | undefined | null): StageDef {
  return STAGES.find(s => s.value === value) ?? STAGES[0]
}

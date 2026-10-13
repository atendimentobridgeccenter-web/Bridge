export type Stage =
  | 'novo'
  | 'em_contato'
  | 'avaliacao_agendada'
  | 'avaliacao_feita'
  | 'follow_up'
  | 'proposta'
  | 'fechado'
  | 'perdido'

export interface StageDef {
  value:  Stage
  label:  string
  color:  string
  bg:     string
  border: string
}

// A ordem é a do funil e define as colunas do kanban.
// 'proposta' segue na lista porque há contatos parados nele: 'follow_up' descreve
// melhor a etapa, mas remover o valor invalidaria linhas existentes.
export const STAGES: StageDef[] = [
  { value: 'novo',               label: 'Novo',           color: '#93C5FD', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.22)'  },
  { value: 'em_contato',         label: 'Em contato',     color: '#FCD34D', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.22)'  },
  { value: 'avaliacao_agendada', label: 'Avaliação agendada', color: '#7DD3FC', bg: 'rgba(125,211,252,0.08)', border: 'rgba(125,211,252,0.22)' },
  { value: 'avaliacao_feita',    label: 'Avaliação feita', color: '#5EEAD4', bg: 'rgba(94,234,212,0.08)',  border: 'rgba(94,234,212,0.22)'  },
  { value: 'follow_up',          label: 'Follow-up',      color: '#FDBA74', bg: 'rgba(253,186,116,0.08)', border: 'rgba(253,186,116,0.22)' },
  { value: 'proposta',           label: 'Proposta',       color: '#C4B5FD', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.22)' },
  { value: 'fechado',            label: 'Fechado',        color: '#6EE7B7', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.22)'  },
  { value: 'perdido',            label: 'Perdido',        color: '#F87171', bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.18)'   },
]

export function stageOf(value: string | undefined | null): StageDef {
  return STAGES.find(s => s.value === value) ?? STAGES[0]
}

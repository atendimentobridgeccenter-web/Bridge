import type { ReactNode } from 'react'
import Cartao from './Cartao'
import { cn } from '@/lib/cn'

/**
 * Resumo: até três números no topo da tela, em serifa grande, como no
 * site (docs/design-system/components/Resumo). O primeiro item, o mais
 * importante, deve ir com `escuro`. Número sem `small` (o contexto) não
 * entra — regra do README.
 */
export interface ResumoItem {
  dt: ReactNode
  dd: ReactNode
  small: ReactNode
  /** Pinta o número de laranja-texto — destaque positivo da escola. */
  marca?: boolean
  /** Cartão grafite — use só no primeiro item. */
  escuro?: boolean
  /** Cor do número quando não é marca nem escuro, ex.: "var(--erro)". */
  corDd?: string
}

export interface ResumoProps {
  /** Até três itens. */
  itens: ResumoItem[]
  className?: string
}

export default function Resumo({ itens, className }: ResumoProps) {
  return (
    <dl className={cn('br-resumo', className)}>
      {itens.slice(0, 3).map((item, i) => (
        <Cartao key={i} escuro={item.escuro}>
          <dt>{item.dt}</dt>
          <dd className={cn('num', item.marca && 'marca')} style={item.corDd ? { color: item.corDd } : undefined}>
            {item.dd}
          </dd>
          <small>{item.small}</small>
        </Cartao>
      ))}
    </dl>
  )
}

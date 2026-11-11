import type { ReactNode } from 'react'
import Cartao from './Cartao'
import { cn } from '@/lib/cn'

/**
 * Estado vazio: um arco de ponte começado em laranja e ainda sem chegada
 * (docs/design-system/components/Vazio).
 *
 * A descrição deve dizer de onde o conteúdo vai vir, nunca uma ilustração
 * genérica nem emoji — regra do README. Ex.: "Quando o professor fizer a
 * chamada pelo portal, a aula aparece aqui."
 */
export interface VazioProps {
  /** O que ainda não existe. */
  titulo: string
  /** De onde aquilo vai vir. */
  descricao: ReactNode
  /** Ação secundária opcional, ex.: <Botao variante="secundario">. */
  acao?: ReactNode
  className?: string
}

export default function Vazio({ titulo, descricao, acao, className }: VazioProps) {
  return (
    <Cartao className={cn('br-vazio', className)}>
      <svg viewBox="0 0 160 64" aria-hidden="true">
        <path className="b" d="M8 60 A72 56 0 0 1 152 60" />
        <path className="a" d="M8 60 A72 56 0 0 1 58 10" />
        <path className="b" d="M2 60h156" />
      </svg>
      <h3>{titulo}</h3>
      <p>{descricao}</p>
      {acao}
    </Cartao>
  )
}

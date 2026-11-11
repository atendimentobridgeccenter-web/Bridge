import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Título de seção com kanji de apoio e ação (docs/design-system/components/Tabela,
 * "Título: use br-titulo-secao acima").
 */
export interface TituloSecaoProps {
  titulo: string
  /** Kanji decorativo, ex.: "会計". Sempre aria-hidden — o português vem antes. */
  kanji?: string
  /** Ação à direita — normalmente um <Botao variante="fantasma">. */
  acao?: ReactNode
  className?: string
}

export default function TituloSecao({ titulo, kanji, acao, className }: TituloSecaoProps) {
  return (
    <div className={cn('br-titulo-secao', className)}>
      <h2>{titulo}</h2>
      {kanji && <span className="kanji" aria-hidden="true">{kanji}</span>}
      {acao && <span className="acao">{acao}</span>}
    </div>
  )
}

import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Cabeçalho de página (docs/design-system/components/Cabecalho): trilha,
 * título em serifa, frase de situação com números e as ações, com um
 * primário à direita.
 *
 * Não faça: saudação no lugar do título, nem subtítulo genérico — regra
 * do README.
 */
export interface CabecalhoProps {
  /** Trilha de navegação, ex.: <><a href="/admin/escola">Escola</a> / Matrículas</>. */
  trilha?: ReactNode
  titulo: string
  /** Frase de situação com números — não um subtítulo genérico. */
  descricao?: ReactNode
  /** Botões de ação, com um br-btn--primario entre eles. */
  acoes?: ReactNode
  className?: string
}

export default function Cabecalho({ trilha, titulo, descricao, acoes, className }: CabecalhoProps) {
  return (
    <header className={cn('br-cabecalho', className)}>
      <div>
        {trilha && <div className="trilha">{trilha}</div>}
        <h1>{titulo}</h1>
        {descricao && <p>{descricao}</p>}
      </div>
      {acoes && <div className="acoes">{acoes}</div>}
    </header>
  )
}

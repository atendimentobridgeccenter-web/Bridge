import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Jornada: etapas de uma pessoa, ligadas por pequenos arcos de ponte
 * (docs/design-system/components/Jornada). Use no topo do perfil do
 * contato e do aluno — não para processos internos da equipe.
 *
 * Nota: o README permite até 5 etapas, mas o `bundle.css` do design
 * system fixa `grid-template-columns: repeat(4, 1fr)` — com 5 etapas a
 * grade não se ajusta sozinha. Mantive o CSS fiel ao bundle.css (não é
 * desta OS redesenhar o componente); com 5 etapas, ajustar via `style`
 * no consumidor ou abrir um achado para o design system.
 */
export interface JornadaEtapa {
  nome: string
  quando?: ReactNode
  /** undefined = etapa futura. */
  estado?: 'feito' | 'atual'
  /** Ícone do marco (14px) — por padrão, um check quando "feito". */
  icone?: ReactNode
}

export interface JornadaProps {
  /** Até 5 etapas (ver nota sobre o grid de 4 colunas do bundle.css). */
  etapas: JornadaEtapa[]
  className?: string
}

export default function Jornada({ etapas, className }: JornadaProps) {
  return (
    <ol className={cn('br-jornada', className)}>
      {etapas.slice(0, 5).map((etapa, i) => (
        <li key={i} data-estado={etapa.estado}>
          <span className="marco">
            {etapa.estado === 'feito' ? (etapa.icone ?? <Check aria-hidden="true" />) : null}
          </span>
          <span className="nome">{etapa.nome}</span>
          {etapa.quando && <span className="quando">{etapa.quando}</span>}
        </li>
      ))}
    </ol>
  )
}

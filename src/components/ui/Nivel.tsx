import { cn } from '@/lib/cn'
import type { JlptLevel } from '@/components/form-builder/FormBuilder'

/**
 * Nível JLPT, na serifa da marca (docs/design-system/components/Nivel).
 *
 * `previsto`: resultado da avaliação online ainda não revisado pela
 * equipe (traço pontilhado, em vez de sólido).
 */
export interface NivelProps {
  nivel: JlptLevel | string
  previsto?: boolean
  /** Sobrescreve o title padrão do estado "previsto". */
  titulo?: string
  className?: string
}

export default function Nivel({ nivel, previsto = false, titulo, className }: NivelProps) {
  return (
    <span
      className={cn('br-nivel', previsto && 'br-nivel--previsto', className)}
      title={titulo ?? (previsto ? 'Resultado da avaliação online, aguardando revisão' : undefined)}
    >
      {nivel}
    </span>
  )
}

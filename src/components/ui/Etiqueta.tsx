import type { ComponentType, ReactNode, SVGProps } from 'react'
import { cn } from '@/lib/cn'

/**
 * Etiqueta de estado em pílula (docs/design-system/components/Etiqueta).
 *
 * `icone` é opcional para `marca` e `neutra` (o README as exclui do ícone
 * obrigatório); nas demais, o consumidor deve passar um ícone de 14px
 * (um componente lucide-react) para a cor nunca ser a única pista.
 */
export type EtiquetaVariante = 'ok' | 'atencao' | 'erro' | 'info' | 'marca' | 'neutra'

export interface EtiquetaProps {
  variante: EtiquetaVariante
  icone?: ComponentType<SVGProps<SVGSVGElement>>
  children: ReactNode
  className?: string
}

export default function Etiqueta({ variante, icone: Icone, children, className }: EtiquetaProps) {
  return (
    <span className={cn('br-etiqueta', `br-etiqueta--${variante}`, className)}>
      {Icone && <Icone aria-hidden="true" />}
      {children}
    </span>
  )
}

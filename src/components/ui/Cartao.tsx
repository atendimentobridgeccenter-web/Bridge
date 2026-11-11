import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Cartão base do design system (docs/design-system/README.md, "Forma"). */
export interface CartaoProps extends HTMLAttributes<HTMLDivElement> {
  /** Cartão grafite (br-cartao escuro) — use no máximo um por tela (ex.: Resumo). */
  escuro?: boolean
  children?: ReactNode
}

export default function Cartao({ escuro = false, className, children, ...rest }: CartaoProps) {
  return (
    <div className={cn('br-cartao', escuro && 'escuro', className)} {...rest}>
      {children}
    </div>
  )
}

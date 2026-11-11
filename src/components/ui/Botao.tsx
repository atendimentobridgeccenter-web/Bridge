import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Botão em pílula do design system (docs/design-system/components/Botao).
 *
 * `icone`: botão só com ícone — exige `aria-label` (avisado no console em
 * dev se faltar). `carregando`: desabilita o botão e troca o conteúdo pelo
 * giro, com `aria-busy="true"`.
 *
 * Não faça: dois `primario` na mesma tela, nem `primario` para ação
 * secundária (regra do README do componente).
 */
export type BotaoVariante = 'primario' | 'secundario' | 'fantasma' | 'perigo'

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: BotaoVariante
  /** Botão só com ícone (br-btn--icone). Exige aria-label. */
  icone?: boolean
  carregando?: boolean
  children?: ReactNode
}

const Botao = forwardRef<HTMLButtonElement, BotaoProps>(function Botao(
  { variante = 'secundario', icone = false, carregando = false, className, disabled, type = 'button', children, ...rest },
  ref,
) {
  if (import.meta.env.DEV && icone && !rest['aria-label'] && !rest['aria-labelledby']) {
    console.error('[Botao] br-btn--icone exige aria-label.')
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={cn(
        'br-btn',
        `br-btn--${variante}`,
        icone && 'br-btn--icone',
        carregando && 'br-btn--carregando',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})

export default Botao

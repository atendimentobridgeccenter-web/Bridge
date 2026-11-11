import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Campo de formulário do design system (docs/design-system/components/Campo).
 *
 * O consumidor passa o controle (input/select/textarea) como `children`,
 * SEM `id` — este componente injeta `id`, `aria-invalid` e
 * `aria-describedby` automaticamente no controle, para não depender do
 * consumidor lembrar de cada atributo de acessibilidade.
 *
 * Não faça: placeholder no lugar do rótulo, nem rótulo em caixa alta.
 */
export interface CampoProps {
  id: string
  rotulo: ReactNode
  obrigatorio?: boolean
  ajuda?: ReactNode
  /** Mensagem de erro — quando presente, o campo entra em br-campo--erro. */
  erro?: ReactNode
  /** Prefixo visual, ex.: símbolo de moeda ("¥"). */
  prefixo?: ReactNode
  children: ReactNode
  className?: string
}

export default function Campo({ id, rotulo, obrigatorio, ajuda, erro, prefixo, children, className }: CampoProps) {
  const ajudaId = `${id}-ajuda`
  const temAjuda = Boolean(erro || ajuda)

  const controle = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        'aria-invalid': erro ? true : undefined,
        'aria-describedby': temAjuda ? ajudaId : undefined,
      })
    : children

  return (
    <div className={cn('br-campo', erro && 'br-campo--erro', className)}>
      <label htmlFor={id}>
        {rotulo}
        {obrigatorio && <span className="req">*</span>}
      </label>
      {prefixo ? (
        <div className="prefixo">
          <span>{prefixo}</span>
          {controle}
        </div>
      ) : (
        controle
      )}
      {erro ? (
        <span className="ajuda" id={ajudaId} role="alert">{erro}</span>
      ) : ajuda ? (
        <span className="ajuda" id={ajudaId}>{ajuda}</span>
      ) : null}
    </div>
  )
}

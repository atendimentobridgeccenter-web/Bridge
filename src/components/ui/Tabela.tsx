import type { ReactNode, TableHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/**
 * Tabela de registros em cartão (docs/design-system/components/Tabela).
 *
 * `TabelaWrap` é o cartão (`br-tabela-wrap`); `Tabela` é o `<table>` em si;
 * `Pessoa`/`Avatar` são a primeira coluna quando a linha é uma pessoa.
 * Thead, linhas e tfoot ficam a cargo do consumidor — a variedade de
 * colunas entre telas é grande demais para abstrair aqui sem perder
 * flexibilidade.
 *
 * Regras do README: sem zebra, até 50 linhas sem paginação, coluna
 * numérica com `className="num"`, ação de linha em botão-ícone com
 * aria-label.
 */
export function TabelaWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('br-tabela-wrap', className)}>{children}</div>
}

export function Avatar({ children }: { children: ReactNode }) {
  return <span className="br-avatar">{children}</span>
}

export function Pessoa({ nome, sub, iniciais }: { nome: ReactNode; sub?: ReactNode; iniciais: string }) {
  return (
    <div className="br-pessoa">
      <Avatar>{iniciais}</Avatar>
      <div>
        <strong>{nome}</strong>
        {sub && <span className="sub">{sub}</span>}
      </div>
    </div>
  )
}

export default function Tabela({ children, className, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn('br-tabela', className)} {...rest}>
      {children}
    </table>
  )
}

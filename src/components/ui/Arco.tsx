import type { CSSProperties } from 'react'

/**
 * Arco: o arco da ponte do logo como medidor de 0 a 100%
 * (docs/design-system/components/Arco) — elemento de assinatura do
 * sistema. Mostre no máximo dois arcos por tela.
 *
 * O arco se enche em 900ms ao aparecer (animação em src/styles/ds.css);
 * com `prefers-reduced-motion`, aparece cheio direto (a animação é
 * desligada globalmente dentro de `.br`).
 */
const RAIO = 90
const COMPRIMENTO = Math.PI * RAIO // ≈ 282.74 — stroke-dasharray do arco

export interface ArcoProps {
  /** Fração de 0 a 1. Valores fora do intervalo são travados nas pontas. */
  fracao: number
  /** O número em destaque, ex.: "85%", "12 de 20". */
  numero: string
  /** A descrição ao lado do número, ex.: "recebido de novembro". */
  descricao: string
  /** Largura do SVG — a altura acompanha a proporção do preview (180×99). */
  width?: number
  className?: string
}

export default function Arco({ fracao, numero, descricao, width = 180, className }: ArcoProps) {
  const f = Math.min(1, Math.max(0, fracao))
  const offset = COMPRIMENTO * (1 - f)
  const height = Math.round((width * 99) / 180)

  return (
    <div className={className ? `br-arco ${className}` : 'br-arco'}>
      <svg width={width} height={height} viewBox="-10 -10 200 110" role="img" aria-label={`${numero}: ${descricao}`}>
        <line className="pilar" x1="0" y1="96" x2="180" y2="96" />
        <path className="trilho" d="M0 90 A90 90 0 0 1 180 90" />
        <path
          className="valor"
          d="M0 90 A90 90 0 0 1 180 90"
          style={{ strokeDasharray: COMPRIMENTO, strokeDashoffset: offset, '--total': COMPRIMENTO } as CSSProperties}
        />
      </svg>
      <div className="leitura">
        <b className="num">{numero}</b>
        <span>{descricao}</span>
      </div>
    </div>
  )
}

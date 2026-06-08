import { useNavigate } from 'react-router-dom'
import type { ButtonBlockProps } from '@/lib/types'

const SIZE_STYLE: Record<string, React.CSSProperties> = {
  sm: { padding: '8px 20px',  fontSize: '0.875rem', borderRadius: 8  },
  md: { padding: '12px 32px', fontSize: '1rem',      borderRadius: 12 },
  lg: { padding: '16px 48px', fontSize: '1.125rem',  borderRadius: 16 },
}

function resolveHref(data: ButtonBlockProps): string {
  if (data.target === 'form')     return `/apply?product=${data.productSlug ?? ''}`
  if (data.target === 'checkout') return `/checkout/${data.productSlug ?? ''}`
  return data.url ?? '#'
}

interface Props { data: ButtonBlockProps; editable?: boolean }

export default function ButtonBlock({ data, editable }: Props) {
  const navigate = useNavigate()
  const py       = data.style?.paddingY ?? 32
  const align    = data.style?.align ?? 'center'
  const size     = SIZE_STYLE[data.size ?? 'md'] ?? SIZE_STYLE.md
  const href     = resolveHref(data)

  const solid   = data.variant !== 'outline'
  const btnColor = data.color     ?? '#E8521A'
  const txtColor = data.textColor ?? '#ffffff'

  const btnStyle: React.CSSProperties = {
    ...size,
    display:         data.fullWidth ? 'block' : 'inline-block',
    width:           data.fullWidth ? '100%' : undefined,
    textAlign:       'center',
    fontWeight:      700,
    cursor:          'pointer',
    transition:      'opacity 0.15s, transform 0.15s',
    border:          solid ? 'none' : `2px solid ${btnColor}`,
    background:      solid ? btnColor : 'transparent',
    color:           solid ? txtColor : btnColor,
    textDecoration:  'none',
  }

  function handleClick(e: React.MouseEvent) {
    if (editable) { e.preventDefault(); return }
    if (href.startsWith('http') || href.startsWith('//')) return
    e.preventDefault()
    navigate(href)
  }

  return (
    <section style={{ background: data.style?.bg ?? 'transparent', padding: `${py}px 32px` }}>
      <div style={{ textAlign: align as React.CSSProperties['textAlign'] }}>
        <a href={href} style={btnStyle} onClick={handleClick}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}>
          {data.label || 'Clique aqui'}
        </a>
      </div>
    </section>
  )
}

import type { HeadingProps } from '@/lib/types'

const SIZE_MAP: Record<string, string> = {
  xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem',
  '4xl': '2.25rem', '5xl': '3rem', '6xl': '3.75rem',
}
const WEIGHT_MAP: Record<string, string> = {
  normal: '400', semibold: '600', bold: '700', extrabold: '800',
}

interface Props {
  data: HeadingProps
  editable?: boolean
  onEdit?: (field: string, value: string) => void
}

export default function HeadingBlock({ data, editable, onEdit }: Props) {
  const Tag = (data.level ?? 'h2') as 'h1' | 'h2' | 'h3' | 'h4'
  const py  = data.style?.paddingY ?? 48

  const textStyle: React.CSSProperties = {
    fontSize:   SIZE_MAP[data.fontSize ?? '3xl'] ?? '1.875rem',
    fontWeight: WEIGHT_MAP[data.fontWeight ?? 'bold'] ?? '700',
    color:      data.style?.color ?? '#EDEDED',
    textAlign:  (data.style?.align ?? 'center') as React.CSSProperties['textAlign'],
    lineHeight:  1.15,
    margin:      0,
  }

  return (
    <section style={{ background: data.style?.bg ?? 'transparent', padding: `${py}px 32px` }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Tag
          style={textStyle}
          contentEditable={editable}
          suppressContentEditableWarning
          onBlur={editable ? e => onEdit?.('text', e.currentTarget.textContent ?? '') : undefined}
        >
          {data.text}
        </Tag>
      </div>
    </section>
  )
}

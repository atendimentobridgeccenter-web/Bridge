import type { TextBlockProps } from '@/lib/types'

const SIZE_MAP: Record<string, string> = {
  sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem',
}

interface Props {
  data: TextBlockProps
  editable?: boolean
  onEdit?: (field: string, value: string) => void
}

export default function TextBlock({ data, editable, onEdit }: Props) {
  const py = data.style?.paddingY ?? 32

  return (
    <section style={{ background: data.style?.bg ?? 'transparent', padding: `${py}px 32px` }}>
      <div style={{ maxWidth: data.maxWidth ? 720 : '100%', margin: '0 auto' }}>
        <p
          style={{
            fontSize:   SIZE_MAP[data.fontSize ?? 'base'] ?? '1rem',
            color:      data.style?.color ?? 'rgba(255,255,255,0.7)',
            textAlign:  (data.style?.align ?? 'left') as React.CSSProperties['textAlign'],
            lineHeight:  1.75,
            margin:      0,
            whiteSpace:  'pre-wrap',
          }}
          contentEditable={editable}
          suppressContentEditableWarning
          onBlur={editable ? e => onEdit?.('text', e.currentTarget.textContent ?? '') : undefined}
        >
          {data.text}
        </p>
      </div>
    </section>
  )
}

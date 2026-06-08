import type { ImageBlockProps } from '@/lib/types'

const WIDTH_MAP: Record<string, number> = { sm: 400, md: 640, lg: 900, full: 9999 }

interface Props { data: ImageBlockProps }

export default function ImageBlock({ data }: Props) {
  const py      = data.style?.paddingY ?? 32
  const maxW    = WIDTH_MAP[data.width ?? 'lg'] ?? 900
  const radius  = data.radius ?? 12
  const shadow  = data.shadow ?? false

  const img = (
    <img
      src={data.src}
      alt={data.alt ?? ''}
      style={{
        width:        '100%',
        maxWidth:     maxW === 9999 ? '100%' : maxW,
        borderRadius: radius,
        boxShadow:    shadow ? '0 24px 80px rgba(0,0,0,0.5)' : 'none',
        display:      'block',
        margin:       '0 auto',
      }}
    />
  )

  return (
    <section style={{ background: data.style?.bg ?? 'transparent', padding: `${py}px 32px` }}>
      {data.src ? (
        <>
          {data.link ? <a href={data.link} target="_blank" rel="noreferrer">{img}</a> : img}
          {data.caption && (
            <p style={{ textAlign: 'center', marginTop: 12, fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)' }}>
              {data.caption}
            </p>
          )}
        </>
      ) : (
        <div style={{
          maxWidth: 640, margin: '0 auto', height: 200, borderRadius: radius,
          background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.2)', fontSize: 14,
        }}>
          Adicione uma URL de imagem no painel de propriedades
        </div>
      )}
    </section>
  )
}

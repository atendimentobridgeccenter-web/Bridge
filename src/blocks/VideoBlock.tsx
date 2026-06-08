import type { VideoBlockProps } from '@/lib/types'

function getEmbedUrl(url: string, autoplay: boolean, muted: boolean): { type: 'iframe' | 'video'; src: string } {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) {
    const params = new URLSearchParams({ rel: '0', modestbranding: '1' })
    if (autoplay) { params.set('autoplay', '1'); params.set('mute', '1') }
    return { type: 'iframe', src: `https://www.youtube.com/embed/${ytMatch[1]}?${params}` }
  }
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    const params = new URLSearchParams()
    if (autoplay) { params.set('autoplay', '1'); params.set('muted', '1') }
    return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeoMatch[1]}?${params}` }
  }
  // Direct video file
  return { type: 'video', src: url }
}

interface Props { data: VideoBlockProps }

export default function VideoBlock({ data }: Props) {
  const py      = data.style?.paddingY ?? 48
  const bg      = data.style?.bg      ?? 'transparent'
  const color   = data.style?.color   ?? 'rgba(255,255,255,0.4)'
  const { type, src } = getEmbedUrl(data.url ?? '', data.autoplay ?? false, data.muted ?? false)

  return (
    <section style={{ background: bg, padding: `${py}px 32px` }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {data.url ? (
          <>
            <div style={{
              position: 'relative', paddingTop: '56.25%',
              borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}>
              {type === 'iframe' ? (
                <iframe
                  src={src}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={src}
                  controls={true}
                  autoPlay={data.autoplay}
                  muted={data.muted}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
            {data.caption && (
              <p style={{ textAlign: 'center', marginTop: 12, fontSize: '0.875rem', color }}>{data.caption}</p>
            )}
          </>
        ) : (
          <div style={{
            height: 200, borderRadius: 16, background: 'rgba(255,255,255,0.03)',
            border: '2px dashed rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.2)', fontSize: 14,
          }}>
            Cole a URL do YouTube, Vimeo ou vídeo direto no painel lateral
          </div>
        )}
      </div>
    </section>
  )
}

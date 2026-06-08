import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CarouselBlockProps } from '@/lib/types'

interface Props { data: CarouselBlockProps }

export default function CarouselBlock({ data }: Props) {
  const [current, setCurrent] = useState(0)
  const slides   = data.slides ?? []
  const py       = data.style?.paddingY ?? 48
  const bg       = data.style?.bg      ?? 'transparent'
  const showDots = data.showDots        ?? true
  const count    = slides.length

  const prev = useCallback(() => setCurrent(c => (c - 1 + count) % count), [count])
  const next = useCallback(() => setCurrent(c => (c + 1)         % count), [count])

  useEffect(() => {
    if (!data.autoplay || count <= 1) return
    const t = setInterval(next, (data.interval ?? 4) * 1000)
    return () => clearInterval(t)
  }, [data.autoplay, data.interval, count, next])

  if (count === 0) {
    return (
      <section style={{ background: bg, padding: `${py}px 32px` }}>
        <div style={{
          maxWidth: 900, margin: '0 auto', height: 200, borderRadius: 16,
          background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.2)', fontSize: 14,
        }}>
          Adicione slides no painel lateral
        </div>
      </section>
    )
  }

  const slide = slides[current]

  return (
    <section style={{ background: bg, padding: `${py}px 32px` }}>
      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative' }}>
        {/* Slide */}
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '16/9' }}>
          <img
            src={slide.src}
            alt={slide.alt ?? ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Nav buttons */}
          {count > 1 && (
            <>
              <button onClick={prev} style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 8,
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)',
              }}>
                <ChevronLeft style={{ width: 20, height: 20 }} />
              </button>
              <button onClick={next} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 8,
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)',
              }}>
                <ChevronRight style={{ width: 20, height: 20 }} />
              </button>
            </>
          )}
        </div>
        {/* Caption */}
        {slide.caption && (
          <p style={{ textAlign: 'center', marginTop: 12, fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)' }}>
            {slide.caption}
          </p>
        )}
        {/* Dots */}
        {showDots && count > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} style={{
                width: i === current ? 24 : 8, height: 8, borderRadius: 4,
                background: i === current ? '#E8521A' : 'rgba(255,255,255,0.2)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.25s',
              }} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

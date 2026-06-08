import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { AccordionBlockProps } from '@/lib/types'

interface Props { data: AccordionBlockProps }

export default function AccordionBlock({ data }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const py    = data.style?.paddingY ?? 48
  const bg    = data.style?.bg      ?? 'transparent'
  const color = data.style?.color   ?? '#EDEDED'

  return (
    <section style={{ background: bg, padding: `${py}px 32px` }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {data.title && (
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color, textAlign: 'center', marginBottom: 40 }}>
            {data.title}
          </h2>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.items.map(item => (
            <div
              key={item.id}
              style={{
                borderRadius: 12,
                background:   'rgba(255,255,255,0.04)',
                border:       '1px solid rgba(255,255,255,0.08)',
                overflow:     'hidden',
              }}
            >
              <button
                onClick={() => setOpen(o => o === item.id ? null : item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', padding: '18px 20px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color, fontSize: '1rem', fontWeight: 600, textAlign: 'left', gap: 16,
                }}
              >
                <span>{item.question}</span>
                <ChevronDown
                  style={{
                    width: 18, height: 18, color: 'rgba(255,255,255,0.4)', flexShrink: 0,
                    transform: open === item.id ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>
              {open === item.id && (
                <div style={{
                  padding: '0 20px 18px',
                  fontSize: '0.9375rem',
                  lineHeight: 1.7,
                  color: 'rgba(255,255,255,0.55)',
                }}>
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

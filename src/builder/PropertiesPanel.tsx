import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import type {
  PageBlock, BlockProps, BlockStyle,
  HeroProps, FeaturesProps, CTAProps,
  HeadingProps, TextBlockProps, ImageBlockProps,
  ButtonBlockProps, ButtonTarget,
  AccordionBlockProps, AccordionItem,
  VideoBlockProps, CarouselBlockProps, CarouselSlide,
} from '@/lib/types'

// ── Tokens ─────────────────────────────────────────────────────

const BG   = '#13151A'
const BOR  = 'rgba(255,255,255,0.07)'
const inputCls = cn(
  'w-full px-3 py-2 rounded-lg text-[12px] text-white/80 outline-none transition-all',
  'placeholder:text-white/20',
)
const inputStyle = { background: '#0D0E12', border: `1px solid ${BOR}` }

// ── Shared primitives ──────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{label}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, multiline }: {
  value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean
}) {
  if (multiline) return (
    <textarea
      className={inputCls} style={{ ...inputStyle, height: 72, resize: 'none', lineHeight: 1.5 }}
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(232,82,26,0.4)' }}
      onBlur={e  => { (e.target as HTMLTextAreaElement).style.borderColor = BOR }}
    />
  )
  return (
    <input
      className={inputCls} style={inputStyle}
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(232,82,26,0.4)' }}
      onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BOR }}
    />
  )
}

function SelectInput<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]
}) {
  return (
    <select
      className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}
      value={value} onChange={e => onChange(e.target.value as T)}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer shrink-0"
          style={{ padding: 2, background: '#0D0E12', border: `1px solid ${BOR}` }}
        />
        <input
          className={inputCls} style={inputStyle}
          value={value} onChange={e => onChange(e.target.value)} placeholder="#000000 ou rgba(...)"
          onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(232,82,26,0.4)' }}
          onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BOR }}
        />
      </div>
    </Field>
  )
}

function NumberInput({ value, onChange, label, min, max }: {
  value: number; onChange: (v: number) => void; label: string; min?: number; max?: number
}) {
  return (
    <Field label={label}>
      <input
        type="number" min={min} max={max}
        className={inputCls} style={inputStyle}
        value={value} onChange={e => onChange(Number(e.target.value))}
        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(232,82,26,0.4)' }}
        onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BOR }}
      />
    </Field>
  )
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-white/50">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className="relative rounded-full transition-all duration-200"
        style={{ width: 36, height: 20, background: value ? '#E8521A' : 'rgba(255,255,255,0.1)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 rounded-full bg-white transition-transform duration-200"
          style={{ width: 16, height: 16, transform: value ? 'translateX(16px)' : 'none' }}
        />
      </button>
    </div>
  )
}

function Sep() {
  return <div style={{ height: 1, background: BOR }} />
}

// ── Style section (shared) ─────────────────────────────────────

function StyleSection({ style, onChange }: { style: BlockStyle; onChange: (s: BlockStyle) => void }) {
  const s = style ?? {}
  const set = <K extends keyof BlockStyle>(k: K, v: BlockStyle[K]) => onChange({ ...s, [k]: v })
  return (
    <>
      <Sep />
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Estilo da seção</p>
      <Field label="Fundo (cor ou gradient)">
        <div className="flex items-center gap-2">
          <input type="color" value={s.bg || '#000000'} onChange={e => set('bg', e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer shrink-0"
            style={{ padding: 2, background: '#0D0E12', border: `1px solid ${BOR}` }} />
          <input className={inputCls} style={inputStyle}
            value={s.bg ?? ''} onChange={e => set('bg', e.target.value)}
            placeholder="transparent"
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(232,82,26,0.4)' }}
            onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BOR }} />
        </div>
      </Field>
      <ColorInput label="Cor do texto" value={s.color ?? ''} onChange={v => set('color', v)} />
      <NumberInput label="Espaço vertical (px)" value={s.paddingY ?? 48} onChange={v => set('paddingY', v)} min={0} max={320} />
      <Field label="Alinhamento">
        <SelectInput
          value={(s.align ?? 'center') as 'left' | 'center' | 'right'}
          onChange={v => set('align', v)}
          options={[
            { value: 'left',   label: 'Esquerda' },
            { value: 'center', label: 'Centro'   },
            { value: 'right',  label: 'Direita'  },
          ]}
        />
      </Field>
    </>
  )
}

// ── Per-block panels ───────────────────────────────────────────

function HeroPanel({ props, onChange }: { props: HeroProps; onChange: (p: HeroProps) => void }) {
  const s = (k: keyof HeroProps) => (v: string) => onChange({ ...props, [k]: v })
  return (
    <>
      <Field label="Título"><TextInput value={props.title} onChange={s('title')} /></Field>
      <Field label="Subtítulo"><TextInput value={props.subtitle} onChange={s('subtitle')} multiline /></Field>
      <Field label="Imagem de fundo (URL)"><TextInput value={props.backgroundImage} onChange={s('backgroundImage')} placeholder="https://..." /></Field>
      <Field label="Texto do botão"><TextInput value={props.buttonText} onChange={s('buttonText')} /></Field>
      <Field label="Link do botão"><TextInput value={props.buttonLink} onChange={s('buttonLink')} placeholder="/apply?product=slug" /></Field>
    </>
  )
}

function FeaturesPanel({ props, onChange }: { props: FeaturesProps; onChange: (p: FeaturesProps) => void }) {
  return (
    <>
      <Field label="Título da seção">
        <TextInput value={props.headline} onChange={v => onChange({ ...props, headline: v })} />
      </Field>
      {props.features.map((f, i) => (
        <div key={i} className="flex flex-col gap-2 pt-2" style={{ borderTop: `1px solid ${BOR}` }}>
          <p className="text-[10px] font-semibold text-white/25">Item {i + 1}</p>
          <Field label="Ícone Lucide"><TextInput value={f.icon} onChange={v => { const fs = [...props.features]; fs[i] = { ...f, icon: v }; onChange({ ...props, features: fs }) }} /></Field>
          <Field label="Título"><TextInput value={f.title} onChange={v => { const fs = [...props.features]; fs[i] = { ...f, title: v }; onChange({ ...props, features: fs }) }} /></Field>
          <Field label="Descrição"><TextInput value={f.description} onChange={v => { const fs = [...props.features]; fs[i] = { ...f, description: v }; onChange({ ...props, features: fs }) }} multiline /></Field>
        </div>
      ))}
    </>
  )
}

function CTAPanel({ props, onChange }: { props: CTAProps; onChange: (p: CTAProps) => void }) {
  const s = (k: keyof CTAProps) => (v: string) => onChange({ ...props, [k]: v })
  return (
    <>
      <Field label="Título"><TextInput value={props.title} onChange={s('title')} /></Field>
      <Field label="Subtítulo"><TextInput value={props.subtitle} onChange={s('subtitle')} /></Field>
      <Field label="Texto do botão"><TextInput value={props.buttonText} onChange={s('buttonText')} /></Field>
      <Field label="Link do botão"><TextInput value={props.buttonLink} onChange={s('buttonLink')} placeholder="/apply?product=slug" /></Field>
    </>
  )
}

function HeadingPanel({ props, onChange }: { props: HeadingProps; onChange: (p: HeadingProps) => void }) {
  return (
    <>
      <Field label="Texto">
        <TextInput value={props.text} onChange={v => onChange({ ...props, text: v })} multiline />
      </Field>
      <Field label="Nível">
        <SelectInput value={props.level ?? 'h2'} onChange={v => onChange({ ...props, level: v })}
          options={[{ value: 'h1', label: 'H1' }, { value: 'h2', label: 'H2' }, { value: 'h3', label: 'H3' }, { value: 'h4', label: 'H4' }]} />
      </Field>
      <Field label="Tamanho">
        <SelectInput value={props.fontSize ?? '3xl'} onChange={v => onChange({ ...props, fontSize: v })}
          options={[
            { value: 'xl', label: 'XL (20px)' }, { value: '2xl', label: '2XL (24px)' },
            { value: '3xl', label: '3XL (30px)' }, { value: '4xl', label: '4XL (36px)' },
            { value: '5xl', label: '5XL (48px)' }, { value: '6xl', label: '6XL (60px)' },
          ]} />
      </Field>
      <Field label="Peso">
        <SelectInput value={props.fontWeight ?? 'bold'} onChange={v => onChange({ ...props, fontWeight: v })}
          options={[{ value: 'normal', label: 'Normal' }, { value: 'semibold', label: 'Semibold' }, { value: 'bold', label: 'Bold' }, { value: 'extrabold', label: 'Extrabold' }]} />
      </Field>
      <StyleSection style={props.style ?? {}} onChange={s => onChange({ ...props, style: s })} />
    </>
  )
}

function TextPanel({ props, onChange }: { props: TextBlockProps; onChange: (p: TextBlockProps) => void }) {
  return (
    <>
      <Field label="Texto">
        <TextInput value={props.text} onChange={v => onChange({ ...props, text: v })} multiline />
      </Field>
      <Field label="Tamanho">
        <SelectInput value={props.fontSize ?? 'base'} onChange={v => onChange({ ...props, fontSize: v })}
          options={[
            { value: 'sm', label: 'Pequeno (14px)' }, { value: 'base', label: 'Normal (16px)' },
            { value: 'lg', label: 'Grande (18px)' }, { value: 'xl', label: 'XL (20px)' },
          ]} />
      </Field>
      <Toggle value={props.maxWidth ?? true} onChange={v => onChange({ ...props, maxWidth: v })} label="Largura máxima (720px)" />
      <StyleSection style={props.style ?? {}} onChange={s => onChange({ ...props, style: s })} />
    </>
  )
}

function ImagePanel({ props, onChange }: { props: ImageBlockProps; onChange: (p: ImageBlockProps) => void }) {
  return (
    <>
      <Field label="URL da imagem"><TextInput value={props.src} onChange={v => onChange({ ...props, src: v })} placeholder="https://..." /></Field>
      <Field label="Texto alternativo"><TextInput value={props.alt ?? ''} onChange={v => onChange({ ...props, alt: v })} /></Field>
      <Field label="Legenda"><TextInput value={props.caption ?? ''} onChange={v => onChange({ ...props, caption: v })} /></Field>
      <Field label="Link (opcional)"><TextInput value={props.link ?? ''} onChange={v => onChange({ ...props, link: v })} placeholder="https://..." /></Field>
      <Field label="Largura">
        <SelectInput value={props.width ?? 'lg'} onChange={v => onChange({ ...props, width: v })}
          options={[{ value: 'sm', label: 'Pequena (400px)' }, { value: 'md', label: 'Média (640px)' }, { value: 'lg', label: 'Grande (900px)' }, { value: 'full', label: 'Total' }]} />
      </Field>
      <NumberInput label="Arredondamento (px)" value={props.radius ?? 12} onChange={v => onChange({ ...props, radius: v })} min={0} max={64} />
      <Toggle value={props.shadow ?? false} onChange={v => onChange({ ...props, shadow: v })} label="Sombra" />
      <StyleSection style={props.style ?? {}} onChange={s => onChange({ ...props, style: s })} />
    </>
  )
}

function ButtonPanel({ props, onChange, productSlug }: {
  props: ButtonBlockProps; onChange: (p: ButtonBlockProps) => void; productSlug?: string
}) {
  function setTarget(t: ButtonTarget) {
    const url = t === 'form'     ? `/apply?product=${productSlug ?? ''}`
              : t === 'checkout' ? `/checkout/${productSlug ?? ''}`
              : props.url ?? ''
    onChange({ ...props, target: t, url, productSlug: t !== 'url' ? productSlug : props.productSlug })
  }

  return (
    <>
      <Field label="Texto do botão"><TextInput value={props.label} onChange={v => onChange({ ...props, label: v })} /></Field>
      <Field label="Destino do botão">
        <SelectInput value={props.target ?? 'url'} onChange={setTarget}
          options={[
            { value: 'form',     label: 'Formulário do produto' },
            { value: 'checkout', label: 'Checkout direto'       },
            { value: 'url',      label: 'Link personalizado'    },
          ]} />
      </Field>
      {(props.target === 'url' || !props.target) && (
        <Field label="URL"><TextInput value={props.url ?? ''} onChange={v => onChange({ ...props, url: v })} placeholder="https://..." /></Field>
      )}
      {(props.target === 'form' || props.target === 'checkout') && (
        <div className="px-3 py-2 rounded-lg text-[11px] text-white/40" style={{ background: 'rgba(232,82,26,0.08)', border: '1px solid rgba(232,82,26,0.15)' }}>
          URL: {props.url || '(defina o slug do produto)'}
        </div>
      )}
      <Field label="Estilo">
        <SelectInput value={props.variant ?? 'solid'} onChange={v => onChange({ ...props, variant: v })}
          options={[{ value: 'solid', label: 'Sólido' }, { value: 'outline', label: 'Contorno' }]} />
      </Field>
      <Field label="Tamanho">
        <SelectInput value={props.size ?? 'md'} onChange={v => onChange({ ...props, size: v })}
          options={[{ value: 'sm', label: 'Pequeno' }, { value: 'md', label: 'Médio' }, { value: 'lg', label: 'Grande' }]} />
      </Field>
      <ColorInput label="Cor do botão" value={props.color ?? '#E8521A'} onChange={v => onChange({ ...props, color: v })} />
      <ColorInput label="Cor do texto" value={props.textColor ?? '#ffffff'} onChange={v => onChange({ ...props, textColor: v })} />
      <Toggle value={props.fullWidth ?? false} onChange={v => onChange({ ...props, fullWidth: v })} label="Largura total" />
      <StyleSection style={props.style ?? {}} onChange={s => onChange({ ...props, style: s })} />
    </>
  )
}

function AccordionPanel({ props, onChange }: { props: AccordionBlockProps; onChange: (p: AccordionBlockProps) => void }) {
  function addItem() {
    onChange({ ...props, items: [...props.items, { id: uuid(), question: 'Nova pergunta', answer: 'Resposta aqui.' }] })
  }
  function removeItem(id: string) {
    onChange({ ...props, items: props.items.filter(i => i.id !== id) })
  }
  function updateItem(id: string, key: keyof AccordionItem, val: string) {
    onChange({ ...props, items: props.items.map(i => i.id === id ? { ...i, [key]: val } : i) })
  }

  return (
    <>
      <Field label="Título da seção (opcional)">
        <TextInput value={props.title ?? ''} onChange={v => onChange({ ...props, title: v })} />
      </Field>
      <div className="flex flex-col gap-3">
        {props.items.map((item, idx) => (
          <div key={item.id} className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BOR}` }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-white/25">Item {idx + 1}</span>
              <button onClick={() => removeItem(item.id)} className="text-red-400/60 hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <Field label="Pergunta"><TextInput value={item.question} onChange={v => updateItem(item.id, 'question', v)} /></Field>
            <Field label="Resposta"><TextInput value={item.answer} onChange={v => updateItem(item.id, 'answer', v)} multiline /></Field>
          </div>
        ))}
        <button onClick={addItem}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-white/40 hover:text-white/70 transition-colors"
          style={{ border: `1px dashed ${BOR}` }}>
          <Plus className="w-3.5 h-3.5" /> Adicionar item
        </button>
      </div>
      <StyleSection style={props.style ?? {}} onChange={s => onChange({ ...props, style: s })} />
    </>
  )
}

function VideoPanel({ props, onChange }: { props: VideoBlockProps; onChange: (p: VideoBlockProps) => void }) {
  return (
    <>
      <Field label="URL do vídeo">
        <TextInput value={props.url} onChange={v => onChange({ ...props, url: v })} placeholder="YouTube, Vimeo ou .mp4" />
      </Field>
      <Field label="Legenda"><TextInput value={props.caption ?? ''} onChange={v => onChange({ ...props, caption: v })} /></Field>
      <Toggle value={props.autoplay ?? false} onChange={v => onChange({ ...props, autoplay: v })} label="Autoplay (silenciado)" />
      <StyleSection style={props.style ?? {}} onChange={s => onChange({ ...props, style: s })} />
    </>
  )
}

function CarouselPanel({ props, onChange }: { props: CarouselBlockProps; onChange: (p: CarouselBlockProps) => void }) {
  function addSlide() {
    const s: CarouselSlide = { id: uuid(), src: '', alt: '', caption: '' }
    onChange({ ...props, slides: [...props.slides, s] })
  }
  function removeSlide(id: string) { onChange({ ...props, slides: props.slides.filter(s => s.id !== id) }) }
  function updateSlide(id: string, key: keyof CarouselSlide, val: string) {
    onChange({ ...props, slides: props.slides.map(s => s.id === id ? { ...s, [key]: val } : s) })
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {props.slides.map((slide, idx) => (
          <div key={slide.id} className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BOR}` }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-white/25">Slide {idx + 1}</span>
              <button onClick={() => removeSlide(slide.id)} className="text-red-400/60 hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <Field label="URL da imagem"><TextInput value={slide.src} onChange={v => updateSlide(slide.id, 'src', v)} placeholder="https://..." /></Field>
            <Field label="Legenda"><TextInput value={slide.caption ?? ''} onChange={v => updateSlide(slide.id, 'caption', v)} /></Field>
            <Field label="Link (opcional)"><TextInput value={slide.alt ?? ''} onChange={v => updateSlide(slide.id, 'alt', v)} placeholder="Alt text" /></Field>
          </div>
        ))}
        <button onClick={addSlide}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-white/40 hover:text-white/70 transition-colors"
          style={{ border: `1px dashed ${BOR}` }}>
          <Plus className="w-3.5 h-3.5" /> Adicionar slide
        </button>
      </div>
      <Toggle value={props.autoplay ?? false} onChange={v => onChange({ ...props, autoplay: v })} label="Autoplay" />
      {props.autoplay && (
        <NumberInput label="Intervalo (segundos)" value={props.interval ?? 4} onChange={v => onChange({ ...props, interval: v })} min={1} max={30} />
      )}
      <Toggle value={props.showDots ?? true} onChange={v => onChange({ ...props, showDots: v })} label="Mostrar indicadores" />
      <StyleSection style={props.style ?? {}} onChange={s => onChange({ ...props, style: s })} />
    </>
  )
}

// ── Panel ─────────────────────────────────────────────────────

const BLOCK_LABELS: Record<string, string> = {
  HeroBlock: 'Hero', FeaturesBlock: 'Benefícios', CallToActionBlock: 'CTA',
  HeadingBlock: 'Título', TextBlock: 'Texto', ImageBlock: 'Imagem',
  ButtonBlock: 'Botão', AccordionBlock: 'Acordeão',
  VideoBlock: 'Vídeo', CarouselBlock: 'Carrossel',
}

interface Props {
  block:        PageBlock | null
  onChange:     (id: string, props: BlockProps) => void
  productSlug?: string
}

export default function PropertiesPanel({ block, onChange, productSlug }: Props) {
  if (!block) {
    return (
      <aside className="w-64 shrink-0 flex items-center justify-center"
        style={{ background: BG, borderLeft: `1px solid ${BOR}` }}>
        <div className="text-center px-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BOR}` }}>
            <svg className="w-4 h-4 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <p className="text-[12px] text-white/25 leading-relaxed">
            Clique em um bloco para editar suas propriedades
          </p>
        </div>
      </aside>
    )
  }

  const p  = block.props
  const up = (next: BlockProps) => onChange(block.id, next)

  return (
    <aside className="w-64 shrink-0 flex flex-col overflow-hidden"
      style={{ background: BG, borderLeft: `1px solid ${BOR}` }}>
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: `1px solid ${BOR}` }}>
        <span className="w-2 h-2 rounded-full bg-[#E8521A]" />
        <span className="text-[12px] font-semibold text-white/70">
          {BLOCK_LABELS[block.type] ?? block.type}
        </span>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {block.type === 'HeroBlock'         && <HeroPanel      props={p as HeroProps}            onChange={up as (p: HeroProps) => void} />}
        {block.type === 'FeaturesBlock'     && <FeaturesPanel  props={p as FeaturesProps}        onChange={up as (p: FeaturesProps) => void} />}
        {block.type === 'CallToActionBlock' && <CTAPanel       props={p as CTAProps}             onChange={up as (p: CTAProps) => void} />}
        {block.type === 'HeadingBlock'      && <HeadingPanel   props={p as HeadingProps}         onChange={up as (p: HeadingProps) => void} />}
        {block.type === 'TextBlock'         && <TextPanel      props={p as TextBlockProps}       onChange={up as (p: TextBlockProps) => void} />}
        {block.type === 'ImageBlock'        && <ImagePanel     props={p as ImageBlockProps}      onChange={up as (p: ImageBlockProps) => void} />}
        {block.type === 'ButtonBlock'       && <ButtonPanel    props={p as ButtonBlockProps}     onChange={up as (p: ButtonBlockProps) => void} productSlug={productSlug} />}
        {block.type === 'AccordionBlock'    && <AccordionPanel props={p as AccordionBlockProps}  onChange={up as (p: AccordionBlockProps) => void} />}
        {block.type === 'VideoBlock'        && <VideoPanel     props={p as VideoBlockProps}      onChange={up as (p: VideoBlockProps) => void} />}
        {block.type === 'CarouselBlock'     && <CarouselPanel  props={p as CarouselBlockProps}   onChange={up as (p: CarouselBlockProps) => void} />}
      </div>
    </aside>
  )
}

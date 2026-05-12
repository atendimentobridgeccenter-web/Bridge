import { cn } from '@/lib/cn'
import type { PageBlock, BlockProps, HeroProps, FeaturesProps, CTAProps } from '@/lib/types'

interface Props {
  block: PageBlock | null
  onChange: (id: string, props: BlockProps) => void
}

// ── Shared field components ───────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls = cn(
  'w-full px-2.5 py-1.5 rounded-lg text-xs text-white',
  'bg-zinc-800/80 border border-white/8',
  'focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20',
  'transition-all duration-150 placeholder:text-zinc-600',
)

const textareaCls = cn(inputCls, 'h-20 resize-none leading-relaxed')

// ── Hero properties ───────────────────────────────────────────

function HeroProperties({
  props,
  onUpdate,
}: { props: HeroProps; onUpdate: (p: HeroProps) => void }) {
  const set = (key: keyof HeroProps) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onUpdate({ ...props, [key]: e.target.value })

  return (
    <>
      <Field label="Título">
        <input className={inputCls} value={props.title} onChange={set('title')} placeholder="Título principal" />
      </Field>
      <Field label="Subtítulo">
        <textarea className={textareaCls} value={props.subtitle} onChange={set('subtitle')} placeholder="Proposta de valor" />
      </Field>
      <Field label="Imagem de fundo">
        <input className={inputCls} value={props.backgroundImage} onChange={set('backgroundImage')} placeholder="https://..." />
      </Field>
      <Field label="Texto do botão">
        <input className={inputCls} value={props.buttonText} onChange={set('buttonText')} placeholder="Quero começar" />
      </Field>
      <Field label="Link do botão">
        <input className={inputCls} value={props.buttonLink} onChange={set('buttonLink')} placeholder="/apply" />
      </Field>
    </>
  )
}

// ── Features properties ───────────────────────────────────────

function FeaturesProperties({
  props,
  onUpdate,
}: { props: FeaturesProps; onUpdate: (p: FeaturesProps) => void }) {
  const setHeadline = (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdate({ ...props, headline: e.target.value })

  const setFeature = (
    idx: number,
    key: 'icon' | 'title' | 'description',
    val: string,
  ) => {
    const features = props.features.map((f, i) =>
      i === idx ? { ...f, [key]: val } : f,
    )
    onUpdate({ ...props, features })
  }

  return (
    <>
      <Field label="Título da seção">
        <input className={inputCls} value={props.headline} onChange={setHeadline} />
      </Field>
      {props.features.map((f, i) => (
        <div key={i} className="space-y-2 pt-2 border-t border-white/6">
          <p className="text-[11px] font-semibold text-zinc-400">Feature {i + 1}</p>
          <Field label="Ícone Lucide">
            <input
              className={inputCls} value={f.icon}
              onChange={e => setFeature(i, 'icon', e.target.value)}
              placeholder="Zap"
            />
          </Field>
          <Field label="Título">
            <input
              className={inputCls} value={f.title}
              onChange={e => setFeature(i, 'title', e.target.value)}
            />
          </Field>
          <Field label="Descrição">
            <textarea
              className={cn(textareaCls, 'h-14')} value={f.description}
              onChange={e => setFeature(i, 'description', e.target.value)}
            />
          </Field>
        </div>
      ))}
    </>
  )
}

// ── CTA properties ────────────────────────────────────────────

function CTAProperties({
  props,
  onUpdate,
}: { props: CTAProps; onUpdate: (p: CTAProps) => void }) {
  const set = (key: keyof CTAProps) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onUpdate({ ...props, [key]: e.target.value })

  return (
    <>
      <Field label="Título">
        <input className={inputCls} value={props.title} onChange={set('title')} />
      </Field>
      <Field label="Subtítulo">
        <input className={inputCls} value={props.subtitle} onChange={set('subtitle')} />
      </Field>
      <Field label="Texto do botão">
        <input className={inputCls} value={props.buttonText} onChange={set('buttonText')} />
      </Field>
      <Field label="Link do botão">
        <input className={inputCls} value={props.buttonLink} onChange={set('buttonLink')} placeholder="/apply" />
      </Field>
    </>
  )
}

// ── Panel ─────────────────────────────────────────────────────

export default function PropertiesPanel({ block, onChange }: Props) {
  if (!block) {
    return (
      <aside className="w-64 shrink-0 bg-zinc-900/60 border-l border-white/6
                        flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Clique em um bloco no canvas para editar suas propriedades
          </p>
        </div>
      </aside>
    )
  }

  const type  = block.type
  const props = block.props

  const blockLabel: Record<string, string> = {
    HeroBlock: 'Hero',
    FeaturesBlock: 'Features',
    CallToActionBlock: 'CTA',
  }

  return (
    <aside className="w-64 shrink-0 flex flex-col bg-zinc-900/60 border-l border-white/6 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-white/6">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
        <span className="text-xs font-semibold text-zinc-300">
          {blockLabel[type] ?? type}
        </span>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {type === 'HeroBlock' && (
          <HeroProperties
            props={props as HeroProps}
            onUpdate={p => onChange(block.id, p)}
          />
        )}
        {type === 'FeaturesBlock' && (
          <FeaturesProperties
            props={props as FeaturesProps}
            onUpdate={p => onChange(block.id, p)}
          />
        )}
        {type === 'CallToActionBlock' && (
          <CTAProperties
            props={props as CTAProps}
            onUpdate={p => onChange(block.id, p)}
          />
        )}
      </div>
    </aside>
  )
}

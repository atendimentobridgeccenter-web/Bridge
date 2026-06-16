import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Save, Globe, Settings, CreditCard,
  ClipboardList, LayoutTemplate, ExternalLink,
  Loader2, Check, Image as ImageIcon, Upload,
  AlertTriangle, Zap, Plus, Radio, Tag,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { Product, ProductStatus } from '@/lib/types'
import FormBuilder, { type FormNode } from '@/components/form-builder/FormBuilder'
import StripePricePicker from '@/components/StripePricePicker'
import { useProduct } from '@/hooks/useProduct'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useBuilderStore } from '@/stores/useBuilderStore'
import type { TrackingConfig } from '@/components/form-builder/QuizzRunner'

// ── Tokens ────────────────────────────────────────────────────

const BG_PAGE  = '#0F1117'
const BG_CARD  = '#1A1C23'
const BG_INPUT = '#0D0E12'

// ── Tabs config ───────────────────────────────────────────────

type TabId = 'geral' | 'precificacao' | 'formulario' | 'rastreio' | 'vendas'

const TABS: { id: TabId; icon: React.ElementType; label: string }[] = [
  { id: 'geral',        icon: Settings,      label: 'Geral'           },
  { id: 'precificacao', icon: CreditCard,     label: 'Precificação'    },
  { id: 'formulario',   icon: ClipboardList,  label: 'Formulário'      },
  { id: 'rastreio',     icon: Radio,          label: 'Rastreio'        },
  { id: 'vendas',       icon: LayoutTemplate, label: 'Página de Vendas'},
]

// ── Status badge ──────────────────────────────────────────────

const STATUS_STYLE: Record<ProductStatus, { label: string; cls: string }> = {
  published: { label: 'Publicado', cls: 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20' },
  draft:     { label: 'Rascunho',  cls: 'bg-amber-500/12  text-amber-400  border border-amber-500/20'    },
  archived:  { label: 'Arquivado', cls: 'bg-white/4        text-white/30   border border-white/8'         },
}

// ── Shared primitives ─────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className="text-[12px] font-semibold text-white/50">{label}</label>
        {hint && <p className="text-[11px] text-white/25 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', mono }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED]',
        'placeholder:text-white/20 outline-none transition-all',
        mono && 'font-mono',
      )}
      style={{ background: BG_INPUT, border: '1px solid rgba(255,255,255,0.07)' }}
      onFocus={e  => { e.currentTarget.style.borderColor = 'rgba(232,82,26,0.45)' }}
      onBlur={e   => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED]
                 placeholder:text-white/20 outline-none resize-none transition-all"
      style={{ background: BG_INPUT, border: '1px solid rgba(255,255,255,0.07)' }}
      onFocus={e  => { e.currentTarget.style.borderColor = 'rgba(232,82,26,0.45)' }}
      onBlur={e   => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
    />
  )
}

function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 p-5 rounded-xl"
      style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <p className="text-[13px] font-semibold text-[#EDEDED]">{title}</p>
        {description && <p className="text-[11px] text-white/30 mt-0.5">{description}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

// ── Geral tab ─────────────────────────────────────────────────

function GeralPanel({
  product, onUpdate, onThumbnailClick, uploading,
}: {
  product:          Partial<Product>
  onUpdate:         (fields: Partial<Product>) => void
  onThumbnailClick: () => void
  uploading:        boolean
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main fields */}
      <div className="lg:col-span-2 flex flex-col gap-5">
        <Section title="Informações Básicas" description="Dados públicos exibidos na página de vendas.">
          <Field label="Nome do Produto">
            <Input
              value={product.name ?? ''}
              onChange={v => onUpdate({ name: v })}
              placeholder="Ex: Mentoria Intensiva Koukousei"
            />
          </Field>
          <Field label="Slug da URL" hint="Gerado automaticamente. Você pode editar.">
            <div className="flex items-center rounded-lg overflow-hidden"
              style={{ background: BG_INPUT, border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="px-3 text-[12px] text-white/25 select-none shrink-0"
                style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                bridge.com/
              </span>
              <input
                value={product.slug ?? ''}
                onChange={e => onUpdate({ slug: e.target.value })}
                className="flex-1 px-3 py-2.5 bg-transparent text-[13px] text-[#EDEDED]
                           placeholder:text-white/20 outline-none"
                placeholder="mentoria-intensiva"
              />
            </div>
          </Field>
          <Field label="Descrição" hint="Aparece nas listagens e no e-mail de confirmação.">
            <Textarea
              value={product.description ?? ''}
              onChange={v => onUpdate({ description: v })}
              placeholder="Descreva o que o aluno vai aprender ou conquistar..."
              rows={5}
            />
          </Field>
        </Section>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-4">
        {/* Thumbnail */}
        <Section title="Thumbnail" description="Imagem de capa do produto. PNG ou JPG, máx. 4MB.">
          <button
            type="button"
            onClick={onThumbnailClick}
            disabled={uploading}
            className="w-full aspect-video rounded-xl flex flex-col items-center justify-center gap-3
                       border-2 border-dashed transition-all relative overflow-hidden"
            style={{ borderColor: 'rgba(255,255,255,0.07)', background: BG_INPUT }}
            onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,82,26,0.4)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)' }}
          >
            {product.thumbnail_url && !uploading ? (
              <>
                <img src={product.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity
                                flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-white" />
                  <span className="text-[12px] text-white font-medium">Trocar imagem</span>
                </div>
              </>
            ) : uploading ? (
              <Loader2 className="w-5 h-5 text-[#E8521A] animate-spin" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(232,82,26,0.1)' }}>
                  <ImageIcon className="w-5 h-5 text-[#E8521A]" />
                </div>
                <div className="text-center px-4">
                  <p className="text-[12px] font-medium text-white/40">Clique para enviar</p>
                  <p className="text-[11px] text-white/20 mt-0.5">PNG, JPG, WebP · Máx. 4MB</p>
                </div>
              </>
            )}
          </button>
          {product.thumbnail_url && (
            <button
              type="button"
              onClick={() => onUpdate({ thumbnail_url: null })}
              className="text-[11px] text-white/25 hover:text-red-400 transition-colors text-center w-full"
            >
              Remover imagem
            </button>
          )}
        </Section>

        {/* Status */}
        <Section title="Visibilidade">
          <div className="flex flex-col gap-2">
            {(['draft', 'published', 'archived'] as ProductStatus[]).map(s => {
              const st     = STATUS_STYLE[s]
              const active = product.status === s
              return (
                <button
                  key={s}
                  onClick={() => onUpdate({ status: s })}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all w-full',
                    active ? 'ring-1 ring-[#E8521A]/40' : '',
                  )}
                  style={{ background: active ? 'rgba(232,82,26,0.06)' : BG_INPUT, border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md', st.cls)}>
                    {st.label}
                  </span>
                  {active && <Check className="w-3.5 h-3.5 text-[#E8521A] ml-auto" />}
                </button>
              )
            })}
          </div>
        </Section>
      </div>
    </div>
  )
}

// ── Precificação tab ──────────────────────────────────────────

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative shrink-0 w-11 h-6 rounded-full transition-all duration-200"
      style={{ background: enabled ? '#E8521A' : 'rgba(255,255,255,0.1)' }}
    >
      <span
        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm"
        style={{ transform: enabled ? 'translateX(24px)' : 'translateX(4px)' }}
      />
    </button>
  )
}

function PrecificacaoPanel({
  product, onUpdate, formNodes,
}: {
  product:   Partial<Product>
  onUpdate:  (fields: Partial<Product>) => void
  formNodes: FormNode[]
}) {
  const [showCreate,     setShowCreate]     = useState(false)
  const [createAmount,   setCreateAmount]   = useState('')
  const [createCurrency, setCreateCurrency] = useState<'brl' | 'jpy'>('brl')
  const [createLoading,  setCreateLoading]  = useState(false)
  const [createError,    setCreateError]    = useState<string | null>(null)

  // Derive checkout enabled from checkout_config.type
  const checkoutCfg     = (product.checkout_config ?? {}) as Record<string, unknown>
  const checkoutEnabled = checkoutCfg?.type !== 'lead'

  function toggleCheckout() {
    onUpdate({
      checkout_config: {
        ...checkoutCfg,
        type: checkoutEnabled ? 'lead' : 'paid',
      } as Product['checkout_config'],
    })
  }

  // Collect option prices from quiz nodes
  const quizPrices: { option: string; priceId: string; amount: number; currency: string }[] = []
  for (const node of formNodes) {
    if (node.optionPrices) {
      for (const [option, price] of Object.entries(node.optionPrices)) {
        if (price?.priceId) quizPrices.push({ option, ...price })
      }
    }
  }

  const hasPrice = !!product.price_id_stripe
  const rawId    = (product.price_id_stripe ?? '').replace(/^price_/, '')

  async function handleCreatePrice() {
    if (!product.id || !product.name) return
    const amount = parseFloat(createAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) { setCreateError('Informe um valor válido.'); return }
    setCreateLoading(true)
    setCreateError(null)
    try {
      const { data, error } = await supabase.functions.invoke('sync-stripe-product', {
        body: {
          productId:   product.id,
          name:        product.name,
          description: product.description ?? '',
          amount:      createCurrency === 'brl' ? Math.round(amount * 100) : Math.round(amount),
          currency:    createCurrency,
        },
      })
      if (error) throw new Error(typeof error === 'object' && 'message' in error ? String((error as {message: unknown}).message) : String(error))
      if (!data?.priceId) throw new Error('Resposta inválida da função.')
      onUpdate({ price_id_stripe: data.priceId as string })
      setShowCreate(false)
      setCreateAmount('')
      toast.success('Preço criado no Stripe e vinculado ao produto!')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erro ao criar preço.')
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Toggle principal ──────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-xl transition-all"
        style={checkoutEnabled
          ? { background: 'rgba(232,82,26,0.06)', border: '1px solid rgba(232,82,26,0.18)' }
          : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }
        }
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all"
          style={checkoutEnabled
            ? { background: 'rgba(232,82,26,0.12)' }
            : { background: 'rgba(255,255,255,0.05)' }
          }
        >
          <CreditCard className={cn('w-4 h-4', checkoutEnabled ? 'text-[#E8521A]' : 'text-white/25')} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn('text-[14px] font-bold tracking-tight', checkoutEnabled ? 'text-[#EDEDED]' : 'text-white/35')}>
            Checkout de Pagamento
          </p>
          <p className="text-[11px] text-white/30 mt-0.5">
            {checkoutEnabled
              ? 'Ativo — o quizz vai redirecionar para o Stripe ao final.'
              : 'Desativado — o quizz funciona apenas como captação de lead.'}
          </p>
        </div>

        <Toggle enabled={checkoutEnabled} onToggle={toggleCheckout} />
      </div>

      {/* ── Configuração de preço (só quando checkout ativo) ────── */}
      {checkoutEnabled ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Preço Principal */}
          <div className="flex flex-col gap-4">
            <Section title="Selecionar Preço Existente" description="Busca preços ativos na sua conta Stripe.">
              <Field label="Preço do Stripe" hint="Clique para buscar preços ativos.">
                <StripePricePicker
                  value={product.price_id_stripe ?? ''}
                  onChange={(priceId) => onUpdate({ price_id_stripe: priceId })}
                />
              </Field>
              {hasPrice && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[11px] text-emerald-400 font-mono truncate flex-1">price_{rawId}</span>
                  <a href={`https://dashboard.stripe.com/prices/${product.price_id_stripe}`}
                    target="_blank" rel="noreferrer"
                    className="text-[10px] text-white/25 hover:text-white/50 flex items-center gap-1 shrink-0">
                    <ExternalLink className="w-2.5 h-2.5" /> Stripe
                  </a>
                </div>
              )}
              <a href="https://dashboard.stripe.com/products" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/50 transition-colors">
                <ExternalLink className="w-3 h-3" /> Abrir Stripe Dashboard
              </a>
            </Section>

            {/* Criar Preço no Stripe */}
            <Section title="Criar Novo Preço no Stripe" description="Cria o produto e preço no Stripe automaticamente.">
              {!showCreate ? (
                <button onClick={() => setShowCreate(true)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all"
                  style={{ background: 'rgba(232,82,26,0.08)', border: '1px dashed rgba(232,82,26,0.3)', color: '#E8521A' }}>
                  <Plus className="w-3.5 h-3.5" /> Criar e vincular preço
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Field label="Valor">
                    <div className="flex gap-2">
                      <select value={createCurrency} onChange={e => setCreateCurrency(e.target.value as 'brl' | 'jpy')}
                        className="px-3 py-2.5 rounded-lg text-[13px] text-[#EDEDED] outline-none appearance-none"
                        style={{ background: BG_INPUT, border: '1px solid rgba(255,255,255,0.07)', width: '80px' }}>
                        <option value="brl">BRL</option>
                        <option value="jpy">JPY</option>
                      </select>
                      <input type="number" value={createAmount} onChange={e => setCreateAmount(e.target.value)}
                        placeholder={createCurrency === 'brl' ? '297' : '12000'}
                        className="flex-1 px-3 py-2.5 rounded-lg text-[13px] text-[#EDEDED] outline-none [appearance:textfield]"
                        style={{ background: BG_INPUT, border: '1px solid rgba(255,255,255,0.07)' }} />
                    </div>
                    <p className="text-[10px] text-white/25 mt-1">
                      {createCurrency === 'brl' ? 'Valor em reais (297 = R$297,00)' : 'Valor em ienes (12000 = ¥12.000)'}
                    </p>
                  </Field>
                  {createError && (
                    <p className="text-[11px] text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {createError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleCreatePrice} disabled={createLoading || !createAmount}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all disabled:opacity-50"
                      style={{ background: '#E8521A' }}>
                      {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      {createLoading ? 'Criando…' : 'Criar no Stripe'}
                    </button>
                    <button onClick={() => { setShowCreate(false); setCreateError(null); setCreateAmount('') }}
                      className="px-4 py-2.5 rounded-lg text-[12px] text-white/30 hover:text-white/60 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </Section>
          </div>

          {/* Preços Adicionais ao Checkout */}
          {(() => {
            const extraIds = ((checkoutCfg.extra_price_ids ?? []) as string[])
            function setExtraIds(ids: string[]) {
              onUpdate({ checkout_config: { ...checkoutCfg, extra_price_ids: ids } as Product['checkout_config'] })
            }
            return (
              <Section
                title="Cobranças Adicionais"
                description="Adicione mais de um preço Stripe no mesmo checkout (ex: matrícula + mensalidade)."
              >
                {extraIds.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-3">
                    {extraIds.map((pid, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <span className="text-[11px] font-mono text-white/50 flex-1 truncate">{pid}</span>
                        <button
                          onClick={() => setExtraIds(extraIds.filter((_, j) => j !== i))}
                          className="text-white/20 hover:text-red-400 transition-colors shrink-0 text-[14px] leading-none"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <StripePricePicker
                  value=""
                  onChange={(priceId) => {
                    if (!priceId || extraIds.includes(priceId)) return
                    setExtraIds([...extraIds, priceId])
                  }}
                  placeholder="Selecionar e adicionar preço…"
                />
                <p className="text-[10px] text-white/20 mt-1">
                  Todos os preços acima serão cobrados juntos no checkout do cartão.
                </p>
              </Section>
            )
          })()}

          {/* Preços do Quizz */}
          <Section title="Preços por Opção do Quizz" description="Price IDs definidos nas opções do Formulário.">
            {quizPrices.length === 0 ? (
              <div className="py-6 flex flex-col items-center gap-2 text-center">
                <p className="text-[12px] text-white/30">Nenhum preço vinculado a opções do quizz.</p>
                <p className="text-[11px] text-white/20 leading-relaxed">
                  Na aba <strong className="text-white/35">Formulário</strong>, selecione uma questão de múltipla escolha
                  e configure um Price ID por opção.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {quizPrices.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-[#EDEDED] truncate">{p.option}</p>
                      <p className="text-[10px] font-mono text-white/25 truncate mt-0.5">{p.priceId}</p>
                    </div>
                    <span className="text-[13px] font-bold font-mono text-[#E8521A] shrink-0">
                      {p.currency.toUpperCase() === 'JPY'
                        ? `¥${p.amount.toLocaleString()}`
                        : `R$${(p.amount / 100).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      ) : (
        /* ── Modo Captação de Lead ────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-10 gap-4 text-center rounded-xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <CreditCard className="w-5 h-5 text-white/20" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white/30">Modo Captação de Lead</p>
            <p className="text-[11px] text-white/20 mt-1 leading-relaxed max-w-xs">
              O quizz coletará os dados do lead e exibirá uma tela de confirmação.<br />
              Nenhum redirecionamento para checkout será feito.
            </p>
          </div>
          <button onClick={toggleCheckout}
            className="text-[11px] text-[#E8521A]/70 hover:text-[#E8521A] transition-colors">
            Ativar checkout →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Formulário tab ────────────────────────────────────────────

function FormularioPanel({ nodes, onChange, allowedPriceIds }: { nodes: FormNode[]; onChange: (nodes: FormNode[]) => void; allowedPriceIds?: string[] }) {
  return <FormBuilder nodes={nodes} onChange={onChange} allowedPriceIds={allowedPriceIds} />
}

// ── Rastreio tab ──────────────────────────────────────────────

function RastreioPanel({
  product, onUpdate,
}: {
  product:  Partial<Product>
  onUpdate: (fields: Partial<Product>) => void
}) {
  const checkoutCfg = (product.checkout_config ?? {}) as Record<string, unknown>
  const tracking    = (checkoutCfg.tracking ?? {}) as TrackingConfig

  function updateTracking(patch: Partial<TrackingConfig>) {
    onUpdate({
      checkout_config: {
        ...checkoutCfg,
        tracking: { ...tracking, ...patch },
      } as Product['checkout_config'],
    })
  }

  const labelCls = 'text-[12px] font-semibold text-white/50'
  const hintCls  = 'text-[11px] text-white/25 mt-0.5'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── Coluna esquerda: pixels ── */}
      <div className="flex flex-col gap-5">

        {/* Meta Pixel */}
        <Section title="Meta Pixel (Facebook Ads)" description="Rastreia visitantes e conversões para suas campanhas no Meta.">
          <Field label="Pixel ID" hint="Ex: 1234567890123456">
            <Input
              value={tracking.metaPixelId ?? ''}
              onChange={v => updateTracking({ metaPixelId: v || undefined })}
              placeholder="Pixel ID do Meta"
              mono
            />
          </Field>
          {tracking.metaPixelId && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-emerald-400">Pixel configurado — será injetado no carregamento do formulário</span>
            </div>
          )}
        </Section>

        {/* Google Analytics */}
        <Section title="Google Analytics 4" description="Rastreie sessões, eventos e conversões via GA4.">
          <Field label="Measurement ID" hint="Ex: G-XXXXXXXXXX">
            <Input
              value={tracking.gaMeasurementId ?? ''}
              onChange={v => updateTracking({ gaMeasurementId: v || undefined })}
              placeholder="G-XXXXXXXXXX"
              mono
            />
          </Field>
        </Section>

        {/* Google Tag Manager */}
        <Section title="Google Tag Manager" description="Gerencie todos os seus scripts via GTM sem alterar o código.">
          <Field label="Container ID" hint="Ex: GTM-XXXXXXX">
            <Input
              value={tracking.gtmContainerId ?? ''}
              onChange={v => updateTracking({ gtmContainerId: v || undefined })}
              placeholder="GTM-XXXXXXX"
              mono
            />
          </Field>
        </Section>

        {/* Google Ads */}
        <Section title="Google Ads Conversion" description="Dispara uma conversão específica quando o lead conclui o formulário.">
          <Field label="Conversion ID" hint="Ex: AW-XXXXXXXXX">
            <Input
              value={tracking.googleAdsConversionId ?? ''}
              onChange={v => updateTracking({ googleAdsConversionId: v || undefined })}
              placeholder="AW-XXXXXXXXX"
              mono
            />
          </Field>
          <Field label="Conversion Label">
            <Input
              value={tracking.googleAdsConversionLabel ?? ''}
              onChange={v => updateTracking({ googleAdsConversionLabel: v || undefined })}
              placeholder="XXXXXXXXXXX"
              mono
            />
          </Field>
        </Section>
      </div>

      {/* ── Coluna direita: nomes de eventos + info ── */}
      <div className="flex flex-col gap-5">

        {/* Personalizar nomes de eventos */}
        <Section title="Personalizar Eventos" description="Nome do evento disparado ao concluir o formulário e ao efetuar uma compra.">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-3.5 h-3.5 text-white/30" />
            <p className={labelCls}>Evento de Lead (form concluído)</p>
          </div>
          <Input
            value={tracking.leadEventName ?? ''}
            onChange={v => updateTracking({ leadEventName: v || undefined })}
            placeholder="Lead"
          />
          <p className={hintCls}>Padrão: <code className="text-white/40">Lead</code> — dispara no Meta Pixel e GA4</p>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />

          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-3.5 h-3.5 text-white/30" />
            <p className={labelCls}>Evento de Compra (checkout concluído)</p>
          </div>
          <Input
            value={tracking.purchaseEventName ?? ''}
            onChange={v => updateTracking({ purchaseEventName: v || undefined })}
            placeholder="Purchase"
          />
          <p className={hintCls}>Padrão: <code className="text-white/40">Purchase</code> — disparado via Stripe webhook</p>
        </Section>

        {/* Como funciona */}
        <div className="rounded-xl p-5 flex flex-col gap-3"
          style={{ background: 'rgba(232,82,26,0.04)', border: '1px solid rgba(232,82,26,0.12)' }}>
          <p className="text-[12px] font-semibold text-[#EDEDED]">Como funciona o rastreio</p>
          <div className="flex flex-col gap-2.5 text-[11px] leading-relaxed text-white/40">
            <div className="flex gap-2">
              <span className="text-[#E8521A] shrink-0 mt-0.5">①</span>
              <span>Os scripts (Pixel, GA4, GTM) são injetados quando o visitante abre o formulário.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#E8521A] shrink-0 mt-0.5">②</span>
              <span>Ao concluir o formulário (lead qualificado), o evento de <strong className="text-white/60">Lead</strong> é disparado automaticamente.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#E8521A] shrink-0 mt-0.5">③</span>
              <span>Leads desqualificados pelas regras de lógica <strong className="text-white/60">não disparam</strong> eventos de conversão.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#E8521A] shrink-0 mt-0.5">④</span>
              <span>O evento de <strong className="text-white/60">Purchase</strong> é disparado pelo webhook Stripe após pagamento confirmado.</span>
            </div>
          </div>
        </div>

        {/* CRM info */}
        <div className="rounded-xl p-5 flex flex-col gap-3"
          style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.12)' }}>
          <p className="text-[12px] font-semibold text-[#EDEDED]">CRM automático</p>
          <p className="text-[11px] text-white/40 leading-relaxed">
            Todo lead que conclui o formulário é salvo automaticamente na tabela <code className="text-emerald-400/70">leads</code> com nome, e-mail, telefone, cidade, estado, respostas completas e status de qualificação.
          </p>
          <p className="text-[11px] text-emerald-400/60">
            Acesse os leads em breve na seção CRM do painel Bridge.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Vendas tab ────────────────────────────────────────────────

function VendasPanel({ productId, productSlug }: { productId: string; productSlug?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(232,82,26,0.1)', border: '1px solid rgba(232,82,26,0.15)' }}>
        <LayoutTemplate className="w-7 h-7 text-[#E8521A]" />
      </div>
      <div>
        <h3 className="text-[15px] font-bold text-[#EDEDED] tracking-tight">Editor Visual de Página de Vendas</h3>
        <p className="text-[13px] text-white/30 mt-2 max-w-sm leading-relaxed">
          Abra o editor completo para criar blocos, editar layout e publicar a página de vendas deste produto.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to={`/admin/products/${productId}/edit`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold text-white transition-all"
          style={{ background: '#E8521A', boxShadow: '0 4px 24px rgba(232,82,26,0.2)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#C43E10' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#E8521A' }}
        >
          <Globe className="w-3.5 h-3.5" />
          Abrir Editor Visual
        </Link>

        {productSlug && (
          <a
            href={`/${productSlug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver página pública
          </a>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function ProductConfigPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  // ── Server state (React Query) ──────────────────────────────
  const { data: serverProduct, isLoading } = useProduct(id)

  // ── Draft state (Zustand) ───────────────────────────────────
  const product        = useBuilderStore(s => s.product)
  const formNodes      = useBuilderStore(s => s.formNodes)
  const savedAt        = useBuilderStore(s => s.savedAt)
  const initFromServer = useBuilderStore(s => s.initFromServer)
  const patchProduct   = useBuilderStore(s => s.patchProduct)
  const setFormNodes   = useBuilderStore(s => s.setFormNodes)
  const reset          = useBuilderStore(s => s.reset)

  // ── Auto-save ───────────────────────────────────────────────
  const { saveNow, isSaving } = useAutoSave(id)

  // ── Local UI state ──────────────────────────────────────────
  const [tab,       setTab]       = useState<TabId>('geral')
  const [uploading, setUploading] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const fileInputRef      = useRef<HTMLInputElement>(null)
  const prevSavedAtRef    = useRef<Date | null>(null)
  const lastInitializedId = useRef<string | null>(null)

  // Init store only when product ID changes — NOT on every post-save cache refresh.
  // Re-initialising after a save resets savedAt→null, which cancels the "Salvo!" flash timeout.
  useEffect(() => {
    if (serverProduct && lastInitializedId.current !== serverProduct.id) {
      lastInitializedId.current = serverProduct.id
      initFromServer(serverProduct)
    }
  }, [serverProduct, initFromServer])

  // Reset store on unmount
  useEffect(() => () => reset(), [reset])

  // Flash "Salvo!" whenever a save completes
  useEffect(() => {
    if (savedAt && savedAt !== prevSavedAtRef.current) {
      prevSavedAtRef.current = savedAt
      setShowSaved(true)
      const t = setTimeout(() => setShowSaved(false), 2500)
      return () => clearTimeout(t)
    }
  }, [savedAt])

  async function handleThumbnailUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id || id === 'new') return
    if (file.size > 4 * 1024 * 1024) { alert('Arquivo muito grande. Máximo 4MB.'); return }
    setUploading(true)
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${id}/thumbnail.${ext}`
    const { error } = await supabase.storage.from('products').upload(path, file, { upsert: true })
    if (error) {
      alert(`Erro ao enviar imagem: ${error.message}\n\nVerifique se o bucket "products" existe e é público no Supabase Storage.`)
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path)
    patchProduct({ thumbnail_url: publicUrl })
    setUploading(false)
    await supabase.from('products').update({ thumbnail_url: publicUrl }).eq('id', id)
  }

  if (isLoading || (!product && !!id && id !== 'new')) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: BG_PAGE }}>
        <div className="w-5 h-5 rounded-full border-2 border-[#E8521A] border-t-transparent animate-spin" />
      </div>
    )
  }

  const displayProduct: Partial<Product> = product ?? { name: 'Novo Produto', status: 'draft', slug: '' }
  const statusStyle = STATUS_STYLE[displayProduct.status ?? 'draft']

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: BG_PAGE }}>
      {/* Hidden file input for thumbnail */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleThumbnailUpload}
      />

      {/* Page header */}
      <div
        className="shrink-0 flex items-center gap-4 px-8 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#13151A' }}
      >
        <button
          onClick={() => navigate('/admin/products')}
          className="flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Produtos
        </button>

        <span className="text-white/10">/</span>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-[15px] font-bold text-[#EDEDED] tracking-tight truncate">
            {displayProduct.name}
          </h1>
          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0', statusStyle.cls)}>
            {statusStyle.label}
          </span>
        </div>

        <button
          onClick={saveNow}
          disabled={isSaving || showSaved}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-semibold
                     text-white transition-all disabled:opacity-70"
          style={{ background: showSaved ? '#16A34A' : '#E8521A', boxShadow: '0 4px 16px rgba(232,82,26,0.2)' }}
        >
          {isSaving   ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : showSaved  ? <Check   className="w-3.5 h-3.5" />
          :              <Save    className="w-3.5 h-3.5" />}
          {isSaving ? 'Salvando…' : showSaved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      {/* Tab bar */}
      <div
        className="shrink-0 flex items-end gap-1 px-8"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#13151A' }}
      >
        {TABS.map(t => {
          const Icon   = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-all',
                active ? 'text-[#EDEDED]' : 'text-white/35 hover:text-white/60',
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', active ? 'text-[#E8521A]' : 'text-white/25')} />
              {t.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: '#E8521A' }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === 'formulario' ? (
        <div className="flex-1 overflow-hidden">
          <FormularioPanel
            nodes={formNodes}
            onChange={setFormNodes}
            allowedPriceIds={[
              ...(displayProduct.price_id_stripe ? [displayProduct.price_id_stripe] : []),
              ...(((displayProduct.checkout_config ?? {}) as Record<string, unknown>).extra_price_ids as string[] ?? []),
            ]}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-8 py-6">
          {tab === 'geral' && (
            <GeralPanel
              product={displayProduct}
              onUpdate={patchProduct}
              onThumbnailClick={() => fileInputRef.current?.click()}
              uploading={uploading}
            />
          )}
          {tab === 'precificacao' && (
            <PrecificacaoPanel
              product={displayProduct}
              onUpdate={patchProduct}
              formNodes={formNodes}
            />
          )}
          {tab === 'rastreio' && (
            <RastreioPanel
              product={displayProduct}
              onUpdate={patchProduct}
            />
          )}
          {tab === 'vendas' && (
            <VendasPanel productId={id ?? ''} productSlug={displayProduct.slug} />
          )}
        </div>
      )}
    </div>
  )
}

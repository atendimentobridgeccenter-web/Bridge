import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ChevronLeft, CornerDownLeft, Sparkles, Lock, ShieldCheck, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { FormNode, OptionPrice, NodeType } from './FormBuilder'

// ── Public types ──────────────────────────────────────────────

export interface QuizzRunnerProps {
  nodes:            FormNode[]
  productId?:       string        // enables checkout flow
  productName?:     string        // shown in CheckoutSummary
  defaultPriceId?:  string        // fallback if no option carries a price
  onComplete?:      (answers: Record<string, string>) => void
}

// ── Helpers ───────────────────────────────────────────────────

const LETTER = (i: number) => String.fromCharCode(65 + i)

function formatAmount(amount: number, currency: string): string {
  const curr = currency.toLowerCase()
  // JPY and KRW are zero-decimal currencies
  if (curr === 'jpy' || curr === 'krw') {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr.toUpperCase() })
    .format(amount / 100)
}

function findAnswerByType(
  type: NodeType,
  nodes: FormNode[],
  answers: Record<string, string>,
): string {
  const node = nodes.find(n => n.type === type)
  return node ? (answers[node.id] ?? '') : ''
}

// ── Sub-components ─────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-50"
      style={{ background: 'rgba(255,255,255,0.05)' }}>
      <motion.div
        className="h-full"
        style={{ background: '#E8521A', originX: 0 }}
        animate={{ width: `${Math.min(pct * 100, 100)}%` }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      />
    </div>
  )
}

function KbdChip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded text-[10px] font-bold shrink-0"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.4)',
        minWidth: label.length > 1 ? 'auto' : '20px',
        height: '20px',
        padding: label.length > 1 ? '0 5px' : undefined,
      }}
    >
      {label}
    </span>
  )
}

function OptionBtn({
  letter, label, selected, priceTag, onClick,
}: {
  letter:    string
  label:     string
  selected:  boolean
  priceTag?: string
  onClick:   () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-4 rounded-xl text-left transition-all duration-150"
      style={{
        background: selected ? 'rgba(232,82,26,0.1)' : '#1E202A',
        border:     selected ? '1px solid rgba(232,82,26,0.5)' : '1px solid rgba(255,255,255,0.05)',
        boxShadow:  selected ? '0 0 0 1px rgba(232,82,26,0.15), 0 4px 16px rgba(232,82,26,0.08)' : 'none',
      }}
      onMouseEnter={e => {
        if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,82,26,0.3)'
      }}
      onMouseLeave={e => {
        if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.05)'
      }}
    >
      <KbdChip label={letter} />
      <span
        className="flex-1 text-[15px] leading-snug transition-colors"
        style={{ color: selected ? '#F1F5F9' : '#A1A1AA' }}
      >
        {label}
      </span>
      {priceTag && (
        <span
          className="text-[11px] font-semibold shrink-0"
          style={{ color: selected ? '#E8521A' : 'rgba(255,255,255,0.25)' }}
        >
          {priceTag}
        </span>
      )}
    </button>
  )
}

function AnswerInput({
  node, value, onChange, onEnter,
}: {
  node:     FormNode
  value:    string
  onChange: (v: string) => void
  onEnter:  () => void
}) {
  const borderColor = value ? '#E8521A' : 'rgba(255,255,255,0.12)'
  const sharedCls = `
    w-full bg-transparent outline-none border-0 border-b-2
    text-[22px] text-[#F1F5F9] placeholder:text-white/20
    py-3 transition-colors leading-snug
  `

  if (node.type === 'textarea') {
    return (
      <textarea
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter() }
        }}
        placeholder="Escreva aqui…"
        rows={4}
        className={sharedCls + ' resize-none'}
        style={{ borderBottomColor: borderColor }}
      />
    )
  }

  return (
    <input
      autoFocus
      type={node.type === 'email' ? 'email' : 'text'}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') onEnter() }}
      placeholder={node.type === 'email' ? 'seu@email.com' : 'Escreva aqui…'}
      className={sharedCls}
      style={{ borderBottomColor: borderColor }}
    />
  )
}

// ── CheckoutSummary ───────────────────────────────────────────

function CheckoutSummary({
  productId,
  productName,
  priceId,
  priceInfo,
  nodes,
  answers,
}: {
  productId:   string | undefined
  productName: string | undefined
  priceId:     string | null
  priceInfo:   OptionPrice | null
  nodes:       FormNode[]
  answers:     Record<string, string>
}) {
  const [loading, setLoading] = useState(false)
  const [errMsg,  setErrMsg]  = useState<string | null>(null)

  const email = findAnswerByType('email', nodes, answers)
  const name  = findAnswerByType('text',  nodes, answers)

  const canCheckout = !!priceId && !!productId

  async function handleCheckout() {
    if (!canCheckout) return
    setLoading(true)
    setErrMsg(null)

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { productId, priceId, email, name },
      })

      if (error) throw error
      if (data?.url) {
        window.location.href = data.url as string
      } else {
        throw new Error('URL não retornada pela função.')
      }
    } catch (err) {
      setErrMsg('Não foi possível gerar a sessão. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: '#0D0E12' }}
    >
      <ProgressBar pct={1} />

      <motion.div
        className="w-full max-w-[480px] flex flex-col gap-4"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4" style={{ color: '#E8521A' }} />
          <span className="text-[12px] font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            Resumo do Pedido
          </span>
        </div>

        {/* Receipt card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#1E202A', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Product block */}
          <div className="px-6 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'rgba(255,255,255,0.25)' }}>
              Produto
            </p>
            <p className="text-[20px] font-bold text-[#F1F5F9] tracking-tight">
              {productName ?? 'Produto'}
            </p>
            {priceInfo?.label && (
              <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {priceInfo.label}
              </p>
            )}
          </div>

          {/* Lead info — shown if collected */}
          {(name || email) && (
            <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[12px] font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(255,255,255,0.25)' }}>
                Para
              </p>
              {name  && <p className="text-[14px] text-[#E2E8F0]">{name}</p>}
              {email && <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{email}</p>}
            </div>
          )}

          {/* Price row */}
          <div className="px-6 py-5 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#E2E8F0]">Total</span>
            {priceInfo ? (
              <span className="text-[26px] font-bold tracking-tight" style={{ color: '#F1F5F9' }}>
                {formatAmount(priceInfo.amount, priceInfo.currency)}
              </span>
            ) : (
              <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Calculado no checkout
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleCheckout}
          disabled={loading || !canCheckout}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl
                     text-[15px] font-bold text-white transition-all"
          style={{
            background:  canCheckout ? '#E8521A' : 'rgba(255,255,255,0.05)',
            boxShadow:   canCheckout && !loading ? '0 8px 32px rgba(232,82,26,0.3)' : 'none',
            cursor:      canCheckout && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando ambiente seguro…
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Ir para Pagamento Seguro
            </>
          )}
        </button>

        {errMsg && (
          <p className="text-center text-[12px]" style={{ color: '#F87171' }}>{errMsg}</p>
        )}

        {/* Trust badge */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.2)' }} />
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Pagamento 100% seguro via <strong>Stripe</strong> · Dados criptografados
          </p>
        </div>
      </motion.div>
    </div>
  )
}

// ── Generic Done Screen (no productId) ───────────────────────

function DoneScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#0D0E12' }}>
      <ProgressBar pct={1} />
      <motion.div
        className="text-center max-w-md"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <motion.div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8"
          style={{ background: 'rgba(232,82,26,0.1)', border: '1px solid rgba(232,82,26,0.2)' }}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 18 }}
        >
          <Sparkles className="w-8 h-8" style={{ color: '#E8521A' }} />
        </motion.div>
        <h2 className="text-4xl font-bold text-[#F1F5F9] tracking-tight mb-4">Tudo certo!</h2>
        <p className="text-[16px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Suas respostas foram registradas.<br />Nossa equipe entrará em contato em breve.
        </p>
        <div className="mt-10 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold"
          style={{ background: 'rgba(232,82,26,0.08)', border: '1px solid rgba(232,82,26,0.15)', color: '#E8521A' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8521A] animate-pulse" />
          Powered by Bridge
        </div>
      </motion.div>
    </div>
  )
}

// ── Animation config ──────────────────────────────────────────

const variants = {
  enter:  (dir: number) => ({ opacity: 0, y: dir > 0 ? 44 : -44 }),
  center: { opacity: 1, y: 0 },
  exit:   (dir: number) => ({ opacity: 0, y: dir > 0 ? -20 : 20 }),
}
const transition = { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as const }

// ── Main Component ────────────────────────────────────────────

export default function QuizzRunner({
  nodes,
  productId,
  productName,
  defaultPriceId,
  onComplete,
}: QuizzRunnerProps) {
  const [history,         setHistory]         = useState<string[]>(nodes[0] ? [nodes[0].id] : [])
  const [answers,         setAnswers]         = useState<Record<string, string>>({})
  const [draft,           setDraft]           = useState('')
  const [done,            setDone]            = useState(false)
  const [activePriceId,   setActivePriceId]   = useState<string | null>(defaultPriceId ?? null)
  const [activePriceInfo, setActivePriceInfo] = useState<OptionPrice | null>(null)
  const dirRef = useRef(1)

  // ── Derived ──────────────────────────────────────────────────

  const currentId   = history[history.length - 1]
  const currentNode = nodes.find(n => n.id === currentId) ?? null
  const currentIdx  = nodes.findIndex(n => n.id === currentId)
  const isChoice    = currentNode?.type === 'radio' || currentNode?.type === 'select'
  const pct         = done ? 1 : nodes.length ? (history.length - 1) / nodes.length : 0

  // ── advance — the pricing + routing engine ────────────────────

  const advance = useCallback((answer: string) => {
    if (!currentNode) return

    const newAnswers = { ...answers, [currentNode.id]: answer }
    setAnswers(newAnswers)

    // Update active price if this option carries one
    const optPrice = currentNode.optionPrices?.[answer]
    if (optPrice) {
      setActivePriceId(optPrice.priceId)
      setActivePriceInfo(optPrice)
    }

    // Resolve next node via logic jumps or linear order
    const jump   = currentNode.logicJumps.find(j => j.ifOption === answer)
    let nextId: string | null = null

    if (jump) {
      if (jump.jumpToNodeId === '__end__') {
        setDone(true)
        onComplete?.(newAnswers)
        return
      }
      nextId = jump.jumpToNodeId
    } else {
      const next = nodes[currentIdx + 1]
      if (!next) {
        setDone(true)
        onComplete?.(newAnswers)
        return
      }
      nextId = next.id
    }

    dirRef.current = 1
    setHistory(h => [...h, nextId!])
    setDraft('')
  }, [currentNode, currentIdx, answers, nodes, onComplete])

  const handleNext = useCallback(() => {
    if (!draft) return
    advance(draft)
  }, [draft, advance])

  const handleBack = useCallback(() => {
    if (history.length <= 1) return
    dirRef.current = -1
    const prevId = history[history.length - 2]
    setHistory(h => h.slice(0, -1))
    setDraft(answers[prevId] ?? '')
  }, [history, answers])

  // ── Keyboard shortcuts ────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done || !currentNode) return

      if (isChoice) {
        const idx = e.key.toUpperCase().charCodeAt(0) - 65
        if (idx >= 0 && idx < currentNode.options.length) {
          const opt = currentNode.options[idx]
          setDraft(opt)
          setTimeout(() => advance(opt), 280)
          return
        }
      }

      if (e.key === 'Enter' && draft) {
        e.preventDefault()
        handleNext()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, currentNode, isChoice, draft, advance, handleNext])

  // ── Render: edge cases ────────────────────────────────────────

  if (!nodes.length) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0E12' }}>
        <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Nenhuma pergunta configurada.
        </p>
      </div>
    )
  }

  if (done) {
    return productId ? (
      <CheckoutSummary
        productId={productId}
        productName={productName}
        priceId={activePriceId}
        priceInfo={activePriceInfo}
        nodes={nodes}
        answers={answers}
      />
    ) : (
      <DoneScreen />
    )
  }

  if (!currentNode) return null

  // ── Render: question screen ───────────────────────────────────

  const canSubmit = !!draft

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0D0E12' }}>
      <ProgressBar pct={pct} />

      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-[560px]">
          <AnimatePresence mode="wait" custom={dirRef.current}>
            <motion.div
              key={currentNode.id}
              custom={dirRef.current}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="flex flex-col gap-8"
            >
              {/* Step indicator */}
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold tabular-nums" style={{ color: '#E8521A' }}>
                  {String(currentIdx + 1).padStart(2, '0')}
                </span>
                <ArrowRight className="w-3.5 h-3.5" style={{ color: '#E8521A' }} />
                <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  de {nodes.length}
                </span>
              </div>

              {/* Question title */}
              <h1 className="text-4xl font-bold tracking-tight leading-tight" style={{ color: '#F1F5F9' }}>
                {currentNode.title || (
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>Pergunta sem título</span>
                )}
              </h1>

              {/* Answer area */}
              {isChoice ? (
                <div className="flex flex-col gap-3">
                  {currentNode.options.map((opt, i) => {
                    const opPrice = currentNode.optionPrices?.[opt]
                    return (
                      <OptionBtn
                        key={opt}
                        letter={LETTER(i)}
                        label={opt}
                        selected={draft === opt}
                        priceTag={opPrice ? formatAmount(opPrice.amount, opPrice.currency) : undefined}
                        onClick={() => {
                          setDraft(opt)
                          setTimeout(() => advance(opt), 280)
                        }}
                      />
                    )
                  })}
                  {currentNode.options.length === 0 && (
                    <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      Nenhuma opção configurada.
                    </p>
                  )}
                </div>
              ) : (
                <AnswerInput
                  node={currentNode}
                  value={draft}
                  onChange={setDraft}
                  onEnter={handleNext}
                />
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-1">
                {history.length > 1 && (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-[13px] transition-colors"
                    style={{ color: 'rgba(255,255,255,0.25)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)' }}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Voltar
                  </button>
                )}

                {!isChoice && (
                  <button
                    onClick={handleNext}
                    disabled={!canSubmit}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all"
                    style={{
                      background: canSubmit ? '#E8521A' : 'rgba(255,255,255,0.05)',
                      color:      canSubmit ? '#fff'    : 'rgba(255,255,255,0.2)',
                      boxShadow:  canSubmit ? '0 4px 20px rgba(232,82,26,0.25)' : 'none',
                      cursor:     canSubmit ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Continuar
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </button>
                )}

                {!isChoice && draft && (
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    ou pressione&nbsp;<KbdChip label="Enter" />
                  </span>
                )}
              </div>

              {/* Keyboard shortcut hint for choice questions */}
              {isChoice && currentNode.options.length > 0 && (
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
                  Pressione <strong>A</strong>, <strong>B</strong>, <strong>C</strong>… para selecionar
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="shrink-0 pb-5 flex justify-center">
        <p className="text-[10px] tracking-wide" style={{ color: 'rgba(255,255,255,0.1)' }}>
          POWERED BY BRIDGE
        </p>
      </div>
    </div>
  )
}

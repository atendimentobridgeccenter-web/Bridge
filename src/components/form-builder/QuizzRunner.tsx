import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ChevronLeft, CornerDownLeft, Sparkles } from 'lucide-react'
import type { FormNode } from './FormBuilder'

// ── Types ─────────────────────────────────────────────────────

export interface QuizzRunnerProps {
  nodes:       FormNode[]
  onComplete?: (answers: Record<string, string>) => void
}

// ── Helpers ───────────────────────────────────────────────────

const LETTER = (i: number) => String.fromCharCode(65 + i)

// ── Sub-components ─────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-50" style={{ background: 'rgba(255,255,255,0.05)' }}>
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
      className="inline-flex items-center justify-center rounded text-[10px] font-bold text-white/40 shrink-0"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
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
  letter,
  label,
  selected,
  onClick,
}: {
  letter:   string
  label:    string
  selected: boolean
  onClick:  () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-4 rounded-xl text-left transition-all duration-150 group"
      style={{
        background: selected ? 'rgba(232,82,26,0.1)' : '#1E202A',
        border:     selected ? '1px solid rgba(232,82,26,0.5)' : '1px solid rgba(255,255,255,0.05)',
        boxShadow:  selected ? '0 0 0 1px rgba(232,82,26,0.15)' : 'none',
      }}
      onMouseEnter={e => {
        if (!selected)
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,82,26,0.3)'
      }}
      onMouseLeave={e => {
        if (!selected)
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.05)'
      }}
    >
      <KbdChip label={letter} />
      <span
        className="text-[15px] leading-snug transition-colors"
        style={{ color: selected ? '#F1F5F9' : '#A1A1AA' }}
      >
        {label}
      </span>
    </button>
  )
}

function AnswerInput({
  node,
  value,
  onChange,
  onEnter,
}: {
  node:    FormNode
  value:   string
  onChange: (v: string) => void
  onEnter:  () => void
}) {
  const sharedCls = `
    w-full bg-transparent outline-none border-0 border-b-2
    text-[22px] text-[#F1F5F9] placeholder:text-white/20
    py-3 transition-colors leading-snug
  `
  const borderColor = value ? '#E8521A' : 'rgba(255,255,255,0.12)'

  if (node.type === 'textarea') {
    return (
      <textarea
        // eslint-disable-next-line jsx-a11y/no-autofocus
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
      // eslint-disable-next-line jsx-a11y/no-autofocus
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

// ── Done Screen ───────────────────────────────────────────────

function DoneScreen() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#0D0E12' }}
    >
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

        <h2 className="text-4xl font-bold text-[#F1F5F9] tracking-tight mb-4">
          Tudo certo!
        </h2>
        <p className="text-[16px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Suas respostas foram registradas com sucesso.<br />
          Nossa equipe entrará em contato em breve.
        </p>

        <div
          className="mt-10 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold"
          style={{ background: 'rgba(232,82,26,0.08)', border: '1px solid rgba(232,82,26,0.15)', color: '#E8521A' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8521A] animate-pulse" />
          Powered by Bridge
        </div>
      </motion.div>
    </div>
  )
}

// ── Animation variants ────────────────────────────────────────

const variants = {
  enter:  (dir: number) => ({ opacity: 0, y: dir > 0 ? 44 : -44 }),
  center: { opacity: 1, y: 0 },
  exit:   (dir: number) => ({ opacity: 0, y: dir > 0 ? -20 : 20 }),
}

const transition = { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as const }

// ── Main Component ────────────────────────────────────────────

export default function QuizzRunner({ nodes, onComplete }: QuizzRunnerProps) {
  const [history,   setHistory]   = useState<string[]>(nodes[0] ? [nodes[0].id] : [])
  const [answers,   setAnswers]   = useState<Record<string, string>>({})
  const [draft,     setDraft]     = useState('')
  const [done,      setDone]      = useState(false)
  const dirRef = useRef(1)

  // ── Derived ──────────────────────────────────────────────────

  const currentId   = history[history.length - 1]
  const currentNode = nodes.find(n => n.id === currentId) ?? null
  const currentIdx  = nodes.findIndex(n => n.id === currentId)
  const isChoice    = currentNode?.type === 'radio' || currentNode?.type === 'select'
  const pct         = done ? 1 : nodes.length ? (history.length - 1) / nodes.length : 0

  // ── advance(answer): core logic-jump engine ───────────────────

  const advance = useCallback((answer: string) => {
    if (!currentNode) return

    const newAnswers = { ...answers, [currentNode.id]: answer }
    setAnswers(newAnswers)

    const jump = currentNode.logicJumps.find(j => j.ifOption === answer)
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

      // Letter shortcuts for choice questions
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

  if (done) return <DoneScreen />

  if (!currentNode) return null

  // ── Render: question ──────────────────────────────────────────

  const canSubmit = isChoice ? !!draft : !!draft

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0D0E12' }}>
      <ProgressBar pct={pct} />

      {/* Centered content */}
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
              <h1
                className="text-4xl font-bold tracking-tight leading-tight"
                style={{ color: '#F1F5F9' }}
              >
                {currentNode.title || <span style={{ color: 'rgba(255,255,255,0.2)' }}>Pergunta sem título</span>}
              </h1>

              {/* Answer area */}
              {isChoice ? (
                <div className="flex flex-col gap-3">
                  {currentNode.options.map((opt, i) => (
                    <OptionBtn
                      key={opt}
                      letter={LETTER(i)}
                      label={opt}
                      selected={draft === opt}
                      onClick={() => {
                        setDraft(opt)
                        setTimeout(() => advance(opt), 280)
                      }}
                    />
                  ))}

                  {currentNode.options.length === 0 && (
                    <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      Nenhuma opção configurada nesta pergunta.
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

              {/* Actions row */}
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
                      background:  canSubmit ? '#E8521A' : 'rgba(255,255,255,0.05)',
                      color:       canSubmit ? '#fff'    : 'rgba(255,255,255,0.2)',
                      boxShadow:   canSubmit ? '0 4px 20px rgba(232,82,26,0.25)' : 'none',
                      cursor:      canSubmit ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Continuar
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Keyboard hint */}
                {!isChoice && draft && (
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    ou pressione&nbsp;<KbdChip label="Enter" />
                  </span>
                )}
              </div>

              {/* Choice hint */}
              {isChoice && currentNode.options.length > 0 && (
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
                  Pressione <strong>A</strong>, <strong>B</strong>, <strong>C</strong>… para selecionar rapidamente
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 pb-5 flex justify-center">
        <p className="text-[10px] tracking-wide" style={{ color: 'rgba(255,255,255,0.1)' }}>
          POWERED BY BRIDGE
        </p>
      </div>
    </div>
  )
}

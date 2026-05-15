import { useState, useCallback, useRef } from 'react'
import {
  Type, Mail, List, CheckSquare, AlignLeft,
  Trash2, Plus, ArrowRight, GripVertical,
  MousePointerClick, Zap,
} from 'lucide-react'
import { cn } from '@/lib/cn'

// ── Types (exported — usados fora do componente) ──────────────

export type NodeType = 'text' | 'email' | 'radio' | 'select' | 'textarea'

export interface LogicJump {
  id: string
  ifOption:     string
  jumpToNodeId: string
}

export interface OptionPrice {
  priceId:  string   // Stripe Price ID — e.g. "price_1abc..."
  label:    string   // Human-readable plan name — e.g. "Plano Mensal"
  amount:   number   // Display amount in smallest unit (JPY: integer, USD: cents)
  currency: string   // ISO 4217 lowercase — e.g. "jpy", "usd", "brl"
}

export interface FormNode {
  id:           string
  title:        string
  type:         NodeType
  options:      string[]
  logicJumps:   LogicJump[]
  optionPrices?: Record<string, OptionPrice>  // key = option text
}

// ── Helpers ───────────────────────────────────────────────────

function uid(): string { return Math.random().toString(36).slice(2, 9) }

function blankNode(): FormNode {
  return { id: uid(), title: '', type: 'text', options: [], logicJumps: [] }
}

// ── Type config ───────────────────────────────────────────────

interface TypeMeta { label: string; icon: React.ElementType; color: string }

const TYPE_META: Record<NodeType, TypeMeta> = {
  text:     { label: 'Texto Curto',      icon: Type,         color: '#60A5FA' },
  email:    { label: 'E-mail',           icon: Mail,         color: '#34D399' },
  radio:    { label: 'Múltipla Escolha', icon: CheckSquare,  color: '#F59E0B' },
  select:   { label: 'Lista Suspensa',   icon: List,         color: '#A78BFA' },
  textarea: { label: 'Texto Longo',      icon: AlignLeft,    color: '#FB923C' },
}

const TYPE_OPTIONS = Object.entries(TYPE_META) as [NodeType, TypeMeta][]

// ── Sub-components ────────────────────────────────────────────

function QuestionCard({
  node, index, active, onClick, onDelete,
}: {
  node:     FormNode
  index:    number
  active:   boolean
  onClick:  () => void
  onDelete: () => void
}) {
  const { icon: Icon, label, color } = TYPE_META[node.type]

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-100',
        active ? 'bg-white/5' : 'hover:bg-white/3',
      )}
      style={active ? { borderLeft: '2px solid #E8521A' } : { borderLeft: '2px solid transparent' }}
    >
      {/* Drag handle (visual) */}
      <GripVertical className="w-3.5 h-3.5 text-white/15 mt-0.5 shrink-0 cursor-grab" />

      {/* Type icon */}
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${color}18` }}
      >
        <Icon className="w-3 h-3" style={{ color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-[12px] font-semibold leading-tight truncate',
          active ? 'text-[#EDEDED]' : 'text-white/60',
        )}>
          {node.title || <span className="italic text-white/25">Sem título</span>}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: `${color}99` }}>
          {label}
        </p>
      </div>

      {/* Index */}
      <span className="text-[10px] font-mono text-white/20 shrink-0 mt-0.5">
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100
                   text-white/20 hover:text-red-400 transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

// ── Option editor ─────────────────────────────────────────────

function OptionsEditor({
  options,
  onChange,
}: {
  options:  string[]
  onChange: (opts: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function add() {
    const val = draft.trim()
    if (!val || options.includes(val)) return
    onChange([...options, val])
    setDraft('')
    inputRef.current?.focus()
  }

  function remove(idx: number) {
    onChange(options.filter((_, i) => i !== idx))
  }

  function update(idx: number, val: string) {
    onChange(options.map((o, i) => i === idx ? val : o))
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Existing options */}
      {options.map((opt, i) => (
        <div key={`${opt}-${i}`} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shrink-0 border"
            style={{ borderColor: 'rgba(255,255,255,0.2)' }}
          />
          <input
            value={opt}
            onChange={e => update(i, e.target.value)}
            className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] text-[#EDEDED]
                       placeholder:text-white/20 outline-none"
            style={{ background: '#0D0E12', border: '1px solid rgba(255,255,255,0.07)' }}
          />
          <button
            onClick={() => remove(i)}
            className="p-1 rounded text-white/20 hover:text-red-400 transition-colors shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}

      {/* Add option */}
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full shrink-0 border border-dashed"
          style={{ borderColor: 'rgba(232,82,26,0.4)' }}
        />
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Nova opção... (Enter para adicionar)"
          className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] text-[#EDEDED]
                     placeholder:text-white/25 outline-none bg-transparent"
          style={{ border: '1px dashed rgba(255,255,255,0.08)' }}
        />
        <button
          onClick={add}
          className="p-1 rounded transition-colors shrink-0 text-[#E8521A] hover:text-white"
          style={{ background: 'rgba(232,82,26,0.1)' }}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ── Logic jump row ────────────────────────────────────────────

function LogicJumpRow({
  jump,
  options,
  nodes,
  nodeId,
  onChange,
  onDelete,
}: {
  jump:     LogicJump
  options:  string[]
  nodes:    FormNode[]
  nodeId:   string
  onChange: (j: LogicJump) => void
  onDelete: () => void
}) {
  const targets = nodes.filter(n => n.id !== nodeId)

  const selectCls = `
    px-2.5 py-1.5 rounded-md text-[12px] text-[#EDEDED] outline-none appearance-none cursor-pointer
  `
  const selectStyle = { background: '#0D0E12', border: '1px solid rgba(255,255,255,0.08)' }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* SE */}
      <span className="text-[11px] font-semibold text-white/30 shrink-0">SE</span>

      {/* Option dropdown */}
      <select
        value={jump.ifOption}
        onChange={e => onChange({ ...jump, ifOption: e.target.value })}
        className={selectCls}
        style={selectStyle}
      >
        <option value="">escolher opção…</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>

      {/* ENTÃO */}
      <ArrowRight className="w-3.5 h-3.5 text-[#E8521A] shrink-0" />
      <span className="text-[11px] font-semibold text-white/30 shrink-0">ir para</span>

      {/* Target node dropdown */}
      <select
        value={jump.jumpToNodeId}
        onChange={e => onChange({ ...jump, jumpToNodeId: e.target.value })}
        className={selectCls}
        style={selectStyle}
      >
        <option value="">escolher pergunta…</option>
        {targets.map((n, i) => (
          <option key={n.id} value={n.id}>
            {String(nodes.indexOf(n) + 1).padStart(2, '0')} — {n.title || 'Sem título'}
          </option>
        ))}
        <option value="__end__">⏹ Finalizar formulário</option>
      </select>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-1 rounded text-white/20 hover:text-red-400 transition-colors shrink-0 ml-auto"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

// ── Node editor (right panel) ─────────────────────────────────

function NodeEditor({
  node,
  nodes,
  onUpdate,
}: {
  node:     FormNode
  nodes:    FormNode[]
  onUpdate: (n: FormNode) => void
}) {
  const hasOptions = node.type === 'radio' || node.type === 'select'

  function set<K extends keyof FormNode>(key: K, val: FormNode[K]) {
    onUpdate({ ...node, [key]: val })
  }

  function addJump() {
    const jump: LogicJump = { id: uid(), ifOption: '', jumpToNodeId: '' }
    set('logicJumps', [...node.logicJumps, jump])
  }

  function updateJump(id: string, updated: LogicJump) {
    set('logicJumps', node.logicJumps.map(j => j.id === id ? updated : j))
  }

  function deleteJump(id: string) {
    set('logicJumps', node.logicJumps.filter(j => j.id !== id))
  }

  const labelCls = 'text-[11px] font-semibold uppercase tracking-widest text-white/30'
  const inputCls = `
    w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED]
    placeholder:text-white/20 outline-none transition-colors
  `

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">

      {/* ── Campo: título ── */}
      <div className="flex flex-col gap-2">
        <label className={labelCls}>Título da Pergunta</label>
        <input
          value={node.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Ex: Qual é o seu nível de japonês?"
          className={inputCls}
          style={{ background: '#0D0E12', border: '1px solid rgba(255,255,255,0.08)' }}
          onFocus={e  => { e.currentTarget.style.borderColor = 'rgba(232,82,26,0.45)' }}
          onBlur={e   => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* ── Campo: tipo ── */}
      <div className="flex flex-col gap-2">
        <label className={labelCls}>Tipo de Resposta</label>
        <div className="grid grid-cols-2 gap-2">
          {TYPE_OPTIONS.map(([type, meta]) => {
            const Icon = meta.icon
            const active = node.type === type
            return (
              <button
                key={type}
                onClick={() => set('type', type)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-all text-left',
                  active ? 'text-[#EDEDED]' : 'text-white/40 hover:text-white/70',
                )}
                style={{
                  background: active ? `${meta.color}14` : 'rgba(255,255,255,0.03)',
                  border: active
                    ? `1px solid ${meta.color}35`
                    : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: active ? meta.color : undefined }} />
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Opções (radio / select) ── */}
      {hasOptions && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className={labelCls}>Opções de Resposta</label>
            <span className="text-[10px] text-white/20">{node.options.length} opção{node.options.length !== 1 ? 'ções' : ''}</span>
          </div>
          <OptionsEditor
            options={node.options}
            onChange={opts => set('options', opts)}
          />
        </div>
      )}

      {/* ── Divider ── */}
      {hasOptions && node.options.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
      )}

      {/* ── Logic Jumps ── */}
      {hasOptions && node.options.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#E8521A]" />
              <label className={labelCls}>Regras de Lógica</label>
            </div>
            <button
              onClick={addJump}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md
                         text-[#E8521A] transition-colors"
              style={{ background: 'rgba(232,82,26,0.1)', border: '1px solid rgba(232,82,26,0.2)' }}
            >
              <Plus className="w-3 h-3" />
              Adicionar Regra
            </button>
          </div>

          {node.logicJumps.length === 0 ? (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}
            >
              <MousePointerClick className="w-4 h-4 text-white/15 shrink-0" />
              <p className="text-[12px] text-white/25">
                Nenhuma regra ainda. Adicione uma para criar fluxos condicionais.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {node.logicJumps.map(jump => (
                <div
                  key={jump.id}
                  className="p-3 rounded-lg"
                  style={{ background: 'rgba(232,82,26,0.04)', border: '1px solid rgba(232,82,26,0.12)' }}
                >
                  <LogicJumpRow
                    jump={jump}
                    options={node.options}
                    nodes={nodes}
                    nodeId={node.id}
                    onChange={updated => updateJump(jump.id, updated)}
                    onDelete={() => deleteJump(jump.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hint: logic unavailable */}
      {hasOptions && node.options.length === 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}
        >
          <Zap className="w-4 h-4 text-white/15 shrink-0" />
          <p className="text-[12px] text-white/25">
            Adicione pelo menos uma opção para criar lógicas de pulo.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Empty state (no selection) ────────────────────────────────

function EmptyEditor() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(232,82,26,0.08)', border: '1px solid rgba(232,82,26,0.12)' }}
      >
        <MousePointerClick className="w-6 h-6 text-[#E8521A]" />
      </div>
      <p className="text-[14px] font-semibold text-[#EDEDED]">Selecione uma pergunta</p>
      <p className="text-[12px] text-white/30 mt-1 max-w-[200px] leading-relaxed">
        Clique em uma pergunta à esquerda para editar seus campos e lógicas.
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

interface FormBuilderProps {
  nodes:    FormNode[]
  onChange: (nodes: FormNode[]) => void
}

export default function FormBuilder({ nodes, onChange }: FormBuilderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    nodes[0]?.id ?? null,
  )

  const selected = nodes.find(n => n.id === selectedId) ?? null

  const addNode = useCallback(() => {
    const n = blankNode()
    onChange([...nodes, n])
    setSelectedId(n.id)
  }, [nodes, onChange])

  const deleteNode = useCallback((id: string) => {
    const next = nodes.filter(n => n.id !== id)
    onChange(next)
    if (selectedId === id) setSelectedId(next[0]?.id ?? null)
  }, [nodes, onChange, selectedId])

  const updateNode = useCallback((updated: FormNode) => {
    onChange(nodes.map(n => n.id === updated.id ? updated : n))
  }, [nodes, onChange])

  return (
    <div
      className="flex overflow-hidden rounded-2xl"
      style={{
        border: '1px solid rgba(255,255,255,0.07)',
        minHeight: 560,
        height: '100%',
      }}
    >
      {/* ── Left: question list ── */}
      <div
        className="w-72 shrink-0 flex flex-col"
        style={{ background: '#16181F', borderRight: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[12px] font-semibold text-[#EDEDED]">Perguntas</p>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(232,82,26,0.12)', color: '#F0643A' }}
          >
            {nodes.length}
          </span>
        </div>

        {/* Question list */}
        <div className="flex-1 overflow-y-auto">
          {nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-[12px] text-white/25 leading-relaxed">
                Nenhuma pergunta ainda.<br />Adicione a primeira abaixo.
              </p>
            </div>
          ) : (
            nodes.map((node, idx) => (
              <QuestionCard
                key={node.id}
                node={node}
                index={idx}
                active={selectedId === node.id}
                onClick={() => setSelectedId(node.id)}
                onDelete={() => deleteNode(node.id)}
              />
            ))
          )}
        </div>

        {/* Add question button */}
        <div
          className="px-3 py-3 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={addNode}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg
                       text-[12px] font-semibold text-[#E8521A] transition-all"
            style={{
              background: 'rgba(232,82,26,0.08)',
              border: '1px solid rgba(232,82,26,0.18)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,82,26,0.14)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,82,26,0.08)'
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Pergunta
          </button>
        </div>
      </div>

      {/* ── Right: editor ── */}
      <div
        className="flex-1 overflow-hidden"
        style={{ background: '#13151A' }}
      >
        {selected
          ? <NodeEditor node={selected} nodes={nodes} onUpdate={updateNode} />
          : <EmptyEditor />
        }
      </div>
    </div>
  )
}

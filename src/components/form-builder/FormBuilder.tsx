import { useState, useCallback, useRef } from 'react'
import {
  Type, Mail, List, CheckSquare, AlignLeft,
  Trash2, Plus, ArrowRight, GripVertical,
  MousePointerClick, Zap, Phone, Hash, Calendar,
  MapPin, Map, Sparkles, CheckCircle, CreditCard,
  XCircle, FileText, User, ImageIcon, X, SquareCheck,
  InstagramIcon, LinkedinIcon, Globe, MessageCircle, Send, Music2, PlayCircle,
  Landmark, Upload, Banknote,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────

export type NodeType =
  | 'welcome'   // Tela de boas-vindas (intro)
  | 'name'      // Nome completo (dado pessoal)
  | 'text'      // Texto Curto
  | 'email'     // E-mail
  | 'phone'     // Telefone
  | 'cpf'       // CPF
  | 'number'    // Número
  | 'date'      // Data
  | 'city'      // Cidade
  | 'state'     // Estado
  | 'radio'     // Múltipla Escolha
  | 'select'    // Lista Suspensa
  | 'textarea'  // Texto Longo
  | 'confirm'        // Confirmação / aceite (checkbox)
  | 'thankyou'       // Tela de encerramento
  | 'bank-deposit'   // Tela com dados bancários para depósito
  | 'receipt-upload' // Tela de upload de comprovante
  | 'payment-done'   // Tela de confirmação de pagamento em dinheiro

export interface LogicJump {
  id:           string
  ifOption:     string
  jumpToNodeId: string  // node id | '__end__' | '__disqualify__'
}

export interface OptionPrice {
  priceId:  string
  label:    string
  amount:   number
  currency: string
}

export interface SocialLink {
  platform: string
  url:      string
}

export interface BankInfo {
  amount?:            string   // kept for backward compat (single amount)
  enrollmentAmount?:  string   // valor da matrícula (número, ex: "1200.00")
  monthlyAmount?:     string   // valor da mensalidade (número, ex: "250.00")
  currency?:          string   // BRL | JPY | USD (default BRL)
  pixKey?:            string
  pixKeyType?:        string
  beneficiaryName?:   string
  bankName?:          string
  agency?:            string
  account?:           string
  accountType?:       string
}

export interface FormNode {
  id:            string
  title:         string
  description?:  string       // subtítulo — usado em welcome / thankyou / confirm (label do checkbox)
  type:          NodeType
  required?:     boolean      // se true, impede avançar sem responder
  allowOther?:   boolean      // habilita opção "Outra" em radio/select
  logoUrl?:      string       // URL da imagem/logo na tela de boas-vindas
  socialLinks?:  SocialLink[] // links de redes sociais na tela de encerramento
  bankInfo?:     BankInfo     // dados bancários para nó bank-deposit
  options:       string[]
  logicJumps:    LogicJump[]
  optionPrices?: Record<string, OptionPrice>
  buttonLabel?:  string       // texto do botão CTA na tela welcome
}

// ── Helpers ───────────────────────────────────────────────────

function uid(): string { return Math.random().toString(36).slice(2, 9) }

function blankNode(): FormNode {
  return { id: uid(), title: '', type: 'text', required: true, options: [], logicJumps: [] }
}

// ── Type metadata ─────────────────────────────────────────────

interface TypeMeta { label: string; icon: React.ElementType; color: string }

const TYPE_META: Record<NodeType, TypeMeta> = {
  welcome:  { label: 'Boas-vindas',     icon: Sparkles,    color: '#E8521A' },
  name:     { label: 'Nome',            icon: User,        color: '#60A5FA' },
  text:     { label: 'Texto Curto',     icon: Type,        color: '#60A5FA' },
  email:    { label: 'E-mail',          icon: Mail,        color: '#34D399' },
  phone:    { label: 'Telefone',        icon: Phone,       color: '#34D399' },
  cpf:      { label: 'CPF',            icon: CreditCard,  color: '#60A5FA' },
  number:   { label: 'Número',         icon: Hash,        color: '#A78BFA' },
  date:     { label: 'Data',           icon: Calendar,    color: '#F472B6' },
  city:     { label: 'Cidade',         icon: MapPin,      color: '#FB923C' },
  state:    { label: 'Estado',         icon: Map,         color: '#FBBF24' },
  radio:    { label: 'Múlt. Escolha',  icon: CheckSquare, color: '#F59E0B' },
  select:   { label: 'Lista Suspensa', icon: List,        color: '#A78BFA' },
  textarea: { label: 'Texto Longo',    icon: AlignLeft,   color: '#FB923C' },
  confirm:          { label: 'Confirmação',    icon: SquareCheck, color: '#34D399' },
  thankyou:         { label: 'Encerramento',   icon: CheckCircle, color: '#34D399' },
  'bank-deposit':   { label: 'Dados Bancários', icon: Landmark,  color: '#3B82F6' },
  'receipt-upload': { label: 'Comprovante',     icon: Upload,    color: '#8B5CF6' },
  'payment-done':   { label: 'Pag. Dinheiro',   icon: Banknote,  color: '#10B981' },
}

const SCREEN_TYPES: NodeType[] = ['welcome', 'thankyou', 'bank-deposit', 'receipt-upload', 'payment-done']

// ── QuestionCard (sidebar) ────────────────────────────────────

function QuestionCard({
  node, index, active, onClick, onDelete,
  onDragStart, onDragOver, onDrop, onDragEnd, isDragOver,
}: {
  node:        FormNode
  index:       number
  active:      boolean
  onClick:     () => void
  onDelete:    () => void
  onDragStart: () => void
  onDragOver:  (e: React.DragEvent) => void
  onDrop:      () => void
  onDragEnd:   () => void
  isDragOver:  boolean
}) {
  const { icon: Icon, label, color } = TYPE_META[node.type]
  const isScreen = SCREEN_TYPES.includes(node.type)

  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-100',
        active ? 'bg-white/5' : 'hover:bg-white/3',
      )}
      style={{
        borderLeft: active ? `2px solid ${color}` : isDragOver ? '2px solid rgba(232,82,26,0.6)' : '2px solid transparent',
        background: isDragOver ? 'rgba(232,82,26,0.05)' : undefined,
        opacity: 1,
      }}
    >
      <GripVertical className="w-3.5 h-3.5 text-white/15 mt-0.5 shrink-0 cursor-grab active:cursor-grabbing" />

      <div
        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${color}18` }}
      >
        <Icon className="w-3 h-3" style={{ color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-[12px] font-semibold leading-tight truncate',
          active ? 'text-[#EDEDED]' : 'text-white/60',
        )}>
          {node.title || <span className="italic text-white/25">Sem título</span>}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: `${color}99` }}>{label}</p>
      </div>

      {isScreen ? (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0"
          style={{ background: `${color}18`, color }}>
          {node.type === 'welcome' ? 'INTRO' : node.type === 'thankyou' ? 'FIM' : node.type === 'bank-deposit' ? 'DEP' : node.type === 'receipt-upload' ? 'COMP' : 'DIN'}
        </span>
      ) : (
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <span className="text-[10px] font-mono text-white/20">
            {String(index + 1).padStart(2, '0')}
          </span>
          {node.required && (
            <span className="text-[10px] font-bold leading-none" style={{ color: '#F87171' }}>*</span>
          )}
        </div>
      )}

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

// ── Options editor ────────────────────────────────────────────

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (o: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function add() {
    const val = draft.trim()
    if (!val || options.includes(val)) return
    onChange([...options, val])
    setDraft('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt, i) => (
        <div key={`${opt}-${i}`} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0 border" style={{ borderColor: 'rgba(255,255,255,0.2)' }} />
          <input
            value={opt}
            onChange={e => onChange(options.map((o, j) => j === i ? e.target.value : o))}
            className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] text-[#EDEDED] placeholder:text-white/20 outline-none"
            style={{ background: '#0D0E12', border: '1px solid rgba(255,255,255,0.07)' }}
          />
          <button onClick={() => onChange(options.filter((_, j) => j !== i))}
            className="p-1 rounded text-white/20 hover:text-red-400 transition-colors shrink-0">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full shrink-0 border border-dashed" style={{ borderColor: 'rgba(232,82,26,0.4)' }} />
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Nova opção… (Enter para adicionar)"
          className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] text-[#EDEDED] placeholder:text-white/25 outline-none bg-transparent"
          style={{ border: '1px dashed rgba(255,255,255,0.08)' }}
        />
        <button onClick={add}
          className="p-1 rounded transition-colors shrink-0 text-[#E8521A] hover:text-white"
          style={{ background: 'rgba(232,82,26,0.1)' }}>
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ── Logic jump row ────────────────────────────────────────────

function LogicJumpRow({
  jump, options, nodes, nodeId, onChange, onDelete,
}: {
  jump:     LogicJump
  options:  string[]
  nodes:    FormNode[]
  nodeId:   string
  onChange: (j: LogicJump) => void
  onDelete: () => void
}) {
  const targets    = nodes.filter(n => n.id !== nodeId)
  const hasOptions = options.length > 0
  const selCls     = 'px-2.5 py-1.5 rounded-md text-[12px] text-[#EDEDED] outline-none appearance-none cursor-pointer'
  const selSty     = { background: '#0D0E12', border: '1px solid rgba(255,255,255,0.08)' }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-semibold text-white/30 shrink-0">SE</span>

      {hasOptions ? (
        <select value={jump.ifOption} onChange={e => onChange({ ...jump, ifOption: e.target.value })}
          className={selCls} style={selSty}>
          <option value="">escolher opção…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          value={jump.ifOption}
          onChange={e => onChange({ ...jump, ifOption: e.target.value })}
          placeholder="resposta contém…"
          className="px-2.5 py-1.5 rounded-md text-[12px] text-[#EDEDED] outline-none placeholder:text-white/20"
          style={selSty}
        />
      )}

      <ArrowRight className="w-3.5 h-3.5 text-[#E8521A] shrink-0" />
      <span className="text-[11px] font-semibold text-white/30 shrink-0">ir para</span>
      <select value={jump.jumpToNodeId} onChange={e => onChange({ ...jump, jumpToNodeId: e.target.value })}
        className={selCls} style={selSty}>
        <option value="">escolher pergunta…</option>
        {targets.map(n => (
          <option key={n.id} value={n.id}>
            {String(nodes.indexOf(n) + 1).padStart(2, '0')} — {n.title || 'Sem título'}
          </option>
        ))}
        <option value="__end__">⏹ Finalizar formulário</option>
        <option value="__disqualify__">🚫 Desqualificar lead</option>
      </select>
      <button onClick={onDelete}
        className="p-1 rounded text-white/20 hover:text-red-400 transition-colors shrink-0 ml-auto">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

// ── Social platform config ────────────────────────────────────

const SOCIAL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram',  Icon: InstagramIcon, placeholder: 'https://instagram.com/seu_perfil' },
  { id: 'whatsapp',  label: 'WhatsApp',   Icon: MessageCircle, placeholder: 'https://wa.me/5511999999999' },
  { id: 'linkedin',  label: 'LinkedIn',   Icon: LinkedinIcon,  placeholder: 'https://linkedin.com/in/seu_perfil' },
  { id: 'youtube',   label: 'YouTube',    Icon: PlayCircle,    placeholder: 'https://youtube.com/@canal' },
  { id: 'tiktok',    label: 'TikTok',     Icon: Music2,        placeholder: 'https://tiktok.com/@perfil' },
  { id: 'telegram',  label: 'Telegram',   Icon: Send,          placeholder: 'https://t.me/perfil' },
  { id: 'website',   label: 'Website',    Icon: Globe,         placeholder: 'https://meusite.com.br' },
]

// ── BankDepositEditor ─────────────────────────────────────────

function BankDepositEditor({ node, onUpdate }: { node: FormNode; onUpdate: (n: FormNode) => void }) {
  const labelCls = 'text-[11px] font-semibold uppercase tracking-widest text-white/30'
  const inputCls = 'w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none transition-colors'
  const inputSty = { background: '#0D0E12', border: '1px solid rgba(255,255,255,0.08)' }
  const focusSty = 'rgba(59,130,246,0.45)'
  const blurSty  = 'rgba(255,255,255,0.08)'

  function setInfo(patch: Partial<BankInfo>) {
    onUpdate({ ...node, bankInfo: { ...node.bankInfo, ...patch } })
  }

  const bi = node.bankInfo ?? {}

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">

      <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
        style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
        <Landmark className="w-4 h-4 shrink-0 text-blue-400" />
        <p className="text-[12px] leading-relaxed text-blue-300/80">
          Exibe os dados bancários para o lead realizar a transferência.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Título da Tela</label>
        <input value={node.title} onChange={e => onUpdate({ ...node, title: e.target.value })}
          placeholder="Ex: Realize o pagamento" className={inputCls} style={inputSty}
          onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
          onBlur={e  => { e.currentTarget.style.borderColor = blurSty }} />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Instrução / Descrição</label>
        <textarea value={node.description ?? ''} onChange={e => onUpdate({ ...node, description: e.target.value })}
          placeholder="Ex: Realize o depósito e envie o comprovante na próxima etapa."
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none resize-none transition-colors"
          style={inputSty}
          onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
          onBlur={e  => { e.currentTarget.style.borderColor = blurSty }} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className={labelCls}>Valores</label>
          <select
            value={bi.currency ?? 'BRL'}
            onChange={e => setInfo({ currency: e.target.value })}
            className="px-2.5 py-1.5 rounded-lg text-[12px] text-[#EDEDED] outline-none appearance-none"
            style={{ background: '#0D0E12', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <option value="BRL">BRL — Real</option>
            <option value="JPY">JPY — Yen</option>
            <option value="USD">USD — Dólar</option>
          </select>
        </div>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] text-white/25 uppercase tracking-wider">Matrícula</label>
            <input value={bi.enrollmentAmount ?? ''} onChange={e => setInfo({ enrollmentAmount: e.target.value })}
              placeholder="Ex: 1200.00" className={inputCls} style={inputSty}
              onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
              onBlur={e  => { e.currentTarget.style.borderColor = blurSty }} />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] text-white/25 uppercase tracking-wider">Mensalidade</label>
            <input value={bi.monthlyAmount ?? ''} onChange={e => setInfo({ monthlyAmount: e.target.value })}
              placeholder="Ex: 250.00" className={inputCls} style={inputSty}
              onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
              onBlur={e  => { e.currentTarget.style.borderColor = blurSty }} />
          </div>
        </div>
        <p className="text-[10px] text-white/20">Use apenas números (ex: 1200.00). A moeda é definida pelo campo acima.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Nome do Beneficiário / 受取人名</label>
        <input value={bi.beneficiaryName ?? ''} onChange={e => setInfo({ beneficiaryName: e.target.value })}
          placeholder="Ex: Bridge Cultural Center" className={inputCls} style={inputSty}
          onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
          onBlur={e  => { e.currentTarget.style.borderColor = blurSty }} />
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
      <p className={labelCls}>Dados para Transferência Bancária</p>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] text-white/25 uppercase tracking-wider">Banco</label>
            <input value={bi.bankName ?? ''} onChange={e => setInfo({ bankName: e.target.value })}
              placeholder="Ex: Nubank" className={inputCls} style={inputSty}
              onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
              onBlur={e  => { e.currentTarget.style.borderColor = blurSty }} />
          </div>
          <div className="flex flex-col gap-1.5" style={{ width: 100 }}>
            <label className="text-[10px] text-white/25 uppercase tracking-wider">Agência</label>
            <input value={bi.agency ?? ''} onChange={e => setInfo({ agency: e.target.value })}
              placeholder="0001" className={inputCls} style={inputSty}
              onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
              onBlur={e  => { e.currentTarget.style.borderColor = blurSty }} />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] text-white/25 uppercase tracking-wider">Conta</label>
            <input value={bi.account ?? ''} onChange={e => setInfo({ account: e.target.value })}
              placeholder="12345-6" className={inputCls} style={inputSty}
              onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
              onBlur={e  => { e.currentTarget.style.borderColor = blurSty }} />
          </div>
          <div className="flex flex-col gap-1.5" style={{ width: 120 }}>
            <label className="text-[10px] text-white/25 uppercase tracking-wider">Tipo</label>
            <select value={bi.accountType ?? ''} onChange={e => setInfo({ accountType: e.target.value })}
              className="px-2.5 py-2 rounded-lg text-[12px] text-[#EDEDED] outline-none appearance-none w-full"
              style={{ background: '#0D0E12', border: '1px solid rgba(255,255,255,0.08)' }}>
              <option value="">Tipo…</option>
              <option value="Corrente">Corrente</option>
              <option value="Poupança">Poupança</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PaymentDoneEditor ─────────────────────────────────────────

function PaymentDoneEditor({ node, onUpdate }: { node: FormNode; onUpdate: (n: FormNode) => void }) {
  const labelCls = 'text-[11px] font-semibold uppercase tracking-widest text-white/30'
  const inputCls = 'w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none transition-colors'
  const inputSty = { background: '#0D0E12', border: '1px solid rgba(255,255,255,0.08)' }
  const focusSty = 'rgba(16,185,129,0.45)'
  const blurSty  = 'rgba(255,255,255,0.08)'

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">

      <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <Banknote className="w-4 h-4 shrink-0 text-emerald-400" />
        <p className="text-[12px] leading-relaxed text-emerald-300/80">
          Tela de confirmação para pagamento em dinheiro. Exibe uma mensagem e finaliza o formulário.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Título da Tela</label>
        <input value={node.title} onChange={e => onUpdate({ ...node, title: e.target.value })}
          placeholder="Ex: Pagamento em dinheiro confirmado" className={inputCls} style={inputSty}
          onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
          onBlur={e  => { e.currentTarget.style.borderColor = blurSty }} />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Mensagem / Instrução</label>
        <textarea value={node.description ?? ''} onChange={e => onUpdate({ ...node, description: e.target.value })}
          placeholder="Ex: Compareça ao local com o valor exato no dia da matrícula."
          rows={4}
          className="w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none resize-none transition-colors"
          style={inputSty}
          onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
          onBlur={e  => { e.currentTarget.style.borderColor = blurSty }} />
      </div>
    </div>
  )
}

// ── ReceiptUploadEditor ───────────────────────────────────────

function ReceiptUploadEditor({ node, nodes, onUpdate }: {
  node:     FormNode
  nodes:    FormNode[]
  onUpdate: (n: FormNode) => void
}) {
  const labelCls = 'text-[11px] font-semibold uppercase tracking-widest text-white/30'
  const inputCls = 'w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none transition-colors'
  const inputSty = { background: '#0D0E12', border: '1px solid rgba(255,255,255,0.08)' }
  const focusSty = 'rgba(139,92,246,0.45)'
  const blurSty  = 'rgba(255,255,255,0.08)'
  const selCls   = 'px-2.5 py-1.5 rounded-md text-[12px] text-[#EDEDED] outline-none appearance-none cursor-pointer'

  function addJump() {
    onUpdate({ ...node, logicJumps: [...node.logicJumps, { id: uid(), ifOption: '', jumpToNodeId: '' }] })
  }

  const targets = nodes.filter(n => n.id !== node.id)

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">

      <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
        style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
        <Upload className="w-4 h-4 shrink-0 text-violet-400" />
        <p className="text-[12px] leading-relaxed text-violet-300/80">
          O lead faz o upload do comprovante de pagamento. O arquivo é salvo e vinculado ao lead.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Título da Tela</label>
        <input value={node.title} onChange={e => onUpdate({ ...node, title: e.target.value })}
          placeholder="Ex: Envie o comprovante" className={inputCls} style={inputSty}
          onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
          onBlur={e  => { e.currentTarget.style.borderColor = blurSty }} />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Instrução</label>
        <textarea value={node.description ?? ''} onChange={e => onUpdate({ ...node, description: e.target.value })}
          placeholder="Ex: Envie a foto ou PDF do comprovante de depósito."
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none resize-none transition-colors"
          style={inputSty}
          onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
          onBlur={e  => { e.currentTarget.style.borderColor = blurSty }} />
      </div>

      {/* Logic jumps — unconditional redirects after upload */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#E8521A]" />
            <label className={labelCls}>Redirecionar após envio</label>
          </div>
          <button onClick={addJump}
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md text-[#E8521A] transition-colors"
            style={{ background: 'rgba(232,82,26,0.1)', border: '1px solid rgba(232,82,26,0.2)' }}>
            <Plus className="w-3 h-3" /> Adicionar
          </button>
        </div>

        {node.logicJumps.length === 0 ? (
          <p className="text-[12px] text-white/25 px-1">
            Sem redirecionamento — avança para a próxima tela em sequência.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {node.logicJumps.map(jump => (
              <div key={jump.id} className="flex items-center gap-2 p-3 rounded-lg"
                style={{ background: 'rgba(232,82,26,0.04)', border: '1px solid rgba(232,82,26,0.12)' }}>
                <span className="text-[11px] font-semibold text-white/30 shrink-0">Após envio →</span>
                <select
                  value={jump.jumpToNodeId}
                  onChange={e => onUpdate({ ...node, logicJumps: node.logicJumps.map(j => j.id === jump.id ? { ...jump, jumpToNodeId: e.target.value, ifOption: '' } : j) })}
                  className={selCls} style={{ background: '#0D0E12', border: '1px solid rgba(255,255,255,0.08)', flex: 1 }}>
                  <option value="">escolher destino…</option>
                  {targets.map(n => (
                    <option key={n.id} value={n.id}>
                      {String(nodes.indexOf(n) + 1).padStart(2, '0')} — {n.title || 'Sem título'}
                    </option>
                  ))}
                  <option value="__end__">⏹ Finalizar formulário</option>
                </select>
                <button onClick={() => onUpdate({ ...node, logicJumps: node.logicJumps.filter(j => j.id !== jump.id) })}
                  className="p-1 rounded text-white/20 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── ScreenEditor (welcome / thankyou) ─────────────────────────

function ScreenEditor({ node, onUpdate }: { node: FormNode; onUpdate: (n: FormNode) => void }) {
  const { color } = TYPE_META[node.type]
  const isWelcome = node.type === 'welcome'
  const labelCls  = 'text-[11px] font-semibold uppercase tracking-widest text-white/30'
  const inputCls  = 'w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none transition-colors'
  const inputSty  = { background: '#0D0E12', border: '1px solid rgba(255,255,255,0.08)' }
  const focusSty  = 'rgba(232,82,26,0.45)'
  const blurSty   = 'rgba(255,255,255,0.08)'

  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 3 MB.'); return }
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `logos/${node.id}.${ext}`
      const { error } = await supabase.storage.from('form-assets').upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('form-assets').getPublicUrl(path)
      onUpdate({ ...node, logoUrl: publicUrl })
      toast.success('Logo enviada!')
    } catch {
      toast.error('Erro ao enviar imagem.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">

      {/* Header hint */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
        style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
        {isWelcome
          ? <Sparkles className="w-4 h-4 shrink-0" style={{ color }} />
          : <CheckCircle className="w-4 h-4 shrink-0" style={{ color }} />}
        <p className="text-[12px] leading-relaxed" style={{ color: `${color}cc` }}>
          {isWelcome
            ? 'Tela exibida antes das perguntas. Use para contextualizar o formulário.'
            : 'Tela exibida após o término do formulário. Personalize a mensagem de encerramento.'}
        </p>
      </div>

      {/* Logo / Imagem (só welcome) */}
      {isWelcome && (
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Logo / Imagem</label>

          {node.logoUrl ? (
            <div className="relative w-full flex items-center justify-center rounded-xl overflow-hidden"
              style={{ background: '#0D0E12', border: '1px solid rgba(255,255,255,0.08)', minHeight: 120 }}>
              <img src={node.logoUrl} alt="Logo" className="max-h-28 max-w-full object-contain p-3" />
              <div className="absolute top-2 right-2 flex gap-1.5">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                  Trocar
                </button>
                <button
                  onClick={() => onUpdate({ ...node, logoUrl: undefined })}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171' }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center justify-center gap-2 rounded-xl py-7 transition-all"
              style={{ background: '#0D0E12', border: '1px dashed rgba(255,255,255,0.12)',
                color: uploading ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)' }}>
              <ImageIcon className="w-5 h-5" />
              <span className="text-[12px]">
                {uploading ? 'Enviando…' : 'Clique para enviar logo ou imagem'}
              </span>
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.15)' }}>
                PNG, JPG, WebP · máx. 3 MB
              </span>
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>
      )}

      {/* Título */}
      <div className="flex flex-col gap-2">
        <label className={labelCls}>{isWelcome ? 'Título Principal' : 'Título de Encerramento'}</label>
        <input
          value={node.title}
          onChange={e => onUpdate({ ...node, title: e.target.value })}
          placeholder={isWelcome ? 'Ex: Bem-vindo ao Simulado Koukousei!' : 'Ex: Tudo certo! Entraremos em contato.'}
          className={inputCls}
          style={inputSty}
          onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
          onBlur={e  => { e.currentTarget.style.borderColor = blurSty }}
        />
      </div>

      {/* Descrição */}
      <div className="flex flex-col gap-2">
        <label className={labelCls}>{isWelcome ? 'Subtítulo / Descrição' : 'Mensagem'}</label>
        <textarea
          value={node.description ?? ''}
          onChange={e => onUpdate({ ...node, description: e.target.value })}
          placeholder={isWelcome
            ? 'Ex: Responda algumas perguntas e descubra o plano ideal para você.'
            : 'Ex: Nossa equipe analisará suas respostas e entrará em contato em até 24h.'}
          rows={4}
          className="w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none resize-none transition-colors"
          style={inputSty}
          onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
          onBlur={e  => { e.currentTarget.style.borderColor = blurSty }}
        />
      </div>

      {/* Botão CTA (só welcome) */}
      {isWelcome && (
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Texto do Botão</label>
          <input
            value={node.buttonLabel ?? ''}
            onChange={e => onUpdate({ ...node, buttonLabel: e.target.value })}
            placeholder="Ex: Começar agora →"
            className={inputCls}
            style={inputSty}
            onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
            onBlur={e  => { e.currentTarget.style.borderColor = blurSty }}
          />
        </div>
      )}

      {/* Redes Sociais (só thankyou) */}
      {!isWelcome && (
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelCls}>Redes Sociais e Contatos</label>
            <p className="text-[11px] text-white/25 mt-1">Exibidos como botões na tela final do formulário.</p>
          </div>
          {SOCIAL_PLATFORMS.map(({ id, label, Icon, placeholder }) => {
            const current = node.socialLinks?.find(s => s.platform === id)
            const active  = !!current
            return (
              <div key={id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: active ? '#E8521A' : 'rgba(255,255,255,0.3)' }} />
                  <span className="text-[12px] flex-1" style={{ color: active ? '#EDEDED' : 'rgba(255,255,255,0.4)' }}>{label}</span>
                  <button
                    onClick={() => {
                      const links = node.socialLinks ?? []
                      onUpdate({ ...node, socialLinks: active
                        ? links.filter(s => s.platform !== id)
                        : [...links, { platform: id, url: '' }]
                      })
                    }}
                    className="relative rounded-full transition-all duration-200 shrink-0"
                    style={{ width: 32, height: 18, background: active ? '#E8521A' : 'rgba(255,255,255,0.1)' }}>
                    <span className="absolute top-0.5 left-0.5 rounded-full bg-white transition-transform duration-200"
                      style={{ width: 14, height: 14, transform: active ? 'translateX(14px)' : 'none' }} />
                  </button>
                </div>
                {active && (
                  <input
                    value={current?.url ?? ''}
                    onChange={e => {
                      const links = (node.socialLinks ?? []).map(s =>
                        s.platform === id ? { ...s, url: e.target.value } : s
                      )
                      onUpdate({ ...node, socialLinks: links })
                    }}
                    placeholder={placeholder}
                    className={inputCls}
                    style={inputSty}
                    onFocus={e => { e.currentTarget.style.borderColor = focusSty }}
                    onBlur={e  => { e.currentTarget.style.borderColor = blurSty }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── QuestionEditor (campos de coleta) ─────────────────────────

function QuestionEditor({
  node, nodes, onUpdate,
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

  const labelCls = 'text-[11px] font-semibold uppercase tracking-widest text-white/30'
  const inputCls = 'w-full px-3.5 py-2.5 rounded-lg text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none transition-colors'

  const showLogic = !SCREEN_TYPES.includes(node.type)

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">

      {/* Required toggle */}
      {(() => {
        const isReq = node.required !== false
        return (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div>
              <p className="text-[12px] font-semibold text-[#EDEDED]">Pergunta obrigatória</p>
              <p className="text-[11px] text-white/30 mt-0.5">
                {isReq ? 'Impede avançar sem responder' : 'Pode ser pulada pelo respondente'}
              </p>
            </div>
            <button
              onClick={() => set('required', !isReq)}
              className="relative rounded-full transition-all duration-200 shrink-0"
              style={{ width: 36, height: 20, background: isReq ? '#E8521A' : 'rgba(255,255,255,0.1)' }}>
              <span
                className="absolute top-0.5 left-0.5 rounded-full bg-white transition-transform duration-200"
                style={{ width: 16, height: 16, transform: isReq ? 'translateX(16px)' : 'none' }}
              />
            </button>
          </div>
        )
      })()}

      {/* Título */}
      <div className="flex flex-col gap-2">
        <label className={labelCls}>{node.type === 'confirm' ? 'Instrução / Título' : 'Título da Pergunta'}</label>
        <input
          value={node.title}
          onChange={e => set('title', e.target.value)}
          placeholder={node.type === 'confirm' ? 'Ex: Antes de continuar, confirme:' : 'Ex: Qual é o seu nível de japonês?'}
          className={inputCls}
          style={{ background: '#0D0E12', border: '1px solid rgba(255,255,255,0.08)' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(232,82,26,0.45)' }}
          onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* Tipo */}
      <div className="flex flex-col gap-2">
        <label className={labelCls}>Tipo de Resposta</label>

        {/* Dados pessoais */}
        <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold -mb-1">Dados Pessoais</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(['name', 'email', 'phone', 'cpf', 'city', 'state'] as NodeType[]).map(type => {
            const meta   = TYPE_META[type]
            const active = node.type === type
            return (
              <button key={type} onClick={() => set('type', type)}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all text-left',
                  active ? 'text-[#EDEDED]' : 'text-white/40 hover:text-white/70',
                )}
                style={{
                  background: active ? `${meta.color}14` : 'rgba(255,255,255,0.03)',
                  border: active ? `1px solid ${meta.color}35` : '1px solid rgba(255,255,255,0.06)',
                }}>
                <meta.icon className="w-3.5 h-3.5 shrink-0" style={{ color: active ? meta.color : undefined }} />
                {meta.label}
              </button>
            )
          })}
        </div>

        {/* Outros campos */}
        <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mt-2 -mb-1">Outros</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(['text', 'number', 'date', 'radio', 'select', 'textarea', 'confirm'] as NodeType[]).map(type => {
            const meta   = TYPE_META[type]
            const active = node.type === type
            return (
              <button key={type} onClick={() => set('type', type)}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all text-left',
                  active ? 'text-[#EDEDED]' : 'text-white/40 hover:text-white/70',
                )}
                style={{
                  background: active ? `${meta.color}14` : 'rgba(255,255,255,0.03)',
                  border: active ? `1px solid ${meta.color}35` : '1px solid rgba(255,255,255,0.06)',
                }}>
                <meta.icon className="w-3.5 h-3.5 shrink-0" style={{ color: active ? meta.color : undefined }} />
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Opções (radio / select) */}
      {hasOptions && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className={labelCls}>Opções de Resposta</label>
            <span className="text-[10px] text-white/20">{node.options.length} opção{node.options.length !== 1 ? 'ções' : ''}</span>
          </div>
          <OptionsEditor options={node.options} onChange={opts => set('options', opts)} />

          {/* Allow "Outra" toggle */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg mt-1"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <p className="text-[12px] font-medium text-[#EDEDED]">Incluir opção "Outra"</p>
              <p className="text-[11px] text-white/30 mt-0.5">Permite escrever resposta personalizada</p>
            </div>
            <button
              onClick={() => set('allowOther', !node.allowOther)}
              className="relative rounded-full transition-all duration-200 shrink-0"
              style={{ width: 36, height: 20, background: node.allowOther ? '#E8521A' : 'rgba(255,255,255,0.1)' }}>
              <span
                className="absolute top-0.5 left-0.5 rounded-full bg-white transition-transform duration-200"
                style={{ width: 16, height: 16, transform: node.allowOther ? 'translateX(16px)' : 'none' }}
              />
            </button>
          </div>
        </div>
      )}

      {showLogic && hasOptions && node.options.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
      )}

      {/* Logic jumps — available for all non-personal question types */}
      {showLogic && (
        hasOptions && node.options.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
            <Zap className="w-4 h-4 text-white/15 shrink-0" />
            <p className="text-[12px] text-white/25">
              Adicione pelo menos uma opção para criar lógicas de qualificação.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#E8521A]" />
                <label className={labelCls}>Regras de Lógica</label>
              </div>
              <button onClick={addJump}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md text-[#E8521A] transition-colors"
                style={{ background: 'rgba(232,82,26,0.1)', border: '1px solid rgba(232,82,26,0.2)' }}>
                <Plus className="w-3 h-3" /> Adicionar Regra
              </button>
            </div>

            {node.logicJumps.length === 0 ? (
              <div className="flex items-start gap-3 px-4 py-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
                <MousePointerClick className="w-4 h-4 text-white/15 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] text-white/25">Nenhuma regra ainda. Adicione para criar fluxos condicionais.</p>
                  <p className="text-[11px] text-white/15 mt-1">
                    Use <strong className="text-white/25">Desqualificar lead</strong> para filtrar perfis fora do público-alvo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {node.logicJumps.map(jump => (
                  <div key={jump.id} className="p-3 rounded-lg"
                    style={{
                      background: jump.jumpToNodeId === '__disqualify__'
                        ? 'rgba(239,68,68,0.04)'
                        : 'rgba(232,82,26,0.04)',
                      border: jump.jumpToNodeId === '__disqualify__'
                        ? '1px solid rgba(239,68,68,0.15)'
                        : '1px solid rgba(232,82,26,0.12)',
                    }}>
                    {jump.jumpToNodeId === '__disqualify__' && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <XCircle className="w-3 h-3 text-red-400" />
                        <span className="text-[10px] font-semibold text-red-400/70 uppercase tracking-wider">Desqualificação</span>
                      </div>
                    )}
                    <LogicJumpRow
                      jump={jump}
                      options={node.options}
                      nodes={nodes}
                      nodeId={node.id}
                      onChange={updated => set('logicJumps', node.logicJumps.map(j => j.id === jump.id ? updated : j))}
                      onDelete={() => set('logicJumps', node.logicJumps.filter(j => j.id !== jump.id))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}

// ── NodeEditor dispatcher ─────────────────────────────────────

function NodeEditor({ node, nodes, onUpdate }: {
  node:     FormNode
  nodes:    FormNode[]
  onUpdate: (n: FormNode) => void
}) {
  if (node.type === 'bank-deposit')   return <BankDepositEditor   node={node} onUpdate={onUpdate} />
  if (node.type === 'receipt-upload') return <ReceiptUploadEditor node={node} nodes={nodes} onUpdate={onUpdate} />
  if (node.type === 'payment-done')   return <PaymentDoneEditor   node={node} onUpdate={onUpdate} />
  if (SCREEN_TYPES.includes(node.type)) {
    return <ScreenEditor node={node} onUpdate={onUpdate} />
  }
  return <QuestionEditor node={node} nodes={nodes} onUpdate={onUpdate} />
}

// ── Empty state ───────────────────────────────────────────────

function EmptyEditor() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(232,82,26,0.08)', border: '1px solid rgba(232,82,26,0.12)' }}>
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
  const [selectedId, setSelectedId] = useState<string | null>(nodes[0]?.id ?? null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragIdRef                   = useRef<string | null>(null)

  const selected    = nodes.find(n => n.id === selectedId) ?? null
  const hasWelcome  = nodes.some(n => n.type === 'welcome')
  const hasThankyou = nodes.some(n => n.type === 'thankyou')

  const addNode = useCallback(() => {
    const n = blankNode()
    onChange([...nodes, n])
    setSelectedId(n.id)
  }, [nodes, onChange])

  const addWelcome = useCallback(() => {
    if (hasWelcome) return
    const n: FormNode = {
      id: uid(), type: 'welcome',
      title: 'Bem-vindo!', description: 'Responda algumas perguntas rápidas.',
      buttonLabel: 'Começar agora →', options: [], logicJumps: [],
    }
    onChange([n, ...nodes])
    setSelectedId(n.id)
  }, [nodes, onChange, hasWelcome])

  const addThankyou = useCallback(() => {
    if (hasThankyou) return
    const n: FormNode = {
      id: uid(), type: 'thankyou',
      title: 'Tudo certo!', description: 'Suas respostas foram registradas. Nossa equipe entrará em contato em breve.',
      options: [], logicJumps: [],
    }
    onChange([...nodes, n])
    setSelectedId(n.id)
  }, [nodes, onChange, hasThankyou])

  const addBankDeposit = useCallback(() => {
    const n: FormNode = {
      id: uid(), type: 'bank-deposit',
      title: 'Realize o pagamento',
      description: 'Realize o depósito e envie o comprovante na próxima etapa.',
      options: [], logicJumps: [],
    }
    onChange([...nodes, n])
    setSelectedId(n.id)
  }, [nodes, onChange])

  const addReceiptUpload = useCallback(() => {
    const n: FormNode = {
      id: uid(), type: 'receipt-upload',
      title: 'Envie o comprovante',
      description: 'Envie a foto ou PDF do comprovante de depósito.',
      options: [], logicJumps: [],
    }
    onChange([...nodes, n])
    setSelectedId(n.id)
  }, [nodes, onChange])

  const addPaymentDone = useCallback(() => {
    const n: FormNode = {
      id: uid(), type: 'payment-done',
      title: 'Pagamento em dinheiro registrado',
      description: 'Compareça ao local com o valor exato no dia da matrícula.',
      options: [], logicJumps: [],
    }
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

  function handleDrop(targetId: string) {
    const fromId = dragIdRef.current
    if (!fromId || fromId === targetId) { setDragOverId(null); return }
    const from = nodes.findIndex(n => n.id === fromId)
    const to   = nodes.findIndex(n => n.id === targetId)
    if (from === -1 || to === -1) return
    const reordered = [...nodes]
    const [item]    = reordered.splice(from, 1)
    reordered.splice(to, 0, item)
    onChange(reordered)
    dragIdRef.current = null
    setDragOverId(null)
  }

  // Count only real questions (non-screen)
  const questionCount = nodes.filter(n => !SCREEN_TYPES.includes(n.type)).length

  return (
    <div className="flex overflow-hidden rounded-2xl"
      style={{ border: '1px solid rgba(255,255,255,0.07)', minHeight: 560, height: '100%' }}>

      {/* ── Left: question list ── */}
      <div className="w-72 shrink-0 flex flex-col"
        style={{ background: '#16181F', borderRight: '1px solid rgba(255,255,255,0.07)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[12px] font-semibold text-[#EDEDED]">Perguntas</p>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(232,82,26,0.12)', color: '#F0643A' }}>
            {questionCount}
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-[12px] text-white/25 leading-relaxed">
                Nenhuma pergunta ainda.<br />Adicione abaixo.
              </p>
            </div>
          ) : (
            nodes.map((node, idx) => (
              <QuestionCard
                key={node.id}
                node={node}
                index={idx}
                active={selectedId === node.id}
                isDragOver={dragOverId === node.id}
                onClick={() => setSelectedId(node.id)}
                onDelete={() => deleteNode(node.id)}
                onDragStart={() => { dragIdRef.current = node.id }}
                onDragOver={e => { e.preventDefault(); setDragOverId(node.id) }}
                onDrop={() => handleDrop(node.id)}
                onDragEnd={() => { dragIdRef.current = null; setDragOverId(null) }}
              />
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="px-3 py-3 shrink-0 flex flex-col gap-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

          <button onClick={addNode}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-[12px] font-semibold text-[#E8521A] transition-all"
            style={{ background: 'rgba(232,82,26,0.08)', border: '1px solid rgba(232,82,26,0.18)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,82,26,0.14)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,82,26,0.08)' }}>
            <Plus className="w-3.5 h-3.5" /> Adicionar Pergunta
          </button>

          <div className="flex gap-2">
            <button
              onClick={addWelcome}
              disabled={hasWelcome}
              title={hasWelcome ? 'Já existe uma tela de boas-vindas' : 'Adicionar tela inicial'}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: 'rgba(232,82,26,0.05)', border: '1px dashed rgba(232,82,26,0.2)', color: '#E8521A' }}>
              <Sparkles className="w-3 h-3" /> Intro
            </button>
            <button
              onClick={addThankyou}
              disabled={hasThankyou}
              title={hasThankyou ? 'Já existe uma tela de encerramento' : 'Adicionar tela final'}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: 'rgba(52,211,153,0.05)', border: '1px dashed rgba(52,211,153,0.2)', color: '#34D399' }}>
              <CheckCircle className="w-3 h-3" /> Final
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addBankDeposit}
              title="Adicionar tela de dados bancários"
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
              style={{ background: 'rgba(59,130,246,0.05)', border: '1px dashed rgba(59,130,246,0.2)', color: '#3B82F6' }}>
              <Landmark className="w-3 h-3" /> Depósito
            </button>
            <button
              onClick={addReceiptUpload}
              title="Adicionar tela de upload de comprovante"
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
              style={{ background: 'rgba(139,92,246,0.05)', border: '1px dashed rgba(139,92,246,0.2)', color: '#8B5CF6' }}>
              <Upload className="w-3 h-3" /> Comprovante
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addPaymentDone}
              title="Adicionar tela de confirmação de pagamento em dinheiro"
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
              style={{ background: 'rgba(16,185,129,0.05)', border: '1px dashed rgba(16,185,129,0.2)', color: '#10B981' }}>
              <Banknote className="w-3 h-3" /> Dinheiro
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: editor ── */}
      <div className="flex-1 overflow-hidden" style={{ background: '#13151A' }}>
        {selected
          ? <NodeEditor node={selected} nodes={nodes} onUpdate={updateNode} />
          : <EmptyEditor />}
      </div>
    </div>
  )
}

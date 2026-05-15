import { useEffect, useState, useMemo } from 'react'
import {
  Search, SlidersHorizontal, RefreshCw, X,
  Users, Clock, CreditCard, CheckCircle2,
  Mail, ExternalLink, Copy, ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { BridgeLead } from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Types ─────────────────────────────────────────────────────

type StageId = 'started' | 'qualified' | 'pending' | 'paid'

interface KanbanLead {
  id:              string
  name:            string
  email:           string
  product:         string
  value:           number | null   // JPY
  stage:           StageId
  updatedAt:       string
  answers:         Record<string, string>
  stripeSessionId: string | null
  isMock?:         boolean
}

// ── Tokens ────────────────────────────────────────────────────

const BG_PAGE   = '#0D0E12'
const BG_COL    = '#13151A'
const BG_CARD   = '#1E202A'
const BORDER    = 'rgba(255,255,255,0.06)'

// ── Column config ─────────────────────────────────────────────

const STAGE_CONFIG: Record<StageId, {
  label:       string
  sub:         string
  icon:        React.ElementType
  dot:         string
  accent:      string
  badgeBg:     string
  badgeText:   string
  valueColor:  string
}> = {
  started: {
    label:      'Quizz Iniciado',
    sub:        'Pararam no formulário',
    icon:       Users,
    dot:        '#71717A',
    accent:     'rgba(113,113,122,0.08)',
    badgeBg:    'rgba(113,113,122,0.15)',
    badgeText:  '#A1A1AA',
    valueColor: '#71717A',
  },
  qualified: {
    label:      'Qualificado',
    sub:        'Completaram o Quizz',
    icon:       Clock,
    dot:        '#60A5FA',
    accent:     'rgba(96,165,250,0.08)',
    badgeBg:    'rgba(96,165,250,0.14)',
    badgeText:  '#93C5FD',
    valueColor: '#60A5FA',
  },
  pending: {
    label:      'Checkout Pendente',
    sub:        'Link Stripe gerado',
    icon:       CreditCard,
    dot:        '#FBBF24',
    accent:     'rgba(251,191,36,0.08)',
    badgeBg:    'rgba(251,191,36,0.14)',
    badgeText:  '#FCD34D',
    valueColor: '#FBBF24',
  },
  paid: {
    label:      'Convertido / Pago',
    sub:        'Pagamento confirmado',
    icon:       CheckCircle2,
    dot:        '#34D399',
    accent:     'rgba(52,211,153,0.08)',
    badgeBg:    'rgba(52,211,153,0.14)',
    badgeText:  '#6EE7B7',
    valueColor: '#34D399',
  },
}

const STAGE_ORDER: StageId[] = ['started', 'qualified', 'pending', 'paid']

// ── Mock data ─────────────────────────────────────────────────

const MOCK_LEADS: KanbanLead[] = [
  // Quizz Iniciado
  {
    id: 'm1', name: 'Yuki Tanaka', email: 'yuki.tanaka@gmail.com',
    product: '—', value: null, stage: 'started',
    updatedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    answers: { nivel: 'Iniciante', parou_em: 'Pergunta 2 de 7' },
    stripeSessionId: null, isMock: true,
  },
  {
    id: 'm2', name: 'Pedro Alves', email: 'pedro.alves@outlook.com',
    product: '—', value: null, stage: 'started',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    answers: { nivel: 'Básico', parou_em: 'Pergunta 1 de 7' },
    stripeSessionId: null, isMock: true,
  },
  {
    id: 'm3', name: 'Maria Silva', email: 'maria.silva@hotmail.com',
    product: '—', value: null, stage: 'started',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 11).toISOString(),
    answers: { nivel: 'Intermediário', parou_em: 'Pergunta 4 de 7' },
    stripeSessionId: null, isMock: true,
  },

  // Qualificado
  {
    id: 'm4', name: 'Kenji Ito', email: 'kenji.ito@company.co.jp',
    product: 'Mentoria 1:1 Intensiva', value: 38000, stage: 'qualified',
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    answers: { nivel: 'Avançado — N2 ou N1', objetivo: 'Trabalho ou visto de residência', horas: 'Mais de 20 horas', mensagem: 'Preciso do visto de trabalho até março do ano que vem.' },
    stripeSessionId: null, isMock: true,
  },
  {
    id: 'm5', name: 'Ana Rodrigues', email: 'ana.rodrigues@gmail.com',
    product: 'Reforço Escolar de Japonês', value: 12000, stage: 'qualified',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    answers: { nivel: 'Iniciante — nunca estudei', objetivo: 'Faculdade no Japão (Koukousei)', horas: 'Entre 10 e 20 horas', mensagem: 'Quero estudar em Tokyo no próximo ano letivo.' },
    stripeSessionId: null, isMock: true,
  },
  {
    id: 'm6', name: 'Carlos Mendes', email: 'carlos.mendes@usp.br',
    product: 'Simulado Koukousei 2025', value: 5800, stage: 'qualified',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    answers: { nivel: 'Intermediário — N4 ou N3', objetivo: 'Passar no JLPT N2 ou N1', horas: 'Entre 5 e 10 horas' },
    stripeSessionId: null, isMock: true,
  },

  // Checkout Pendente
  {
    id: 'm7', name: 'Hana Suzuki', email: 'hana.suzuki@gmail.com',
    product: 'Mentoria 1:1 Intensiva', value: 38000, stage: 'pending',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    answers: { nivel: 'Avançado — N2 ou N1', objetivo: 'Trabalho ou visto de residência', horas: 'Mais de 20 horas' },
    stripeSessionId: 'cs_test_mock_hana', isMock: true,
  },
  {
    id: 'm8', name: 'Takeshi Yamamoto', email: 'takeshi.y@yahoo.co.jp',
    product: 'Simulado Koukousei 2025', value: 5800, stage: 'pending',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    answers: { nivel: 'Intermediário — N4 ou N3', objetivo: 'Passar no JLPT N2 ou N1', horas: 'Entre 5 e 10 horas' },
    stripeSessionId: 'cs_test_mock_takeshi', isMock: true,
  },

  // Convertido / Pago
  {
    id: 'm9', name: 'Lúcia Ferreira', email: 'lucia.f@gmail.com',
    product: 'Reforço Escolar de Japonês', value: 12000, stage: 'paid',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    answers: { nivel: 'Básico — conheço hiragana e katakana', objetivo: 'Faculdade no Japão (Koukousei)', horas: 'Entre 10 e 20 horas' },
    stripeSessionId: 'cs_test_mock_lucia', isMock: true,
  },
  {
    id: 'm10', name: 'João Costa', email: 'joao.costa@empresa.com.br',
    product: 'Mentoria 1:1 Intensiva', value: 38000, stage: 'paid',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    answers: { nivel: 'Avançado — N2 ou N1', objetivo: 'Trabalho ou visto de residência', horas: 'Mais de 20 horas', mensagem: 'Excelente atendimento. Muito animado para começar!' },
    stripeSessionId: 'cs_test_mock_joao', isMock: true,
  },
]

// ── Helpers ───────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)               return 'agora'
  const m = Math.floor(s / 60)
  if (m < 60)               return `${m} min atrás`
  const h = Math.floor(m / 60)
  if (h < 24)               return `${h}h atrás`
  const d = Math.floor(h / 24)
  return `${d}d atrás`
}

function fmtJPY(v: number): string {
  return `¥ ${v.toLocaleString('ja-JP')}`
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const AVATAR_PALETTES = [
  { bg: 'rgba(232,82,26,0.18)',  text: '#E8521A' },
  { bg: 'rgba(96,165,250,0.18)', text: '#60A5FA' },
  { bg: 'rgba(52,211,153,0.18)', text: '#34D399' },
  { bg: 'rgba(167,139,250,0.18)',text: '#A78BFA' },
  { bg: 'rgba(251,191,36,0.18)', text: '#FBBF24' },
  { bg: 'rgba(249,115,22,0.18)', text: '#FB923C' },
]

function avatarPalette(name: string) {
  const code = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_PALETTES[code % AVATAR_PALETTES.length]
}

function transformLead(l: BridgeLead): KanbanLead {
  const ans = (l.answers ?? {}) as Record<string, string>
  const name  = ans.nome || ans.name || ans.full_name || l.email?.split('@')[0] || '—'
  const prod  = ans.produto || ans.product || ans.plano || '—'
  const rawVal = ans.valor || ans.value
  const value  = rawVal ? parseInt(rawVal.replace(/\D/g, ''), 10) || null : null

  let stage: StageId = 'started'
  if (l.completed && l.stripe_session_id) stage = 'pending'
  else if (l.completed) stage = 'qualified'

  return {
    id:              l.id,
    name,
    email:           l.email ?? '—',
    product:         prod,
    value,
    stage,
    updatedAt:       l.updated_at,
    answers:         ans,
    stripeSessionId: l.stripe_session_id,
  }
}

// ── Lead Card ─────────────────────────────────────────────────

function LeadCard({
  lead,
  onSelect,
}: {
  lead:     KanbanLead
  onSelect: (l: KanbanLead) => void
}) {
  const pal  = avatarPalette(lead.name)
  const cfg  = STAGE_CONFIG[lead.stage]
  const ini  = initials(lead.name)

  return (
    <div
      onClick={() => onSelect(lead)}
      className="group flex flex-col gap-3 p-4 rounded-xl cursor-pointer select-none"
      style={{
        background: BG_CARD,
        border:     `1px solid ${BORDER}`,
        boxShadow:  '0 2px 8px rgba(0,0,0,0.25)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'rgba(232,82,26,0.3)'
        el.style.boxShadow   = '0 4px 20px rgba(232,82,26,0.08)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = BORDER
        el.style.boxShadow   = '0 2px 8px rgba(0,0,0,0.25)'
      }}
    >
      {/* Top row: avatar + name/email */}
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: pal.bg, color: pal.text }}
        >
          {ini}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: '#F1F5F9' }}>
            {lead.name}
          </p>
          <p className="text-[11px] truncate mt-0.5" style={{ color: '#71717A' }}>
            {lead.email}
          </p>
        </div>
        <ChevronRight
          className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'rgba(232,82,26,0.7)' }}
        />
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

      {/* Product + value */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Produto
          </p>
          <p className="text-[12px] truncate" style={{ color: '#A1A1AA' }}>
            {lead.product}
          </p>
        </div>
        {lead.value !== null && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Valor
            </p>
            <p className="text-[13px] font-bold font-mono" style={{ color: cfg.valueColor }}>
              {fmtJPY(lead.value)}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {timeAgo(lead.updatedAt)}
        </span>

        {lead.isMock && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' }}
          >
            DEMO
          </span>
        )}

        {lead.stripeSessionId && !lead.isMock && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-md font-semibold"
            style={{ background: cfg.badgeBg, color: cfg.badgeText }}
          >
            Stripe ✓
          </span>
        )}
      </div>
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────

function KanbanColumn({
  stageId,
  leads,
  onSelect,
}: {
  stageId:  StageId
  leads:    KanbanLead[]
  onSelect: (l: KanbanLead) => void
}) {
  const cfg   = STAGE_CONFIG[stageId]
  const Icon  = cfg.icon
  const total = leads.reduce((s, l) => s + (l.value ?? 0), 0)

  return (
    <div
      className="flex flex-col shrink-0 rounded-2xl overflow-hidden"
      style={{ width: 296, background: BG_COL, border: `1px solid ${BORDER}` }}
    >
      {/* Column header */}
      <div
        className="shrink-0 px-4 pt-4 pb-3"
        style={{ background: cfg.accent, borderBottom: `1px solid ${BORDER}` }}
      >
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: `${cfg.dot}22` }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: cfg.dot }} />
            </div>
            <div>
              <p className="text-[12px] font-bold leading-tight" style={{ color: '#F1F5F9' }}>
                {cfg.label}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {cfg.sub}
              </p>
            </div>
          </div>

          <span
            className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-lg tabular-nums"
            style={{ background: cfg.badgeBg, color: cfg.badgeText }}
          >
            {leads.length}
          </span>
        </div>

        {/* Value total */}
        {total > 0 && (
          <div
            className="flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}
          >
            <TrendingUp className="w-3 h-3 shrink-0" style={{ color: cfg.dot }} />
            <span className="text-[11px] font-mono font-semibold" style={{ color: cfg.dot }}>
              {fmtJPY(total)}
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              potencial
            </span>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 flex flex-col gap-2.5 p-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
        {leads.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <p className="text-[11px] text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.15)' }}>
              Nenhum lead<br />nesta etapa
            </p>
          </div>
        ) : (
          leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  )
}

// ── Lead Detail Drawer ─────────────────────────────────────────

function LeadDrawer({
  lead,
  onClose,
}: {
  lead:    KanbanLead | null
  onClose: () => void
}) {
  if (!lead) return null

  const cfg = STAGE_CONFIG[lead.stage]
  const pal = avatarPalette(lead.name)
  const ini = initials(lead.name)

  function copyEmail() {
    navigator.clipboard.writeText(lead.email)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 400,
          background: '#16181F',
          borderLeft: `1px solid ${BORDER}`,
          boxShadow: '-24px 0 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Drawer header */}
        <div
          className="shrink-0 flex items-start gap-4 px-6 py-5"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-[14px] font-bold shrink-0"
            style={{ background: pal.bg, color: pal.text }}
          >
            {ini}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold truncate" style={{ color: '#F1F5F9' }}>
              {lead.name}
            </p>
            <p className="text-[12px] truncate mt-0.5" style={{ color: '#71717A' }}>
              {lead.email}
            </p>
            <span
              className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-bold px-2 py-0.5 rounded-md"
              style={{ background: cfg.badgeBg, color: cfg.badgeText }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
              {cfg.label}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#52525B' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EDEDED' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#52525B' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Product + value */}
          {(lead.product !== '—' || lead.value !== null) && (
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-1"
                  style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Produto de Interesse
                </p>
                <p className="text-[13px] font-medium" style={{ color: '#EDEDED' }}>
                  {lead.product}
                </p>
              </div>
              {lead.value !== null && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest font-semibold mb-1"
                    style={{ color: 'rgba(255,255,255,0.2)' }}>
                    Valor
                  </p>
                  <p className="text-[18px] font-bold font-mono" style={{ color: cfg.valueColor }}>
                    {fmtJPY(lead.value)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Quiz answers */}
          {Object.keys(lead.answers).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-3"
                style={{ color: 'rgba(255,255,255,0.25)' }}>
                Respostas do Quizz
              </p>
              <div className="flex flex-col gap-2">
                {Object.entries(lead.answers).map(([key, val]) => (
                  <div
                    key={key}
                    className="px-3 py-3 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}` }}
                  >
                    <p className="text-[10px] font-semibold capitalize mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[12px]" style={{ color: '#C4C4C8' }}>
                      {val}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-3"
              style={{ color: 'rgba(255,255,255,0.25)' }}>
              Atividade
            </p>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Última atividade', time: lead.updatedAt },
                { label: 'Entrou no funil',  time: lead.updatedAt },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[12px]" style={{ color: '#71717A' }}>{item.label}</span>
                  <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {timeAgo(item.time)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer actions */}
        <div
          className="shrink-0 flex flex-col gap-2 px-6 py-4"
          style={{ borderTop: `1px solid ${BORDER}` }}
        >
          <button
            onClick={copyEmail}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                       text-[13px] font-semibold transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border:     `1px solid ${BORDER}`,
              color:      '#A1A1AA',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EDEDED' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA' }}
          >
            <Copy className="w-3.5 h-3.5" />
            Copiar E-mail
          </button>

          <a
            href={`mailto:${lead.email}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                       text-[13px] font-semibold transition-all text-white"
            style={{ background: '#E8521A', boxShadow: '0 4px 16px rgba(232,82,26,0.2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.88' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
          >
            <Mail className="w-3.5 h-3.5" />
            Enviar E-mail
          </a>

          {lead.stripeSessionId && (
            <a
              href={`https://dashboard.stripe.com/payments`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl
                         text-[12px] font-medium transition-colors"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.6)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.3)' }}
            >
              <ExternalLink className="w-3 h-3" />
              Ver no Stripe Dashboard
            </a>
          )}
        </div>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function LeadsKanbanPage() {
  const [realLeads, setRealLeads] = useState<KanbanLead[]>([])
  const [loading,   setLoading]   = useState(true)
  const [query,     setQuery]     = useState('')
  const [selected,  setSelected]  = useState<KanbanLead | null>(null)

  async function loadLeads() {
    setLoading(true)
    const { data } = await supabase
      .from('bridge_leads')
      .select('*')
      .order('updated_at', { ascending: false })
    setRealLeads((data ?? []).map(l => transformLead(l as BridgeLead)))
    setLoading(false)
  }

  useEffect(() => { loadLeads() }, [])

  // Merge: show real data if available, otherwise show mock
  const allLeads = useMemo<KanbanLead[]>(() => {
    if (realLeads.length > 0) return realLeads
    return MOCK_LEADS
  }, [realLeads])

  // Filter by search query
  const filtered = useMemo(() => {
    if (!query.trim()) return allLeads
    const q = query.toLowerCase()
    return allLeads.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.product.toLowerCase().includes(q),
    )
  }, [allLeads, query])

  // Totals for page header KPIs
  const totalLeads     = allLeads.length
  const totalConverted = allLeads.filter(l => l.stage === 'paid').length
  const totalRevenue   = allLeads.filter(l => l.stage === 'paid').reduce((s, l) => s + (l.value ?? 0), 0)
  const totalPipeline  = allLeads.filter(l => l.stage !== 'started').reduce((s, l) => s + (l.value ?? 0), 0)

  const isMockData = realLeads.length === 0

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: BG_PAGE }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div
        className="shrink-0 px-8 pt-6 pb-5"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        {/* Title + actions row */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold tracking-tight" style={{ color: '#F1F5F9' }}>
                Funil de Vendas
              </h1>
              {isMockData && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.2)' }}
                >
                  DEMO
                </span>
              )}
            </div>
            <p className="text-[13px] mt-0.5" style={{ color: '#52525B' }}>
              Acompanhe a jornada de qualificação e checkout dos seus leads
            </p>
          </div>

          {/* Search + actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}
            >
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: '#52525B' }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar lead…"
                className="bg-transparent border-0 outline-none text-[12px] w-40"
                style={{ color: '#EDEDED' }}
              />
              {query && (
                <button onClick={() => setQuery('')}>
                  <X className="w-3 h-3" style={{ color: '#52525B' }} />
                </button>
              )}
            </div>

            {/* Filter */}
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border:     `1px solid ${BORDER}`,
                color:      '#71717A',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EDEDED' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#71717A' }}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtros
            </button>

            {/* Refresh */}
            <button
              onClick={loadLeads}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border:     `1px solid ${BORDER}`,
                color:      '#71717A',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EDEDED' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#71717A' }}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="flex items-center gap-6 mt-4">
          {[
            { label: 'Total de Leads',    value: String(totalLeads),          color: '#A1A1AA' },
            { label: 'Convertidos',       value: String(totalConverted),       color: '#34D399' },
            { label: 'Receita Confirmada',value: totalRevenue > 0 ? fmtJPY(totalRevenue) : '—', color: '#34D399' },
            { label: 'Pipeline Total',    value: totalPipeline > 0 ? fmtJPY(totalPipeline) : '—', color: '#60A5FA' },
          ].map(kpi => (
            <div key={kpi.label} className="flex items-center gap-2">
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {kpi.label}
              </span>
              <span className="text-[13px] font-bold font-mono" style={{ color: kpi.color }}>
                {kpi.value}
              </span>
            </div>
          )).reduce((acc, el, i) => [
            ...acc,
            el,
            i < 3
              ? <span key={`sep-${i}`} style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
              : null,
          ], [] as (React.ReactNode)[])}
        </div>
      </div>

      {/* ── Kanban Board ─────────────────────────────────────── */}
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{ padding: '20px 24px' }}
      >
        <div className="flex gap-4 h-full" style={{ minWidth: `${STAGE_ORDER.length * 312}px` }}>
          {STAGE_ORDER.map(stageId => (
            <KanbanColumn
              key={stageId}
              stageId={stageId}
              leads={filtered.filter(l => l.stage === stageId)}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      {/* ── Lead Detail Drawer ───────────────────────────────── */}
      <LeadDrawer lead={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

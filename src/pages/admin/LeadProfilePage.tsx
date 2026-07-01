import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, User, MapPin, FileText,
  Calendar, CheckCircle2, XCircle, ShoppingBag,
  ExternalLink, ChevronDown, ChevronUp, RefreshCw,
  CreditCard, Link2,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLeadProfile } from '@/hooks/useLeadProfile'
import type { LeadInteraction, LeadPurchase } from '@/hooks/useLeadProfile'
import type { FormNode } from '@/components/form-builder/FormBuilder'

// ── Tokens ────────────────────────────────────────────────────

const BG_PAGE  = '#0D0E12'
const BG_CARD  = '#13151A'
const BG_CARD2 = '#16181F'
const BORDER   = 'rgba(255,255,255,0.07)'
const BORDER2  = 'rgba(255,255,255,0.05)'

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function fmtDateShort(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso))
}

function displayName(i: LeadInteraction) {
  if (i.name) return i.name
  const a = i.answers ?? {}
  return a['name'] ?? a['nome'] ?? a['full_name'] ?? ''
}

function resolveTitle(nodeId: string, nodes: FormNode[]) {
  return nodes.find(n => n.id === nodeId)?.title ?? `Campo ${nodeId.slice(0, 6)}`
}

const PRODUCT_COLORS = [
  { bg: 'rgba(232,82,26,0.1)',  text: '#F0643A', border: 'rgba(232,82,26,0.25)'   },
  { bg: 'rgba(96,165,250,0.1)', text: '#93C5FD', border: 'rgba(96,165,250,0.25)'  },
  { bg: 'rgba(167,139,250,0.1)',text: '#C4B5FD', border: 'rgba(167,139,250,0.25)' },
  { bg: 'rgba(52,211,153,0.1)', text: '#6EE7B7', border: 'rgba(52,211,153,0.25)'  },
  { bg: 'rgba(251,191,36,0.1)', text: '#FCD34D', border: 'rgba(251,191,36,0.25)'  },
  { bg: 'rgba(244,114,182,0.1)',text: '#F9A8D4', border: 'rgba(244,114,182,0.25)' },
]

function productColor(name: string | null | undefined) {
  if (!name) return PRODUCT_COLORS[0]
  return PRODUCT_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % PRODUCT_COLORS.length]
}

function initials(name: string | null | undefined, fallback: string) {
  const n = name?.trim() || fallback
  return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

// ── Interaction card ──────────────────────────────────────────

function InteractionCard({
  interaction,
  isPrimary,
  purchase,
}: {
  interaction:  LeadInteraction
  isPrimary:    boolean
  purchase?:    LeadPurchase
}) {
  const [expanded, setExpanded] = useState(false)
  const color = productColor(interaction.product_name)
  const name  = displayName(interaction)
  const entries = Object.entries(interaction.answers ?? {}).filter(([, v]) => !!v)
  const hasUtm = interaction.utm_source || interaction.utm_campaign || interaction.utm_medium

  return (
    <div
      className={cn('rounded-xl overflow-hidden transition-all', isPrimary && 'ring-1 ring-[#E8521A]/20')}
      style={{ background: BG_CARD, border: `1px solid ${isPrimary ? 'rgba(232,82,26,0.2)' : BORDER}` }}
    >
      {/* Card header */}
      <div className="px-5 py-4 flex items-start gap-4">
        {/* Timeline dot */}
        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
          <div className="w-3 h-3 rounded-full ring-2 ring-offset-2"
            style={{
              background: purchase ? '#34D399' : interaction.qualified ? '#E8521A' : '#6B7280',
              ringOffsetColor: BG_CARD,
            }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Product badge */}
              {interaction.product_name ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                  style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
                  {interaction.product_name}
                </span>
              ) : (
                <span className="text-[12px] text-white/25 italic">Produto removido</span>
              )}

              {/* Qualified badge */}
              {purchase ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                  style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }}>
                  <ShoppingBag className="w-2.5 h-2.5" /> Compra confirmada
                </span>
              ) : interaction.qualified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                  style={{ background: 'rgba(232,82,26,0.08)', color: '#F0643A', border: '1px solid rgba(232,82,26,0.2)' }}>
                  <CheckCircle2 className="w-2.5 h-2.5" /> Qualificado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
                  style={{ background: 'rgba(239,68,68,0.06)', color: '#F87171', border: '1px solid rgba(239,68,68,0.12)' }}>
                  <XCircle className="w-2.5 h-2.5" /> Desqualificado
                </span>
              )}

              {isPrimary && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{ background: 'rgba(232,82,26,0.08)', color: 'rgba(232,82,26,0.6)' }}>
                  Esta entrada
                </span>
              )}
            </div>

            <p className="text-[11px] text-white/30 whitespace-nowrap">{fmtDate(interaction.created_at)}</p>
          </div>

          {/* Purchase stripe session */}
          {purchase?.stripe_session_id && (
            <p className="text-[10px] font-mono text-white/20 mt-1.5 truncate">
              Session: {purchase.stripe_session_id}
            </p>
          )}

          {/* UTM quick info */}
          {hasUtm && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {interaction.utm_source && (
                <span className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}>
                  {interaction.utm_source}
                  {interaction.utm_medium && ` / ${interaction.utm_medium}`}
                </span>
              )}
              {interaction.utm_campaign && (
                <span className="text-[10px] text-white/20">{interaction.utm_campaign}</span>
              )}
            </div>
          )}
        </div>

        {/* Toggle answers */}
        {entries.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="shrink-0 flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors mt-0.5"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Ocultar' : `${entries.length} resposta${entries.length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {/* Answers accordion */}
      {expanded && entries.length > 0 && (
        <div className="px-5 pb-4 flex flex-col gap-2 border-t" style={{ borderColor: BORDER2 }}>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {entries.map(([nodeId, answer]) => (
              <div key={nodeId} className="rounded-lg px-3 py-2.5"
                style={{ background: BG_CARD2, border: `1px solid ${BORDER2}` }}>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/25 mb-0.5">
                  {resolveTitle(nodeId, interaction.product_nodes)}
                </p>
                <p className="text-[12px] text-[#EDEDED] break-words">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Info row ──────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value: string | null | undefined
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-3.5 h-3.5 text-white/25 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] text-white/25 uppercase tracking-wider">{label}</p>
        <p className="text-[13px] text-[#EDEDED] mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function LeadProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: profile, isLoading, error, refetch } = useLeadProfile(id)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG_PAGE }}>
        <RefreshCw className="w-5 h-5 text-white/20 animate-spin" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: BG_PAGE }}>
        <p className="text-[14px] text-white/30">Lead não encontrado.</p>
        <button onClick={() => navigate('/admin/leads')}
          className="text-[12px] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Leads
        </button>
      </div>
    )
  }

  const { primary, interactions, purchases } = profile
  const name     = displayName(primary)
  const initials_ = initials(name, primary.email ?? primary.phone ?? '?')

  const hasUtm = primary.utm_source || primary.utm_campaign || primary.utm_medium
    || primary.utm_term || primary.utm_content || primary.referrer

  // Build a set of product_ids that have confirmed purchases
  const purchasedProductIds = new Set(purchases.map(p => p.product_id))

  return (
    <div className="min-h-screen" style={{ background: BG_PAGE }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/leads')}
            className="flex items-center gap-2 text-[13px] text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Leads
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/50 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Atualizar
          </button>
        </div>

        {/* ── Hero card ── */}
        <div className="rounded-2xl px-6 py-5 flex items-center gap-5"
          style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[20px] font-bold shrink-0"
            style={{ background: 'rgba(232,82,26,0.12)', color: '#E8521A' }}>
            {initials_}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-bold text-[#EDEDED] tracking-tight truncate">
              {name || <span className="text-white/25 font-normal">Sem nome</span>}
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {primary.email && (
                <span className="flex items-center gap-1 text-[12px] text-white/45">
                  <Mail className="w-3 h-3" /> {primary.email}
                </span>
              )}
              {primary.phone && (
                <span className="flex items-center gap-1 text-[12px] text-white/45">
                  <Phone className="w-3 h-3" /> {primary.phone}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {primary.qualified
              ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                  style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }}>
                  <CheckCircle2 className="w-3 h-3" /> Qualificado
                </span>
              : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                  style={{ background: 'rgba(239,68,68,0.06)', color: '#F87171', border: '1px solid rgba(239,68,68,0.12)' }}>
                  <XCircle className="w-3 h-3" /> Desqualificado
                </span>
            }
            {purchases.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)' }}>
                <ShoppingBag className="w-3 h-3" />
                {purchases.length} compra{purchases.length !== 1 ? 's' : ''}
              </span>
            )}
            <span className="text-[11px] text-white/25">
              {fmtDateShort(primary.created_at)}
            </span>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Left column */}
          <div className="flex flex-col gap-4">

            {/* Contact card */}
            <div className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Contato</p>
              <InfoRow icon={User}     label="Nome"     value={primary.name} />
              <InfoRow icon={Mail}     label="E-mail"   value={primary.email} />
              <InfoRow icon={Phone}    label="Telefone" value={primary.phone} />
              <InfoRow icon={FileText} label="CPF"      value={primary.answers?.cpf ?? null} />
              <InfoRow icon={MapPin}   label="Cidade"   value={
                primary.answers?.city
                  ? `${primary.answers.city}${primary.answers.state ? ` — ${primary.answers.state}` : ''}`
                  : null
              } />
              <InfoRow icon={Calendar} label="1ª interação" value={fmtDate(
                [...interactions].sort((a, b) =>
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )[0]?.created_at ?? primary.created_at
              )} />
            </div>

            {/* UTM card */}
            {hasUtm && (
              <div className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Origem</p>
                <InfoRow icon={ExternalLink} label="Fonte (utm_source)"     value={primary.utm_source} />
                <InfoRow icon={ExternalLink} label="Meio (utm_medium)"      value={primary.utm_medium} />
                <InfoRow icon={ExternalLink} label="Campanha (utm_campaign)"value={primary.utm_campaign} />
                <InfoRow icon={ExternalLink} label="Termo (utm_term)"       value={primary.utm_term} />
                <InfoRow icon={ExternalLink} label="Conteúdo (utm_content)" value={primary.utm_content} />
                <InfoRow icon={Link2}        label="Referrer"               value={primary.referrer} />
              </div>
            )}

            {/* Purchases card */}
            {purchases.length > 0 && (
              <div className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
                  Compras confirmadas ({purchases.length})
                </p>
                {purchases.map(p => {
                  const c = productColor(p.product_name)
                  return (
                    <div key={p.product_id} className="flex items-start gap-3 rounded-lg p-3"
                      style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.12)' }}>
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
                          style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                          {p.product_name}
                        </span>
                        <p className="text-[11px] text-white/35 mt-1">{fmtDateShort(p.purchased_at)}</p>
                        {p.stripe_session_id && (
                          <p className="text-[9px] font-mono text-white/15 mt-0.5 truncate">{p.stripe_session_id}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Stats */}
            <div className="rounded-xl p-4 grid grid-cols-3 gap-3"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
              <div className="text-center">
                <p className="text-[22px] font-bold text-[#E8521A]">{interactions.length}</p>
                <p className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5">Interações</p>
              </div>
              <div className="text-center">
                <p className="text-[22px] font-bold text-emerald-400">{purchases.length}</p>
                <p className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5">Compras</p>
              </div>
              <div className="text-center">
                <p className="text-[22px] font-bold text-[#C4B5FD]">
                  {new Set(interactions.map(i => i.product_id).filter(Boolean)).size}
                </p>
                <p className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5">Produtos</p>
              </div>
            </div>
          </div>

          {/* Right column — Timeline */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25">
                Histórico de interações ({interactions.length})
              </p>
              <p className="text-[10px] text-white/20">
                Cruzado por {[primary.email && 'e-mail', primary.phone && 'telefone'].filter(Boolean).join(' e ')}
              </p>
            </div>

            {interactions.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
                <p className="text-[13px] text-white/25">Nenhuma interação encontrada.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {interactions.map(interaction => (
                  <InteractionCard
                    key={interaction.id}
                    interaction={interaction}
                    isPrimary={interaction.id === primary.id}
                    purchase={purchasedProductIds.has(interaction.product_id ?? '')
                      ? purchases.find(p => p.product_id === interaction.product_id)
                      : undefined
                    }
                  />
                ))}
              </div>
            )}

            {/* Purchases without matching interaction */}
            {purchases.filter(p => !interactions.some(i => i.product_id === p.product_id)).map(p => {
              const c = productColor(p.product_name)
              return (
                <div key={p.product_id} className="rounded-xl px-5 py-4 flex items-center gap-4"
                  style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.12)' }}>
                  <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
                        style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                        {p.product_name}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-400">Compra confirmada</span>
                    </div>
                    <p className="text-[11px] text-white/30 mt-1">
                      {fmtDateShort(p.purchased_at)} · sem formulário de captação associado
                    </p>
                  </div>
                  <p className="text-[11px] text-white/25 shrink-0">{fmtDateShort(p.purchased_at)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

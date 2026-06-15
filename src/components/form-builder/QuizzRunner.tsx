import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, ChevronLeft, CornerDownLeft, Sparkles, Lock,
  ShieldCheck, Loader2, AlertTriangle, CheckCircle, XCircle, Check,
  InstagramIcon, LinkedinIcon, Globe, MessageCircle, Send, Music2, PlayCircle,
  Copy, Landmark, Upload,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { FormNode, OptionPrice, NodeType, SocialLink, BankInfo } from './FormBuilder'

// ── Social platform display config ───────────────────────────

const SOCIAL_META: Record<string, { label: string; Icon: React.ElementType }> = {
  instagram: { label: 'Instagram',  Icon: InstagramIcon },
  whatsapp:  { label: 'WhatsApp',   Icon: MessageCircle },
  linkedin:  { label: 'LinkedIn',   Icon: LinkedinIcon  },
  youtube:   { label: 'YouTube',    Icon: PlayCircle    },
  tiktok:    { label: 'TikTok',     Icon: Music2        },
  telegram:  { label: 'Telegram',   Icon: Send          },
  website:   { label: 'Website',    Icon: Globe         },
}

// ── Tracking config (exported — usado em Apply.tsx e ProductConfigPage) ──

export interface TrackingConfig {
  metaPixelId?:             string  // Facebook/Meta Pixel ID
  gaMeasurementId?:         string  // GA4 Measurement ID (G-XXXXXXXX)
  gtmContainerId?:          string  // Google Tag Manager (GTM-XXXXXXX)
  googleAdsConversionId?:   string  // Google Ads (AW-XXXXXXXXX)
  googleAdsConversionLabel?: string
  leadEventName?:           string  // nome do evento no form completion (default "Lead")
  purchaseEventName?:       string  // nome do evento na compra (default "Purchase")
}

// ── Props ─────────────────────────────────────────────────────

export interface QuizzRunnerProps {
  nodes:           FormNode[]
  productId?:      string        // UUID do produto — para salvar lead + checkout
  enableCheckout?: boolean       // mostra checkout no final (padrão: !!productId)
  productName?:    string
  defaultPriceId?: string
  tracking?:       TrackingConfig
  onComplete?:     (answers: Record<string, string>) => void
}

// ── Helpers ───────────────────────────────────────────────────

const LETTER = (i: number) => String.fromCharCode(65 + i)

function formatAmount(amount: number, currency: string): string {
  const curr = currency.toLowerCase()
  if (curr === 'jpy' || curr === 'krw') {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: curr.toUpperCase() })
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

// ── Tracking injection helpers ────────────────────────────────

function injectInlineScript(code: string, id: string) {
  if (document.getElementById(id)) return
  const s = document.createElement('script')
  s.id = id; s.innerHTML = code
  document.head.appendChild(s)
}

function injectScript(src: string, id: string) {
  if (document.getElementById(id)) return
  const s = document.createElement('script')
  s.id = id; s.src = src; s.async = true
  document.head.appendChild(s)
}

function injectMetaPixel(pixelId: string) {
  // Standard Meta Pixel base code — kept verbatim so Meta Pixel Helper detects it
  injectInlineScript(
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');fbq('track','PageView');`,
    `meta-pixel-${pixelId}`,
  )
  // Fallback: if the IIFE failed to insert fbevents.js into the DOM, load it explicitly
  if (!document.querySelector('script[src*="connect.facebook.net"]')) {
    injectScript('https://connect.facebook.net/en_US/fbevents.js', 'meta-pixel-sdk')
  }
}

function injectGA4(measurementId: string) {
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${measurementId}`, `ga4-${measurementId}`)
  injectInlineScript(
    `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${measurementId}');`,
    `ga4-config-${measurementId}`,
  )
}

function injectGTM(containerId: string) {
  injectInlineScript(
    `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${containerId}');`,
    `gtm-${containerId}`,
  )
}

const META_STANDARD_EVENTS = new Set([
  'PageView','AddPaymentInfo','AddToCart','AddToWishlist','CompleteRegistration',
  'Contact','CustomizeProduct','Donate','FindLocation','InitiateCheckout',
  'Lead','Purchase','Schedule','Search','StartTrial','SubmitApplication',
  'Subscribe','ViewContent',
])

function fireMetaEvent(eventName: string) {
  try {
    const fbq = (window as Window & { fbq?: (...a: unknown[]) => void }).fbq
    if (!fbq) return
    // Non-standard names must use trackCustom to avoid Meta warnings
    const method = META_STANDARD_EVENTS.has(eventName) ? 'track' : 'trackCustom'
    fbq(method, eventName)
  } catch { /* silent */ }
}

function fireGtagEvent(eventName: string, conversionId?: string, conversionLabel?: string) {
  const g = (window as Window & { gtag?: (...a: unknown[]) => void }).gtag
  if (!g) return
  if (conversionId && conversionLabel) {
    g('event', 'conversion', { send_to: `${conversionId}/${conversionLabel}` })
  }
  g('event', eventName)
}

// ── Sub-components ────────────────────────────────────────────

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
    <span className="inline-flex items-center justify-center rounded text-[10px] font-bold shrink-0"
      style={{
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.4)',
        minWidth: label.length > 1 ? 'auto' : '20px', height: '20px',
        padding: label.length > 1 ? '0 5px' : undefined,
      }}>
      {label}
    </span>
  )
}

function OptionBtn({ letter, label, selected, priceTag, onClick }: {
  letter: string; label: string; selected: boolean; priceTag?: string; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 w-full p-4 rounded-xl text-left transition-all duration-150"
      style={{
        background: selected ? 'rgba(232,82,26,0.1)' : '#1E202A',
        border:     selected ? '1px solid rgba(232,82,26,0.5)' : '1px solid rgba(255,255,255,0.05)',
        boxShadow:  selected ? '0 0 0 1px rgba(232,82,26,0.15),0 4px 16px rgba(232,82,26,0.08)' : 'none',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,82,26,0.3)' }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.05)' }}
    >
      <KbdChip label={letter} />
      <span className="flex-1 text-[15px] leading-snug transition-colors"
        style={{ color: selected ? '#F1F5F9' : '#A1A1AA' }}>
        {label}
      </span>
      {priceTag && (
        <span className="text-[11px] font-semibold shrink-0"
          style={{ color: selected ? '#E8521A' : 'rgba(255,255,255,0.25)' }}>
          {priceTag}
        </span>
      )}
    </button>
  )
}

// Mascaras para CPF e telefone
function maskCPF(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3)  return d
  if (d.length <= 6)  return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9)  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0)  return ''
  if (d.length <= 2)   return `(${d}`
  if (d.length <= 6)   return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10)  return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function AnswerInput({ node, value, onChange, onEnter }: {
  node: FormNode; value: string; onChange: (v: string) => void; onEnter: () => void
}) {
  const borderColor = value ? '#E8521A' : 'rgba(255,255,255,0.12)'
  const sharedCls = `
    w-full bg-transparent outline-none border-0 border-b-2
    text-[22px] text-[#F1F5F9] placeholder:text-white/20
    py-3 transition-colors leading-snug
  `

  if (node.type === 'textarea') {
    return (
      <textarea autoFocus value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter() } }}
        placeholder="Escreva aqui…" rows={4}
        className={sharedCls + ' resize-none'}
        style={{ borderBottomColor: borderColor }} />
    )
  }

  if (node.type === 'phone') {
    return (
      <input autoFocus type="tel" value={value}
        onChange={e => onChange(maskPhone(e.target.value))}
        onKeyDown={e => { if (e.key === 'Enter') onEnter() }}
        placeholder="(11) 99999-9999"
        className={sharedCls} style={{ borderBottomColor: borderColor }} />
    )
  }

  if (node.type === 'cpf') {
    return (
      <input autoFocus type="text" value={value}
        onChange={e => onChange(maskCPF(e.target.value))}
        onKeyDown={e => { if (e.key === 'Enter') onEnter() }}
        placeholder="000.000.000-00"
        className={sharedCls} style={{ borderBottomColor: borderColor }} />
    )
  }

  if (node.type === 'date') {
    return (
      <input autoFocus type="date" value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onEnter() }}
        className={sharedCls + ' [color-scheme:dark]'}
        style={{ borderBottomColor: borderColor }} />
    )
  }

  if (node.type === 'number') {
    return (
      <input autoFocus type="number" value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onEnter() }}
        placeholder="0"
        className={sharedCls + ' [appearance:textfield]'}
        style={{ borderBottomColor: borderColor }} />
    )
  }

  return (
    <input autoFocus
      type={node.type === 'email' ? 'email' : 'text'}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') onEnter() }}
      placeholder={
        node.type === 'name'  ? 'Seu nome completo' :
        node.type === 'email' ? 'seu@email.com' :
        node.type === 'city'  ? 'Ex: São Paulo' :
        node.type === 'state' ? 'Ex: SP' :
        'Escreva aqui…'
      }
      className={sharedCls} style={{ borderBottomColor: borderColor }} />
  )
}

// ── WelcomeScreen ─────────────────────────────────────────────

function WelcomeScreen({ node, pct, onStart }: {
  node: FormNode; pct: number; onStart: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: '#0D0E12' }}>
      <ProgressBar pct={pct} />
      <motion.div
        className="w-full max-w-[560px] flex flex-col gap-8 text-center"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <motion.div
          className="flex items-center justify-center mx-auto"
          style={node.logoUrl ? {} : {
            width: 80, height: 80, borderRadius: 16,
            background: 'rgba(232,82,26,0.1)', border: '1px solid rgba(232,82,26,0.2)',
          }}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}
        >
          {node.logoUrl
            ? <img src={node.logoUrl} alt="Logo" className="max-h-24 max-w-[240px] object-contain" />
            : <Sparkles className="w-8 h-8" style={{ color: '#E8521A' }} />}
        </motion.div>

        <div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight text-[#F1F5F9]">
            {node.title || 'Bem-vindo!'}
          </h1>
          {node.description && (
            <p className="text-[17px] mt-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {node.description}
            </p>
          )}
        </div>

        <button
          onClick={onStart}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl
                     text-[15px] font-bold text-white mx-auto transition-all"
          style={{ background: '#E8521A', boxShadow: '0 8px 32px rgba(232,82,26,0.3)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#C43E10' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E8521A' }}
        >
          {node.buttonLabel || 'Começar →'}
        </button>

        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.1)' }}>
          POWERED BY BRIDGE
        </p>
      </motion.div>
    </div>
  )
}

// ── DisqualifiedScreen ────────────────────────────────────────

function DisqualifiedScreen() {
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
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 18 }}
        >
          <XCircle className="w-8 h-8 text-red-400" />
        </motion.div>
        <h2 className="text-3xl font-bold text-[#F1F5F9] tracking-tight mb-4">
          Agradecemos seu interesse
        </h2>
        <p className="text-[16px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Com base nas suas respostas, este produto pode não ser o mais adequado para o seu momento atual.
          Nossa equipe poderá entrar em contato com indicações personalizadas.
        </p>
        <div className="mt-10 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' }}>
          Powered by Bridge
        </div>
      </motion.div>
    </div>
  )
}

// ── Custom ThankyouScreen ─────────────────────────────────────

function ThankyouScreen({ title, description, socialLinks }: {
  title: string; description?: string; socialLinks?: SocialLink[]
}) {
  const links = (socialLinks ?? []).filter(s => s.url.trim())
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: '#0D0E12' }}>
      <ProgressBar pct={1} />
      <motion.div
        className="text-center max-w-md w-full"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <motion.div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 18 }}
        >
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </motion.div>
        <h2 className="text-4xl font-bold text-[#F1F5F9] tracking-tight mb-4">
          {title || 'Tudo certo!'}
        </h2>
        {description && (
          <p className="text-[16px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {description}
          </p>
        )}

        {/* Social links */}
        {links.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {links.map(({ platform, url }) => {
              const meta = SOCIAL_META[platform]
              if (!meta) return null
              const Icon = meta.Icon
              return (
                <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.08)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)' }}>
                  <Icon className="w-4 h-4" />
                  {meta.label}
                </a>
              )
            })}
          </div>
        )}

        <div className="mt-10 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold"
          style={{ background: 'rgba(232,82,26,0.08)', border: '1px solid rgba(232,82,26,0.15)', color: '#E8521A' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8521A] animate-pulse" />
          Powered by Bridge
        </div>
      </motion.div>
    </div>
  )
}

// ── Generic DoneScreen ────────────────────────────────────────

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

// ── CheckoutSummary ───────────────────────────────────────────

function CheckoutSummary({
  productId, productName, priceId, priceInfo, nodes, answers,
}: {
  productId:   string
  productName: string | undefined
  priceId:     string | null
  priceInfo:   OptionPrice | null
  nodes:       FormNode[]
  answers:     Record<string, string>
}) {
  const [loading,           setLoading]           = useState(false)
  const [errMsg,            setErrMsg]            = useState<string | null>(null)
  const [resolvedPriceInfo, setResolvedPriceInfo] = useState<OptionPrice | null>(priceInfo)

  const name  = findAnswerByType('name',  nodes, answers)
  const email = findAnswerByType('email', nodes, answers)

  const canCheckout = !!priceId && !!productId

  useEffect(() => {
    if (!priceId || resolvedPriceInfo) return
    supabase.functions.invoke('list-stripe-prices')
      .then(({ data }) => {
        const found = (data?.prices ?? []).find(
          (p: { priceId: string; amount: number; currency: string; nickname: string | null; productName: string }) =>
            p.priceId === priceId,
        )
        if (found) {
          setResolvedPriceInfo({
            priceId:  found.priceId,
            label:    found.nickname ?? found.productName,
            amount:   found.amount,
            currency: found.currency,
          })
        }
      })
      .catch(() => {})
  }, [priceId, resolvedPriceInfo])

  async function handleCheckout() {
    if (!canCheckout) return
    setLoading(true); setErrMsg(null)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { productId, priceId, email, name },
      })
      if (error) throw new Error(typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message) : JSON.stringify(error))
      if (data?.url) { window.location.href = data.url as string }
      else throw new Error(data?.error ?? 'URL de checkout não retornada.')
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Erro ao gerar sessão.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: '#0D0E12' }}>
      <ProgressBar pct={1} />
      <motion.div
        className="w-full max-w-[480px] flex flex-col gap-4"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4" style={{ color: '#E8521A' }} />
          <span className="text-[12px] font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            Resumo do Pedido
          </span>
        </div>

        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#1E202A', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-6 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'rgba(255,255,255,0.25)' }}>Produto</p>
            <p className="text-[20px] font-bold text-[#F1F5F9] tracking-tight">{productName ?? 'Produto'}</p>
            {resolvedPriceInfo?.label && (
              <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {resolvedPriceInfo.label}
              </p>
            )}
          </div>

          {(name || email) && (
            <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[12px] font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(255,255,255,0.25)' }}>Para</p>
              {name  && <p className="text-[14px] text-[#E2E8F0]">{name}</p>}
              {email && <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{email}</p>}
            </div>
          )}

          <div className="px-6 py-5 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#E2E8F0]">Total</span>
            {resolvedPriceInfo ? (
              <span className="text-[26px] font-bold tracking-tight text-[#F1F5F9]">
                {formatAmount(resolvedPriceInfo.amount, resolvedPriceInfo.currency)}
              </span>
            ) : (
              <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {priceId ? 'Carregando…' : 'Calculado no checkout'}
              </span>
            )}
          </div>
        </div>

        {!canCheckout && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-300/70 leading-relaxed">
              Preço não configurado. Configure um preço Stripe na aba{' '}
              <strong className="text-amber-300">Precificação</strong>.
            </p>
          </div>
        )}

        <button onClick={handleCheckout} disabled={loading || !canCheckout}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl text-[15px] font-bold text-white transition-all"
          style={{
            background: canCheckout ? '#E8521A' : 'rgba(255,255,255,0.05)',
            boxShadow:  canCheckout && !loading ? '0 8px 32px rgba(232,82,26,0.3)' : 'none',
            cursor:     canCheckout && !loading ? 'pointer' : 'not-allowed',
          }}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando ambiente seguro…</>
                   : <><Lock className="w-4 h-4" />Ir para Pagamento Seguro</>}
        </button>

        {errMsg && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[12px] text-red-400">{errMsg}</p>
          </div>
        )}

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

// ── BankDepositScreen ─────────────────────────────────────────

function InfoRow({ label, value, onCopy, copied }: {
  label: string; value?: string; onCopy: () => void; copied: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="min-w-0 pr-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5"
          style={{ color: 'rgba(255,255,255,0.25)' }}>{label}</p>
        <p className="text-[15px] font-medium text-[#F1F5F9] break-all">{value}</p>
      </div>
      <button
        onClick={onCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0"
        style={{
          background: copied ? 'rgba(52,211,153,0.1)'    : 'rgba(255,255,255,0.06)',
          color:      copied ? '#34D399'                  : 'rgba(255,255,255,0.4)',
          border:     copied ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(255,255,255,0.08)',
        }}>
        {copied
          ? <><Check className="w-3 h-3" /> Copiado</>
          : <><Copy className="w-3 h-3" /> Copiar</>}
      </button>
    </div>
  )
}

function BankDepositScreen({ node, pct, onAdvance }: {
  node: FormNode; pct: number; onAdvance: () => void
}) {
  const [copied, setCopied] = useState<string | null>(null)
  const bi: BankInfo = node.bankInfo ?? {}

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    }).catch(() => {})
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: '#0D0E12' }}>
      <ProgressBar pct={pct} />
      <motion.div
        className="w-full max-w-[520px] flex flex-col gap-6"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <Landmark className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-[22px] font-bold tracking-tight text-[#F1F5F9]">
              {node.title || 'Realize o pagamento'}
            </h2>
            {node.description && (
              <p className="text-[13px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {node.description}
              </p>
            )}
          </div>
        </div>

        {bi.amount && (
          <div className="px-5 py-4 rounded-xl"
            style={{ background: 'rgba(232,82,26,0.07)', border: '1px solid rgba(232,82,26,0.2)' }}>
            <p className="text-[12px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'rgba(232,82,26,0.6)' }}>Valor total</p>
            <p className="text-[28px] font-bold text-[#F1F5F9]">{bi.amount}</p>
          </div>
        )}

        <div className="rounded-xl overflow-hidden"
          style={{ background: '#1E202A', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(59,130,246,0.15)', background: 'rgba(59,130,246,0.05)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400">Chave Pix</p>
          </div>
          <div className="px-5">
            <InfoRow label={bi.pixKeyType ?? 'Chave Pix'} value={bi.pixKey}
              onCopy={() => copyText(bi.pixKey!, 'pixKey')} copied={copied === 'pixKey'} />
            <InfoRow label="Beneficiário" value={bi.beneficiaryName}
              onCopy={() => copyText(bi.beneficiaryName!, 'beneficiary')} copied={copied === 'beneficiary'} />
          </div>
        </div>

        {(bi.bankName || bi.agency || bi.account) && (
          <div className="rounded-xl overflow-hidden"
            style={{ background: '#1E202A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>TED / DOC</p>
            </div>
            <div className="px-5">
              <InfoRow label="Banco" value={bi.bankName}
                onCopy={() => copyText(bi.bankName!, 'bank')} copied={copied === 'bank'} />
              <InfoRow label="Agência" value={bi.agency}
                onCopy={() => copyText(bi.agency!, 'agency')} copied={copied === 'agency'} />
              <InfoRow label={`Conta ${bi.accountType ?? ''}`.trim()} value={bi.account}
                onCopy={() => copyText(bi.account!, 'account')} copied={copied === 'account'} />
            </div>
          </div>
        )}

        <button
          onClick={onAdvance}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-[15px] font-bold text-white transition-all"
          style={{ background: '#E8521A', boxShadow: '0 8px 32px rgba(232,82,26,0.3)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#C43E10' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E8521A' }}>
          Já realizei o pagamento <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.1)' }}>
          POWERED BY BRIDGE
        </p>
      </motion.div>
    </div>
  )
}

// ── ReceiptUploadScreen ───────────────────────────────────────

function ReceiptUploadScreen({ node, pct, productId, onAdvance }: {
  node: FormNode; pct: number; productId?: string; onAdvance: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [errMsg,    setErrMsg]    = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setErrMsg('Arquivo muito grande. Máximo 10 MB.'); return }
    setUploading(true)
    setErrMsg(null)
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `receipts/${productId ?? 'unknown'}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('form-assets')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = supabase.storage.from('form-assets').getPublicUrl(path)
      onAdvance(publicUrl)
    } catch {
      setErrMsg('Erro ao enviar o comprovante. Tente novamente.')
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: '#0D0E12' }}>
      <ProgressBar pct={pct} />
      <motion.div
        className="w-full max-w-[480px] flex flex-col gap-6 text-center"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <motion.div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}>
          <Upload className="w-7 h-7 text-violet-400" />
        </motion.div>

        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-[#F1F5F9]">
            {node.title || 'Envie o comprovante'}
          </h2>
          {node.description && (
            <p className="text-[15px] mt-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {node.description}
            </p>
          )}
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-2xl transition-all"
          style={{
            background: uploading ? 'rgba(139,92,246,0.04)' : 'rgba(139,92,246,0.06)',
            border: `2px dashed ${uploading ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.35)'}`,
            cursor: uploading ? 'wait' : 'pointer',
          }}>
          {uploading
            ? <><Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                <span className="text-[14px] font-medium text-violet-300">Enviando…</span></>
            : <><Upload className="w-8 h-8 text-violet-400" />
                <span className="text-[14px] font-medium text-violet-300">Clique para selecionar o arquivo</span>
                <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.2)' }}>JPG, PNG, PDF · máx. 10 MB</span></>}
        </button>

        {errMsg && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-[13px] text-red-400 text-left">{errMsg}</p>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleUpload}
        />

        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.1)' }}>POWERED BY BRIDGE</p>
      </motion.div>
    </div>
  )
}

// ── Animation ─────────────────────────────────────────────────

const variants = {
  enter:  (dir: number) => ({ opacity: 0, y: dir > 0 ? 44 : -44 }),
  center: { opacity: 1, y: 0 },
  exit:   (dir: number) => ({ opacity: 0, y: dir > 0 ? -20 : 20 }),
}
const transition = { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as const }

// ── Main component ────────────────────────────────────────────

export default function QuizzRunner({
  nodes,
  productId,
  enableCheckout,
  productName,
  defaultPriceId,
  tracking,
  onComplete,
}: QuizzRunnerProps) {
  const [history,         setHistory]         = useState<string[]>(nodes[0] ? [nodes[0].id] : [])
  const [answers,         setAnswers]         = useState<Record<string, string>>({})
  const [draft,           setDraft]           = useState('')
  const [done,            setDone]            = useState(false)
  const [disqualified,    setDisqualified]    = useState(false)
  const [thankyouContent, setThankyouContent] = useState<{ title: string; description?: string; socialLinks?: SocialLink[] } | null>(null)
  const [activePriceId,   setActivePriceId]   = useState<string | null>(defaultPriceId ?? null)
  const [activePriceInfo, setActivePriceInfo] = useState<OptionPrice | null>(null)
  const [leadSaved,       setLeadSaved]       = useState(false)
  const [otherActive,     setOtherActive]     = useState(false)
  const [otherDraft,      setOtherDraft]      = useState('')
  const finalAnswersRef = useRef<Record<string, string>>({})
  const dirRef          = useRef(1)

  // enableCheckout defaults to true when productId is set
  const checkoutEnabled = enableCheckout ?? !!productId

  // ── Inject tracking pixels on mount ──────────────────────────

  useEffect(() => {
    if (!tracking) return
    if (tracking.gtmContainerId)    injectGTM(tracking.gtmContainerId)
    if (tracking.gaMeasurementId)   injectGA4(tracking.gaMeasurementId)
    if (tracking.metaPixelId)       injectMetaPixel(tracking.metaPixelId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save lead + fire tracking events when done ────────────────

  useEffect(() => {
    if ((!done && !disqualified) || leadSaved) return
    setLeadSaved(true)

    const ans = finalAnswersRef.current
    const email = findAnswerByType('email', nodes, ans)
    const phone = findAnswerByType('phone', nodes, ans)
    const name  = findAnswerByType('name',  nodes, ans)
    const cpf   = findAnswerByType('cpf',   nodes, ans)
    const city  = findAnswerByType('city',  nodes, ans)
    const state = findAnswerByType('state', nodes, ans)

    // Save to leads table (fire and forget)
    if (productId) {
      supabase.from('leads').insert({
        product_id: productId,
        email:      email || null,
        phone:      phone || null,
        name:       name  || null,
        cpf:        cpf   || null,
        city:       city  || null,
        state:      state || null,
        answers:    ans,
        qualified:  !disqualified,
      }).then(() => {}, () => {})
    }

    // Fire tracking events only when qualified
    if (!disqualified && tracking) {
      const leadEvent = tracking.leadEventName || 'Lead'
      if (tracking.metaPixelId) fireMetaEvent(leadEvent)
      if (tracking.gaMeasurementId) fireGtagEvent(leadEvent)
      if (tracking.googleAdsConversionId && tracking.googleAdsConversionLabel) {
        fireGtagEvent(leadEvent, tracking.googleAdsConversionId, tracking.googleAdsConversionLabel)
      }
    }
  }, [done, disqualified]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ──────────────────────────────────────────────────

  const currentId      = history[history.length - 1]
  const currentNode    = nodes.find(n => n.id === currentId) ?? null
  const currentIdx     = nodes.findIndex(n => n.id === currentId)
  const isChoice       = currentNode?.type === 'radio' || currentNode?.type === 'select'
  const isConfirm      = currentNode?.type === 'confirm'
  const pct            = done || disqualified ? 1 : nodes.length ? (history.length - 1) / nodes.length : 0
  const hasDepositFlow = history.some(id => nodes.find(n => n.id === id)?.type === 'bank-deposit')

  // ── Advance from welcome (no answer) ─────────────────────────

  const handleAdvanceWelcome = useCallback(() => {
    const nextNode = nodes[currentIdx + 1]
    if (!nextNode) {
      const customDone = nodes.find(n => n.type === 'thankyou')
      if (customDone) setThankyouContent({ title: customDone.title, description: customDone.description, socialLinks: customDone.socialLinks })
      setDone(true)
      onComplete?.(answers)
      return
    }
    if (nextNode.type === 'thankyou') {
      setThankyouContent({ title: nextNode.title, description: nextNode.description, socialLinks: nextNode.socialLinks })
      setDone(true)
      onComplete?.(answers)
      return
    }
    dirRef.current = 1
    setHistory(h => [...h, nextNode.id])
    setDraft('')
  }, [nodes, currentIdx, answers, onComplete])

  // ── Advance (main engine) ─────────────────────────────────────

  const advance = useCallback((answer: string) => {
    if (!currentNode) return

    const newAnswers = { ...answers, [currentNode.id]: answer }
    setAnswers(newAnswers)
    finalAnswersRef.current = newAnswers

    // Update active price if this option carries one
    const optPrice = currentNode.optionPrices?.[answer]
    if (optPrice) { setActivePriceId(optPrice.priceId); setActivePriceInfo(optPrice) }

    // Resolve next via logic jumps first
    const jump = currentNode.logicJumps.find(j => j.ifOption === answer)

    if (jump) {
      if (jump.jumpToNodeId === '__disqualify__') {
        finalAnswersRef.current = newAnswers
        setDisqualified(true)
        return
      }
      if (jump.jumpToNodeId === '__end__') {
        const customDone = nodes.find(n => n.type === 'thankyou')
        if (customDone) setThankyouContent({ title: customDone.title, description: customDone.description, socialLinks: customDone.socialLinks })
        setDone(true)
        onComplete?.(newAnswers)
        return
      }
      const targetNode = nodes.find(n => n.id === jump.jumpToNodeId)
      if (targetNode?.type === 'thankyou') {
        setThankyouContent({ title: targetNode.title, description: targetNode.description, socialLinks: targetNode.socialLinks })
        setDone(true)
        onComplete?.(newAnswers)
        return
      }
      dirRef.current = 1
      setHistory(h => [...h, jump.jumpToNodeId])
      setDraft('')
      return
    }

    // Linear: next node
    const nextNode = nodes[currentIdx + 1]
    if (!nextNode) {
      setDone(true)
      onComplete?.(newAnswers)
      return
    }
    if (nextNode.type === 'thankyou') {
      setThankyouContent({ title: nextNode.title, description: nextNode.description, socialLinks: nextNode.socialLinks })
      setDone(true)
      onComplete?.(newAnswers)
      return
    }

    dirRef.current = 1
    setHistory(h => [...h, nextNode.id])
    setDraft('')
  }, [currentNode, currentIdx, answers, nodes, onComplete])

  const handleNext = useCallback(() => {
    if (!draft && currentNode?.required !== false) return
    advance(draft)
  }, [draft, advance, currentNode])

  const handleSkip = useCallback(() => {
    advance('')
  }, [advance])

  const handleBack = useCallback(() => {
    if (history.length <= 1) return
    dirRef.current = -1
    const prevId = history[history.length - 2]
    setHistory(h => h.slice(0, -1))
    setDraft(answers[prevId] ?? '')
  }, [history, answers])

  // Reset "Outra" state when question changes
  useEffect(() => {
    setOtherActive(false)
    setOtherDraft('')
  }, [currentId])

  // ── Keyboard shortcuts ────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't intercept while user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (done || disqualified || !currentNode) return
      if (currentNode.type === 'welcome') return
      if (currentNode.type === 'bank-deposit' || currentNode.type === 'receipt-upload') return

      if (isChoice && !otherActive) {
        const idx = e.key.toUpperCase().charCodeAt(0) - 65
        if (idx >= 0 && idx < currentNode.options.length) {
          const opt = currentNode.options[idx]
          setDraft(opt)
          setTimeout(() => advance(opt), 280)
          return
        }
      }
      if (e.key === 'Enter' && draft) { e.preventDefault(); handleNext() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, disqualified, currentNode, isChoice, draft, advance, handleNext, otherActive, currentId])

  // ── Edge cases ────────────────────────────────────────────────

  if (!nodes.length) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0E12' }}>
        <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Nenhuma pergunta configurada.
        </p>
      </div>
    )
  }

  if (disqualified) return <DisqualifiedScreen />

  if (done) {
    if (thankyouContent) return <ThankyouScreen title={thankyouContent.title} description={thankyouContent.description} socialLinks={thankyouContent.socialLinks} />
    if (checkoutEnabled && productId && !hasDepositFlow) {
      return (
        <CheckoutSummary
          productId={productId}
          productName={productName}
          priceId={activePriceId}
          priceInfo={activePriceInfo}
          nodes={nodes}
          answers={answers}
        />
      )
    }
    return <DoneScreen />
  }

  if (!currentNode) return null

  // ── Welcome screen ────────────────────────────────────────────

  if (currentNode.type === 'welcome') {
    return <WelcomeScreen node={currentNode} pct={pct} onStart={handleAdvanceWelcome} />
  }

  // ── Bank deposit screen ───────────────────────────────────────

  if (currentNode.type === 'bank-deposit') {
    return (
      <BankDepositScreen
        node={currentNode}
        pct={pct}
        onAdvance={() => advance('')}
      />
    )
  }

  // ── Receipt upload screen ─────────────────────────────────────

  if (currentNode.type === 'receipt-upload') {
    return (
      <ReceiptUploadScreen
        node={currentNode}
        pct={pct}
        productId={productId}
        onAdvance={(url) => advance(url)}
      />
    )
  }

  // ── Regular question screen ───────────────────────────────────

  // required = undefined or true → must answer; false → can skip
  const isRequired = currentNode.required !== false
  const canSubmit  = isRequired ? !!draft : true

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
                {isRequired && (
                  <span className="text-[13px] font-bold leading-none" style={{ color: '#F87171' }}
                    title="Pergunta obrigatória">*</span>
                )}
                <ArrowRight className="w-3.5 h-3.5" style={{ color: '#E8521A' }} />
                <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  de {nodes.filter(n => !['welcome','thankyou','bank-deposit','receipt-upload'].includes(n.type)).length}
                </span>
                {!isRequired && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }}>
                    opcional
                  </span>
                )}
              </div>

              {/* Question title */}
              <h1 className="text-4xl font-bold tracking-tight leading-tight" style={{ color: '#F1F5F9' }}>
                {currentNode.title || (
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>Pergunta sem título</span>
                )}
              </h1>

              {/* Answer area */}
              {isConfirm ? (
                <button
                  onClick={() => setDraft(draft === 'true' ? '' : 'true')}
                  className="flex items-center gap-4 p-5 rounded-2xl w-full text-left transition-all"
                  style={{
                    background: draft === 'true' ? 'rgba(232,82,26,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${draft === 'true' ? 'rgba(232,82,26,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  }}>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all"
                    style={{
                      background: draft === 'true' ? '#E8521A' : 'transparent',
                      border: `2px solid ${draft === 'true' ? '#E8521A' : 'rgba(255,255,255,0.3)'}`,
                    }}>
                    {draft === 'true' && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-[16px] leading-snug transition-colors"
                    style={{ color: draft === 'true' ? '#F1F5F9' : 'rgba(255,255,255,0.55)' }}>
                    {currentNode.description || currentNode.title || 'Confirmar'}
                  </span>
                </button>
              ) : isChoice ? (
                <div className="flex flex-col gap-3">
                  {currentNode.options.map((opt, i) => {
                    const opPrice = currentNode.optionPrices?.[opt]
                    return (
                      <OptionBtn
                        key={opt}
                        letter={LETTER(i)}
                        label={opt}
                        selected={!otherActive && draft === opt}
                        priceTag={opPrice ? formatAmount(opPrice.amount, opPrice.currency) : undefined}
                        onClick={() => {
                          setOtherActive(false)
                          setOtherDraft('')
                          setDraft(opt)
                          setTimeout(() => advance(opt), 280)
                        }}
                      />
                    )
                  })}

                  {/* "Outra" option */}
                  {currentNode.allowOther && (
                    <OptionBtn
                      letter={LETTER(currentNode.options.length)}
                      label="Outra"
                      selected={otherActive}
                      onClick={() => { setOtherActive(true); setDraft('') }}
                    />
                  )}

                  {/* Text input when "Outra" is selected */}
                  {otherActive && (
                    <div className="mt-1">
                      <input
                        autoFocus
                        value={otherDraft}
                        onChange={e => setOtherDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && otherDraft.trim()) advance(otherDraft.trim())
                        }}
                        placeholder="Escreva sua resposta…"
                        className="w-full bg-transparent outline-none border-0 border-b-2 text-[18px] text-[#F1F5F9] placeholder:text-white/20 py-2 transition-colors"
                        style={{ borderBottomColor: otherDraft ? '#E8521A' : 'rgba(255,255,255,0.12)' }}
                      />
                    </div>
                  )}

                  {currentNode.options.length === 0 && !currentNode.allowOther && (
                    <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      Nenhuma opção configurada.
                    </p>
                  )}
                </div>
              ) : (
                <AnswerInput node={currentNode} value={draft} onChange={setDraft} onEnter={handleNext} />
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-1 flex-wrap">
                {history.length > 1 && (
                  <button onClick={handleBack}
                    className="flex items-center gap-1.5 text-[13px] transition-colors"
                    style={{ color: 'rgba(255,255,255,0.25)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)' }}>
                    <ChevronLeft className="w-3.5 h-3.5" /> Voltar
                  </button>
                )}

                {/* Submit button for text inputs OR "Outra" field */}
                {(!isChoice || otherActive) && (
                  <button
                    onClick={() => otherActive ? (otherDraft.trim() && advance(otherDraft.trim())) : handleNext()}
                    disabled={otherActive ? !otherDraft.trim() : !canSubmit}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-all"
                    style={{
                      background: (otherActive ? !otherDraft.trim() : !canSubmit)
                        ? 'rgba(255,255,255,0.05)' : '#E8521A',
                      color: (otherActive ? !otherDraft.trim() : !canSubmit)
                        ? 'rgba(255,255,255,0.2)' : '#fff',
                      boxShadow: (otherActive ? !otherDraft.trim() : !canSubmit)
                        ? 'none' : '0 4px 20px rgba(232,82,26,0.25)',
                      cursor: (otherActive ? !otherDraft.trim() : !canSubmit)
                        ? 'not-allowed' : 'pointer',
                    }}>
                    Continuar <CornerDownLeft className="w-3.5 h-3.5" />
                  </button>
                )}

                {(!isChoice && draft) && (
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    ou pressione&nbsp;<KbdChip label="Enter" />
                  </span>
                )}

                {otherActive && otherDraft.trim() && (
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    ou pressione&nbsp;<KbdChip label="Enter" />
                  </span>
                )}

                {/* Pular — only for optional text questions without draft */}
                {!isRequired && !isChoice && !draft && (
                  <button onClick={handleSkip}
                    className="text-[13px] transition-colors"
                    style={{ color: 'rgba(255,255,255,0.2)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.2)' }}>
                    Pular →
                  </button>
                )}
              </div>

              {/* Skip for choice types (not when "Outra" input is open) */}
              {!isRequired && isChoice && !otherActive && (
                <button onClick={handleSkip}
                  className="text-[12px] mt-1 transition-colors text-left"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.2)' }}>
                  Pular esta pergunta →
                </button>
              )}

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

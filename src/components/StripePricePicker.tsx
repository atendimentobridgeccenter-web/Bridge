import { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown, X, RefreshCw, Zap, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'

// ── Types ────────────────────────────────────────────────────

export interface StripePrice {
  priceId:     string
  productName: string
  productId:   string
  nickname:    string | null
  amount:      number
  currency:    string
  type:        'one_time' | 'recurring'
  interval:    string | null
  livemode:    boolean
}

interface Props {
  value:     string
  onChange:  (priceId: string, price: StripePrice) => void
  label?:    string
  placeholder?: string
}

// ── Helpers ──────────────────────────────────────────────────

function fmtAmount(amount: number, currency: string): string {
  const cur = currency.toUpperCase()
  if (cur === 'JPY' || cur === 'KRW') return `¥${amount.toLocaleString()}`
  if (cur === 'BRL') return `R$${(amount / 100).toFixed(2).replace('.', ',')}`
  if (cur === 'USD') return `$${(amount / 100).toFixed(2)}`
  return `${(amount / 100).toFixed(2)} ${cur}`
}

function intervalLabel(interval: string | null): string {
  const map: Record<string, string> = {
    month: '/mês', year: '/ano', week: '/sem.', day: '/dia',
  }
  return interval ? (map[interval] ?? `/${interval}`) : ''
}

// ── Component ────────────────────────────────────────────────

export default function StripePricePicker({ value, onChange, placeholder = 'Selecionar preço do Stripe' }: Props) {
  const [open,     setOpen]     = useState(false)
  const [prices,   setPrices]   = useState<StripePrice[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [query,    setQuery]    = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = prices.find(p => p.priceId === value)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function fetchPrices() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('list-stripe-prices')
      if (fnErr) throw new Error(fnErr.message)
      setPrices(data.prices ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar com o Stripe.')
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    setOpen(o => !o)
    if (prices.length === 0 && !loading) fetchPrices()
  }

  const filtered = query.trim()
    ? prices.filter(p =>
        p.productName.toLowerCase().includes(query.toLowerCase()) ||
        p.priceId.toLowerCase().includes(query.toLowerCase()) ||
        (p.nickname ?? '').toLowerCase().includes(query.toLowerCase()),
      )
    : prices

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-left transition-all',
          open
            ? 'border border-[#E8521A]/50 bg-[#0D0E12]'
            : 'border border-white/7 bg-[#0D0E12] hover:border-white/15',
        )}
      >
        {selected ? (
          <>
            <span className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
              selected.livemode
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-amber-500/10 text-amber-400',
            )}>
              {selected.livemode ? 'LIVE' : 'TEST'}
            </span>
            <span className="flex-1 text-[#EDEDED] truncate font-medium">
              {selected.nickname ?? selected.productName}
            </span>
            <span className="text-[#E8521A] font-bold font-mono shrink-0">
              {fmtAmount(selected.amount, selected.currency)}{intervalLabel(selected.interval)}
            </span>
          </>
        ) : (
          <>
            <Zap className="w-3.5 h-3.5 text-white/20 shrink-0" />
            <span className="flex-1 text-white/30">{placeholder}</span>
          </>
        )}
        <ChevronDown className={cn('w-3.5 h-3.5 text-white/25 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 w-full mt-1.5 rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: '#16181F',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}
        >
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Search className="w-3.5 h-3.5 text-white/25 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por produto ou price ID..."
              className="flex-1 bg-transparent text-[13px] text-[#EDEDED] placeholder:text-white/25 outline-none"
            />
            {loading && <RefreshCw className="w-3.5 h-3.5 text-white/25 animate-spin shrink-0" />}
            {query && (
              <button onClick={() => setQuery('')}>
                <X className="w-3.5 h-3.5 text-white/25 hover:text-white/60" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto">
            {error ? (
              <div className="px-4 py-5 text-center">
                <p className="text-[12px] text-red-400 mb-3">{error}</p>
                <button
                  onClick={fetchPrices}
                  className="text-[11px] text-white/40 hover:text-white/70 flex items-center gap-1.5 mx-auto"
                >
                  <RefreshCw className="w-3 h-3" /> Tentar novamente
                </button>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center gap-2 py-8">
                <RefreshCw className="w-4 h-4 text-white/30 animate-spin" />
                <span className="text-[12px] text-white/30">Buscando preços no Stripe…</span>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-[12px] text-white/30 text-center py-6">
                {query ? 'Nenhum preço encontrado.' : 'Nenhum preço ativo no Stripe.'}
              </p>
            ) : (
              filtered.map(price => (
                <button
                  key={price.priceId}
                  type="button"
                  onClick={() => { onChange(price.priceId, price); setOpen(false); setQuery('') }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 text-left transition-colors',
                    value === price.priceId
                      ? 'bg-[#E8521A]/8'
                      : 'hover:bg-white/3',
                  )}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[#EDEDED] truncate">
                        {price.nickname ?? price.productName}
                      </span>
                      {price.nickname && (
                        <span className="text-[10px] text-white/25 truncate hidden sm:inline">
                          {price.productName}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-white/25 mt-0.5">{price.priceId}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded',
                      price.livemode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400',
                    )}>
                      {price.livemode ? 'LIVE' : 'TEST'}
                    </span>
                    <span className="text-[13px] font-bold font-mono text-[#E8521A]">
                      {fmtAmount(price.amount, price.currency)}{intervalLabel(price.interval)}
                    </span>
                    {value === price.priceId && <Check className="w-3.5 h-3.5 text-[#E8521A]" />}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {prices.length > 0 && (
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-[10px] text-white/20">{prices.length} preço{prices.length !== 1 ? 's' : ''} encontrado{prices.length !== 1 ? 's' : ''}</span>
              <button
                onClick={fetchPrices}
                className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Atualizar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  KeyRound, Search, X, RefreshCw, Package, Shield,
  CheckCircle2, AlertCircle, ChevronRight, Trash2,
  Plus, Users, Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

// ── Tokens ────────────────────────────────────────────────────

const BG_PAGE = '#0D0E12'
const BG_CARD = '#13151A'
const BORDER  = 'rgba(255,255,255,0.07)'

// ── Types ─────────────────────────────────────────────────────

interface AccessRow {
  id: string
  user_id: string
  product_id: string
  purchased_at: string
  stripe_session_id: string | null
  products: { name: string; slug: string } | null
}

interface ProductRow {
  id: string; name: string; slug: string; status: string
}

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso))
}

function fmtUserId(id: string) {
  return id.slice(0, 8) + '…'
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

// ── Data ──────────────────────────────────────────────────────

function useAcessos() {
  return useQuery({
    queryKey: ['acessos-data'],
    staleTime: 30_000,
    queryFn: async () => {
      const [accessRes, productRes] = await Promise.all([
        supabase
          .from('user_access')
          .select('id, user_id, product_id, purchased_at, stripe_session_id, products(name, slug)')
          .order('purchased_at', { ascending: false })
          .limit(500),
        supabase
          .from('products')
          .select('id, name, slug, status')
          .order('name'),
      ])
      return {
        accesses: (accessRes.data ?? []) as unknown as AccessRow[],
        products: (productRes.data ?? []) as ProductRow[],
      }
    },
  })
}

function useRevokeAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_access').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Acesso revogado')
      qc.invalidateQueries({ queryKey: ['acessos-data'] })
    },
    onError: () => toast.error('Erro ao revogar acesso'),
  })
}

// ── Access row ────────────────────────────────────────────────

function AccessRow({
  access, onRevoke, revoking,
}: {
  access: AccessRow
  onRevoke: (id: string) => void
  revoking: boolean
}) {
  const days     = daysSince(access.purchased_at)
  const isStripe = !!access.stripe_session_id
  const product  = access.products

  return (
    <div
      className="flex items-center gap-4 px-5 py-3 group transition-all hover:bg-white/[0.018]"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
    >
      {/* Product badge */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold text-white"
        style={{ background: 'rgba(232,82,26,0.3)' }}
      >
        {(product?.name ?? '?')[0].toUpperCase()}
      </div>

      {/* User + product */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[12.5px] font-medium text-[#DADCE6] font-mono">{fmtUserId(access.user_id)}</span>
          {isStripe ? (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(96,165,250,0.12)', color: '#60A5FA' }}
            >
              Stripe
            </span>
          ) : (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(109,74,255,0.12)', color: '#9474FF' }}
            >
              Manual
            </span>
          )}
        </div>
        <p className="text-[11px] truncate" style={{ color: '#404252' }}>
          {product?.name ?? 'Produto removido'}
          {access.stripe_session_id && (
            <span className="ml-2" style={{ color: '#2E3042' }}>· {access.stripe_session_id.slice(0, 12)}…</span>
          )}
        </p>
      </div>

      {/* Date */}
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-[11.5px] tabular-nums" style={{ color: '#5A5C6A' }}>
          {fmtDate(access.purchased_at)}
        </p>
        <p className="text-[10px]" style={{ color: '#2E3042' }}>
          {days === 0 ? 'hoje' : `${days}d atrás`}
        </p>
      </div>

      {/* Status */}
      <div className="shrink-0">
        <span
          className="flex items-center gap-1 text-[9.5px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399' }}
        >
          <CheckCircle2 className="w-2.5 h-2.5" />
          Ativo
        </span>
      </div>

      {/* Revoke */}
      <button
        onClick={() => {
          if (confirm('Revogar acesso desta pessoa ao produto?')) onRevoke(access.id)
        }}
        disabled={revoking}
        className={cn(
          'opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-lg',
          'transition-all duration-150 shrink-0 cursor-pointer',
        )}
        style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.15)',
          color: '#F87171',
        }}
        title="Revogar acesso"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <KeyRound className="w-10 h-10 text-white/8" />
      <p className="text-[13px]" style={{ color: '#2E3042' }}>
        {query ? `Nenhum acesso encontrado para "${query}"` : 'Nenhum acesso registrado'}
      </p>
      <p className="text-[11px]" style={{ color: '#1C1E28' }}>
        Os acessos são criados automaticamente via Stripe ou manualmente aqui
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function AcessosPage() {
  const [query,      setQuery]      = useState('')
  const [productFilter, setProductFilter] = useState<string>('all')

  const { data, isLoading, refetch } = useAcessos()
  const revoke = useRevokeAccess()

  const accesses = data?.accesses ?? []
  const products = data?.products ?? []

  // Per-product counts
  const productCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of accesses) {
      map.set(a.product_id, (map.get(a.product_id) ?? 0) + 1)
    }
    return map
  }, [accesses])

  // Filter
  const filtered = useMemo(() => {
    let list = accesses
    if (productFilter !== 'all') {
      list = list.filter(a => a.product_id === productFilter)
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(a =>
        a.user_id.toLowerCase().includes(q) ||
        (a.products?.name ?? '').toLowerCase().includes(q) ||
        (a.stripe_session_id ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [accesses, productFilter, query])

  const stripeCount = accesses.filter(a => !!a.stripe_session_id).length
  const manualCount = accesses.filter(a => !a.stripe_session_id).length

  return (
    <div className="flex flex-col min-h-full" style={{ background: BG_PAGE }}>
      <div className="max-w-5xl w-full mx-auto px-6 py-8 flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[18px] font-bold text-[#DADCE6] tracking-tight">Acessos</h1>
            <p className="text-[12px] mt-0.5" style={{ color: '#404252' }}>
              Quem tem acesso a cada produto da área de membros
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer"
            style={{ background: BG_CARD, border: `1px solid ${BORDER}`, color: '#5A5C6A' }}
          >
            <RefreshCw className={cn('w-3 h-3', isLoading && 'animate-spin')} />
            Atualizar
          </button>
        </div>

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total de Acessos',  value: accesses.length, color: '#9474FF', icon: KeyRound  },
            { label: 'Via Stripe',        value: stripeCount,     color: '#60A5FA', icon: Shield    },
            { label: 'Manuais',           value: manualCount,     color: '#FCD34D', icon: Users     },
            { label: 'Produtos',          value: products.filter(p => p.status === 'published').length, color: '#FB923C', icon: Package },
          ].map(item => (
            <div
              key={item.label}
              className="p-4 rounded-xl flex flex-col gap-2.5"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: '#404252' }}>{item.label}</span>
                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: `${item.color}16` }}>
                  <item.icon className="w-3 h-3" style={{ color: item.color }} />
                </div>
              </div>
              <p className="text-[24px] font-bold tabular-nums leading-none"
                style={{ color: isLoading ? '#ffffff15' : item.color }}>
                {isLoading ? '—' : item.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Product breakdown ── */}
        {products.length > 0 && (
          <div
            className="rounded-xl p-5"
            style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
          >
            <p className="text-[12px] font-semibold text-[#DADCE6] mb-3">Por Produto</p>
            <div className="flex flex-col gap-2">
              {products.map(p => {
                const count = productCounts.get(p.id) ?? 0
                const max   = Math.max(...products.map(pp => productCounts.get(pp.id) ?? 0), 1)
                return (
                  <button
                    key={p.id}
                    onClick={() => setProductFilter(productFilter === p.id ? 'all' : p.id)}
                    className="flex items-center gap-3 group cursor-pointer"
                  >
                    <span
                      className="text-[11px] w-36 text-right shrink-0 truncate"
                      style={{ color: productFilter === p.id ? '#DADCE6' : '#5A5C6A' }}
                    >
                      {p.name}
                    </span>
                    <div className="flex-1 h-5 rounded overflow-hidden relative"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div
                        className="h-full rounded transition-all duration-500"
                        style={{
                          width: count > 0 ? `${Math.max((count / max) * 100, 4)}%` : '0%',
                          background: productFilter === p.id
                            ? 'rgba(148,116,255,0.6)'
                            : 'rgba(148,116,255,0.2)',
                        }}
                      />
                      {count > 0 && (
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9.5px] font-bold"
                          style={{ color: '#9474FF' }}>
                          {count}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] shrink-0 w-6 text-right tabular-nums"
                      style={{ color: '#404252' }}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Access list ── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
        >
          {/* Search */}
          <div className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#404252' }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por user ID, produto ou sessão Stripe…"
                className="w-full pl-8 pr-8 py-1.5 rounded-lg text-[12.5px] outline-none"
                style={{
                  background: '#0D0E12',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#DADCE6',
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer">
                  <X className="w-3 h-3" style={{ color: '#404252' }} />
                </button>
              )}
            </div>

            {productFilter !== 'all' && (
              <button
                onClick={() => setProductFilter('all')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer"
                style={{ background: 'rgba(148,116,255,0.12)', color: '#9474FF' }}
              >
                <X className="w-2.5 h-2.5" />
                {products.find(p => p.id === productFilter)?.name ?? 'Produto'}
              </button>
            )}
          </div>

          {/* Count */}
          {!isLoading && (
            <div className="px-5 py-2.5 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <span className="text-[10.5px]" style={{ color: '#2E3042' }}>
                {filtered.length} acesso{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Rows */}
          {isLoading ? (
            <div className="flex flex-col">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="w-8 h-8 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3 w-40 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    <div className="h-2 w-56 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            <div>
              {filtered.map(access => (
                <AccessRow
                  key={access.id}
                  access={access}
                  onRevoke={id => revoke.mutate(id)}
                  revoking={revoke.isPending}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Info card ── */}
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.1)' }}
        >
          <Shield className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#60A5FA' }} />
          <div>
            <p className="text-[12px] font-semibold" style={{ color: '#60A5FA' }}>Sobre acessos manuais</p>
            <p className="text-[11.5px] mt-1 leading-relaxed" style={{ color: '#404252' }}>
              Para conceder acesso manual (cortesia, bonificação), adicione um registro diretamente via Supabase
              na tabela <code className="text-[10.5px] px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#9474FF' }}>user_access</code>{' '}
              com o <code className="text-[10.5px] px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#9474FF' }}>user_id</code> e <code className="text-[10.5px] px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#9474FF' }}>product_id</code> correspondentes.
              O acesso é refletido imediatamente na área de membros.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

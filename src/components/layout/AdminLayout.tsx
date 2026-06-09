import { useEffect, useState, useRef, useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Search, Settings, LogOut, User, Package, Users, X, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import Sidebar from './Sidebar'

// ── Tokens ────────────────────────────────────────────────────

const BG     = '#111111'
const BORDER = 'rgba(255,255,255,0.06)'
const BG_DROP = '#1A1C23'

// ── Helpers ───────────────────────────────────────────────────

const TITLES: Record<string, string> = {
  '/admin':          'Dashboard',
  '/admin/leads':    'Leads CRM',
  '/admin/products': 'Produtos',
  '/admin/builder':  'Páginas',
  '/admin/settings': 'Configurações',
}

function fmtAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)  return 'agora'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function displayName(user: SupabaseUser | null) {
  return user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ''
}

function initials(user: SupabaseUser | null) {
  const name = displayName(user)
  if (name.trim()) {
    const parts = name.trim().split(/\s+/)
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
  }
  return (user?.email?.[0] ?? '?').toUpperCase()
}

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, cb])
}

// ── Search Modal ──────────────────────────────────────────────

interface SearchResult {
  type: 'product' | 'lead'
  id:   string
  label: string
  sub:   string
  href:  string
}

function SearchModal({ onClose }: { onClose: () => void }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [active,  setActive]  = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
      if (e.key === 'Enter' && results[active]) { navigate(results[active].href); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [results, active, navigate, onClose])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const q = query.trim()
    if (!q) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      const [{ data: prods }, { data: leads }] = await Promise.all([
        supabase.from('products').select('id, name, slug, status')
          .ilike('name', `%${q}%`).limit(5),
        supabase.from('leads').select('id, name, email, created_at')
          .or(`name.ilike.%${q}%,email.ilike.%${q}%`).limit(5),
      ])
      const r: SearchResult[] = [
        ...((prods ?? []).map(p => ({
          type:  'product' as const,
          id:    p.id,
          label: p.name,
          sub:   p.status ?? 'produto',
          href:  `/admin/products/${p.id}`,
        }))),
        ...((leads ?? []).map(l => ({
          type:  'lead' as const,
          id:    l.id,
          label: l.name || l.email || 'Lead',
          sub:   l.email ?? fmtAgo(l.created_at),
          href:  `/admin/leads`,
        }))),
      ]
      setResults(r)
      setActive(0)
      setLoading(false)
    }, 250)
  }, [query])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="w-full max-w-[560px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: BG_DROP, border: `1px solid ${BORDER}` }}
        onClick={e => e.stopPropagation()}>

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: results.length ? `1px solid ${BORDER}` : 'none' }}>
          <Search className="w-4 h-4 text-white/30 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar produtos, leads…"
            className="flex-1 bg-transparent outline-none text-[14px] text-[#EDEDED] placeholder:text-white/25"
          />
          {loading && <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin shrink-0" />}
          <button onClick={onClose}
            className="p-1 rounded-md text-white/20 hover:text-white/50 transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="py-1.5 max-h-[360px] overflow-y-auto">
            {results.map((r, i) => (
              <button key={r.id + r.type}
                onClick={() => { navigate(r.href); onClose() }}
                onMouseEnter={() => setActive(i)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{ background: i === active ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: r.type === 'product' ? 'rgba(232,82,26,0.1)' : 'rgba(96,165,250,0.1)',
                    border: `1px solid ${r.type === 'product' ? 'rgba(232,82,26,0.2)' : 'rgba(96,165,250,0.2)'}`,
                  }}>
                  {r.type === 'product'
                    ? <Package className="w-3.5 h-3.5" style={{ color: '#F0643A' }} />
                    : <Users   className="w-3.5 h-3.5" style={{ color: '#93C5FD' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#EDEDED] truncate">{r.label}</p>
                  <p className="text-[11px] text-white/30 truncate">{r.sub}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white/15 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {query.trim() && !loading && results.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-[13px] text-white/25">Nenhum resultado para "<span className="text-white/40">{query}</span>"</p>
          </div>
        )}

        {!query.trim() && (
          <div className="px-4 py-3 flex items-center gap-4">
            <span className="text-[11px] text-white/20">Dica:</span>
            <span className="text-[11px] text-white/20">↑↓ navegar · Enter abrir · Esc fechar</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Notifications Panel ───────────────────────────────────────

interface Notif {
  id:           string
  name:         string | null
  email:        string | null
  qualified:    boolean
  created_at:   string
  product_name: string | null
}

const NOTIF_LS_KEY = 'bridge:notif_last_read'

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [items,   setItems]   = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const ref    = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  useOutsideClick(ref, onClose)

  const lastRead = useRef(localStorage.getItem(NOTIF_LS_KEY) ?? new Date(0).toISOString())

  useEffect(() => {
    supabase.from('leads')
      .select('id, name, email, qualified, created_at, products(name)')
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        setItems((data ?? []).map((l: { id: string; name: string | null; email: string | null; qualified: boolean; created_at: string; products: { name: string }[] | { name: string } | null }) => ({
          id:           l.id,
          name:         l.name,
          email:        l.email,
          qualified:    l.qualified,
          created_at:   l.created_at,
          product_name: Array.isArray(l.products) ? (l.products[0]?.name ?? null) : (l.products?.name ?? null),
        })))
        setLoading(false)
        // Mark all as read
        localStorage.setItem(NOTIF_LS_KEY, new Date().toISOString())
      })
  }, [])

  return (
    <div ref={ref} className="absolute top-full right-0 mt-2 w-[340px] rounded-2xl shadow-2xl z-50 overflow-hidden"
      style={{ background: BG_DROP, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${BORDER}` }}>
        <p className="text-[13px] font-semibold text-[#EDEDED]">Notificações</p>
        <button onClick={onClose} className="text-white/20 hover:text-white/50 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <Bell className="w-7 h-7 text-white/10 mx-auto mb-2" />
            <p className="text-[12px] text-white/25">Sem notificações ainda</p>
          </div>
        ) : (
          items.map(item => {
            const isNew = item.created_at > lastRead.current
            return (
              <div key={item.id}
                className="flex items-start gap-3 px-4 py-3 transition-colors cursor-default"
                style={{ borderBottom: `1px solid rgba(255,255,255,0.04)`, background: isNew ? 'rgba(232,82,26,0.03)' : 'transparent' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: item.qualified ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                    border: `1px solid ${item.qualified ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
                  }}>
                  <Users className="w-3.5 h-3.5" style={{ color: item.qualified ? '#34D399' : '#F87171' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#EDEDED] truncate">
                    {item.name || item.email || 'Novo lead'}
                    {isNew && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-[#E8521A] align-middle" />}
                  </p>
                  <p className="text-[11px] text-white/30 truncate mt-0.5">
                    {item.product_name ? `${item.product_name} · ` : ''}{fmtAgo(item.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="px-4 py-2.5" style={{ borderTop: `1px solid ${BORDER}` }}>
        <button onClick={() => { navigate('/admin/leads'); onClose() }}
          className="w-full text-center text-[12px] font-medium transition-colors"
          style={{ color: '#E8521A' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.75' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}>
          Ver todos os leads →
        </button>
      </div>
    </div>
  )
}

// ── Profile Menu ──────────────────────────────────────────────

function ProfileMenu({ user, onClose }: { user: SupabaseUser | null; onClose: () => void }) {
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, onClose)
  const avatarUrl  = user?.user_metadata?.avatar_url as string | undefined
  const name       = displayName(user)
  const ini        = initials(user)

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div ref={ref} className="absolute top-full right-0 mt-2 w-[240px] rounded-2xl shadow-2xl z-50 overflow-hidden"
      style={{ background: BG_DROP, border: `1px solid ${BORDER}` }}>
      {/* User info */}
      <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar"
              className="w-9 h-9 rounded-xl object-cover shrink-0"
              style={{ border: `1px solid ${BORDER}` }} />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #E8521A, #C23F12)' }}>
              {ini}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#EDEDED] truncate">{name || 'Usuário'}</p>
            <p className="text-[11px] text-white/30 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="py-1.5">
        <button onClick={() => { navigate('/admin/settings'); onClose() }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/55 hover:text-[#EDEDED] hover:bg-white/5 transition-all text-left">
          <Settings className="w-4 h-4 shrink-0" />
          Configurações
        </button>
        <button onClick={() => { navigate('/admin/settings'); onClose() }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/55 hover:text-[#EDEDED] hover:bg-white/5 transition-all text-left">
          <User className="w-4 h-4 shrink-0" />
          Perfil
        </button>
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}` }} className="py-1.5">
        <button onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-400/70 hover:text-red-400 hover:bg-red-500/8 transition-all text-left">
          <LogOut className="w-4 h-4 shrink-0" />
          Sair
        </button>
      </div>
    </div>
  )
}

// ── Topbar ────────────────────────────────────────────────────

function Topbar({ user }: { user: SupabaseUser | null }) {
  const { pathname } = useLocation()
  const [searchOpen, setSearchOpen]   = useState(false)
  const [notifOpen,  setNotifOpen]    = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [unread,     setUnread]       = useState(0)

  const notifRef   = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const title = Object.entries(TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => pathname === path || pathname.startsWith(path + '/'))?.[1]
    ?? 'Admin'

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const ini       = initials(user)

  // Count unread notifications
  useEffect(() => {
    const lastRead = localStorage.getItem(NOTIF_LS_KEY) ?? new Date(0).toISOString()
    supabase.from('leads')
      .select('id', { count: 'exact', head: true })
      .gt('created_at', lastRead)
      .then(({ count }) => setUnread(count ?? 0))
  }, [notifOpen])

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(s => !s)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const closeNotif   = useCallback(() => setNotifOpen(false),   [])
  const closeProfile = useCallback(() => setProfileOpen(false), [])

  return (
    <>
      <header className="h-12 shrink-0 flex items-center gap-3 px-6"
        style={{ borderBottom: `1px solid ${BORDER}`, background: BG }}>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px]">
          <span style={{ color: '#52525B' }}>Bridge HUB</span>
          <span style={{ color: '#3F3F46' }}>/</span>
          <span className="text-[#EDEDED] font-medium">{title}</span>
        </div>

        <div className="flex-1" />

        {/* Search */}
        <button onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${BORDER}`,
            color: '#52525B',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.color = '#52525B' }}>
          <Search className="w-3.5 h-3.5" />
          <span>Buscar...</span>
          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#52525B' }}>
            ⌘K
          </span>
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen(o => !o); setProfileOpen(false) }}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{
              color:      notifOpen ? '#EDEDED'    : '#52525B',
              background: notifOpen ? 'rgba(255,255,255,0.07)' : 'transparent',
            }}
            onMouseEnter={e => { if (!notifOpen) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA' }}}
            onMouseLeave={e => { if (!notifOpen) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#52525B' }}}>
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                style={{ background: '#E8521A' }} />
            )}
          </button>
          {notifOpen && <NotificationsPanel onClose={closeNotif} />}
        </div>

        {/* Avatar / Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setProfileOpen(o => !o); setNotifOpen(false) }}
            className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-bold text-white transition-all ring-offset-[#111] ring-offset-1"
            style={{
              background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #E8521A, #C23F12)',
              outline: profileOpen ? '2px solid rgba(232,82,26,0.5)' : '2px solid transparent',
            }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : ini}
          </button>
          {profileOpen && <ProfileMenu user={user} onClose={closeProfile} />}
        </div>
      </header>

      {/* Search modal (portal-like via conditional render) */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  )
}

// ── AdminLayout ───────────────────────────────────────────────

export default function AdminLayout() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [user,  setUser]  = useState<SupabaseUser | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login', { replace: true }); return }
      setUser(session.user)
      setReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) { navigate('/login', { replace: true }); return }
      setUser(session.user)
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
      <div className="w-7 h-7 rounded-full border-2 border-[#E8521A] border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0A0A0A' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

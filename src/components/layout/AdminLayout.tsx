import { useEffect, useState, useRef, useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Search, Settings, LogOut, User, Package, Users, X, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import Sidebar from './Sidebar'
import ThemeToggle from '@/components/ui/ThemeToggle'

import { FUNDO, LARANJA_ACAO, ON_LARANJA } from '@/lib/theme'

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-[560px] rounded-grande overflow-hidden border border-line bg-superficie shadow-[var(--sombra-flutua)]"
        onClick={e => e.stopPropagation()}>

        {/* Input */}
        <div className={`flex items-center gap-3 px-4 py-3.5 ${results.length ? 'border-b border-line' : ''}`}>
          <Search className="w-4 h-4 text-texto-mute shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar produtos, leads…"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink placeholder:text-texto-mute"
          />
          {loading && <div className="w-4 h-4 rounded-full border-2 border-line border-t-laranja animate-spin shrink-0" />}
          <button onClick={onClose}
            aria-label="Fechar busca"
            className="p-1 rounded-md text-texto-mute hover:text-ink-sub transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foco)]">
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
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foco)] ${i === active ? 'bg-superficie-2' : 'bg-transparent'}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${r.type === 'product' ? 'bg-laranja-suave' : 'bg-ok-fundo'}`}>
                  {r.type === 'product'
                    ? <Package className="w-3.5 h-3.5 text-laranja-texto" />
                    : <Users   className="w-3.5 h-3.5 text-ok" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink truncate">{r.label}</p>
                  <p className="text-[13px] text-texto-mute truncate">{r.sub}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-texto-mute shrink-0" />
              </button>
            ))}
          </div>
        )}

        {query.trim() && !loading && results.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-[13px] text-texto-mute">Nenhum resultado para "<span className="text-ink-sub">{query}</span>"</p>
          </div>
        )}

        {!query.trim() && (
          <div className="px-4 py-3 flex items-center gap-4">
            <span className="text-[13px] text-texto-mute">Dica:</span>
            <span className="text-[13px] text-texto-mute">↑↓ navegar · Enter abrir · Esc fechar</span>
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
    <div ref={ref} className="absolute top-full right-0 mt-2 w-[340px] rounded-grande overflow-hidden z-50 border border-line bg-superficie shadow-[var(--sombra-flutua)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <p className="text-[13px] font-semibold text-ink">Notificações</p>
        <button onClick={onClose} aria-label="Fechar notificações"
          className="text-texto-mute hover:text-ink-sub transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foco)] rounded-md">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-4 h-4 rounded-full border-2 border-line border-t-laranja animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <Bell className="w-7 h-7 text-texto-mute mx-auto mb-2" />
            <p className="text-[13px] text-texto-mute">Sem notificações ainda</p>
          </div>
        ) : (
          items.map(item => {
            const isNew = item.created_at > lastRead.current
            return (
              <div key={item.id}
                className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-default border-b border-line ${isNew ? 'bg-laranja-suave' : 'bg-transparent'}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${item.qualified ? 'bg-ok-fundo' : 'bg-erro-fundo'}`}>
                  <Users className={`w-3.5 h-3.5 ${item.qualified ? 'text-ok' : 'text-erro'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink truncate">
                    {item.name || item.email || 'Novo lead'}
                    {isNew && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-laranja align-middle" />}
                  </p>
                  <p className="text-[13px] text-texto-mute truncate mt-0.5">
                    {item.product_name ? `${item.product_name} · ` : ''}{fmtAgo(item.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-line">
        <button onClick={() => { navigate('/admin/leads'); onClose() }}
          className="w-full text-center text-[13px] font-medium text-laranja-texto hover:opacity-75 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foco)] rounded-md">
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
    <div ref={ref} className="absolute top-full right-0 mt-2 w-[240px] rounded-grande overflow-hidden z-50 border border-line bg-superficie shadow-[var(--sombra-flutua)]">
      {/* User info */}
      <div className="px-4 py-3.5 border-b border-line">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar"
              className="w-9 h-9 rounded-xl object-cover shrink-0 border border-line" />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold shrink-0"
              style={{ background: LARANJA_ACAO, color: ON_LARANJA }}>
              {ini}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink truncate">{name || 'Usuário'}</p>
            <p className="text-[13px] text-texto-mute truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="py-1.5">
        <button onClick={() => { navigate('/admin/settings'); onClose() }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink-sub hover:text-ink hover:bg-superficie-2 transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foco)]">
          <Settings className="w-4 h-4 shrink-0" />
          Configurações
        </button>
        <button onClick={() => { navigate('/admin/settings'); onClose() }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink-sub hover:text-ink hover:bg-superficie-2 transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foco)]">
          <User className="w-4 h-4 shrink-0" />
          Perfil
        </button>
      </div>

      <div className="border-t border-line py-1.5">
        <button onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-erro hover:bg-erro-fundo transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foco)]">
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
      <header className="h-12 shrink-0 flex items-center gap-3 px-6 border-b border-line"
        style={{ background: FUNDO }}>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-texto-mute">Bridge HUB</span>
          <span className="text-texto-mute">/</span>
          <span className="text-ink font-bold tracking-tight">{title}</span>
        </div>

        <div className="flex-1" />

        {/* Search */}
        <button onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] border border-line bg-campo text-texto-mute transition-all hover:text-ink-sub hover:border-[var(--borda-controle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foco)]">
          <Search className="w-3.5 h-3.5" />
          <span>Buscar...</span>
          <span className="ml-2 text-[13px] px-1.5 py-0.5 rounded bg-superficie-2 text-texto-mute">
            ⌘K
          </span>
        </button>

        <ThemeToggle />

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen(o => !o); setProfileOpen(false) }}
            aria-label="Notificações"
            aria-expanded={notifOpen}
            className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foco)] ${notifOpen ? 'text-ink bg-superficie-2' : 'text-texto-mute hover:text-ink-sub hover:bg-superficie-2'}`}>
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-laranja" />
            )}
          </button>
          {notifOpen && <NotificationsPanel onClose={closeNotif} />}
        </div>

        {/* Avatar / Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setProfileOpen(o => !o); setNotifOpen(false) }}
            aria-label="Menu do usuário"
            aria-expanded={profileOpen}
            className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[13px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foco)] ${profileOpen ? 'ring-2 ring-laranja' : ''}`}
            style={{ background: avatarUrl ? 'transparent' : LARANJA_ACAO, color: ON_LARANJA }}>
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
  const { pathname } = useLocation()
  // Única rota de tela cheia: o editor de formulário tem canvas próprio e
  // gerencia a própria altura.
  const fullBleed = pathname.endsWith('/edit')
  const [ready, setReady] = useState(false)
  const [user,  setUser]  = useState<SupabaseUser | null>(null)

  useEffect(() => {
    // Só desvia quem é explicitamente professor. Conta sem papel definido segue
    // para o admin como sempre — a RLS é que limita o que ela alcança, e mandá-la
    // para um portal que também não funcionaria só trancaria o acesso.
    function route(session: { user: SupabaseUser } | null) {
      if (!session) { navigate('/login', { replace: true }); return }
      if (session.user.app_metadata?.role === 'professor') {
        navigate('/professor', { replace: true })
        return
      }
      setUser(session.user)
      setReady(true)
    }

    supabase.auth.getSession().then(({ data: { session } }) => route(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => route(session))
    return () => subscription.unsubscribe()
  }, [navigate])

  if (!ready) return (
    <div className="ds min-h-screen flex items-center justify-center" style={{ background: FUNDO }}>
      <div className="w-7 h-7 rounded-full border-2 border-laranja border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="ds flex h-screen overflow-hidden" style={{ background: FUNDO }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-auto">
          {/* A medianiz e a largura máxima ficam aqui, e não em cada página.
              O redesign havia movido isso para dentro das telas, e só a
              Dashboard recebeu o invólucro — as outras ficaram coladas na
              borda. Centralizar impede que a próxima tela esqueça.
              O editor de formulário é tela cheia e por isso fica de fora. */}
          {fullBleed ? (
            <Outlet />
          ) : (
            <div className="max-w-7xl w-full mx-auto px-5 py-6 sm:px-8 sm:py-8">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

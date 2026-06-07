import { useState, useRef, useEffect } from 'react'
import {
  User, Bell, Shield, Camera, Save,
  Eye, EyeOff, CheckCircle2, Loader2,
  Mail, Lock, AtSign, Globe,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { User as SupabaseUser } from '@supabase/supabase-js'

// ── Tokens ─────────────────────────────────────────────────────

const BG_PAGE  = '#0D0E12'
const BG_CARD  = '#1A1C23'
const BG_INPUT = '#13151A'
const BORDER   = 'rgba(255,255,255,0.07)'
const ACCENT   = '#E8521A'

// ── Types ──────────────────────────────────────────────────────

type TabId = 'perfil' | 'notificacoes' | 'seguranca'

interface NotifSettings {
  new_lead:        boolean
  qualified_lead:  boolean
  daily_summary:   boolean
  product_updates: boolean
}

// ── Helpers ────────────────────────────────────────────────────

function initials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
  }
  return (email?.[0] ?? '?').toUpperCase()
}

function displayName(user: SupabaseUser | null): string {
  return user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ''
}

// ── Primitives ─────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-[15px] font-bold text-[#EDEDED]">{title}</h2>
      {description && <p className="text-[13px] text-white/30 mt-0.5">{description}</p>}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[12px] font-semibold text-white/40 mb-1.5 uppercase tracking-wider">
      {children}
    </label>
  )
}

function TextInput({
  value, onChange, placeholder, disabled, icon: Icon,
}: {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  disabled?: boolean
  icon?: React.ElementType
}) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />}
      <input
        type="text"
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full rounded-xl px-4 py-2.5 text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none transition-all',
          Icon && 'pl-10',
          disabled && 'opacity-40 cursor-not-allowed',
        )}
        style={{ background: BG_INPUT, border: `1px solid ${BORDER}` }}
        onFocus={e => { if (!disabled) (e.target as HTMLInputElement).style.borderColor = 'rgba(232,82,26,0.4)' }}
        onBlur={e  => {               (e.target as HTMLInputElement).style.borderColor = BORDER }}
      />
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl pl-10 pr-10 py-2.5 text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none transition-all"
        style={{ background: BG_INPUT, border: `1px solid ${BORDER}` }}
        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(232,82,26,0.4)' }}
        onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BORDER }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
      >
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

function SaveButton({ loading, saved, onClick, label = 'Salvar alterações' }: {
  loading: boolean; saved: boolean; onClick: () => void; label?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
      style={{
        background: saved ? 'rgba(52,211,153,0.12)' : ACCENT,
        color:      saved ? '#34D399' : '#fff',
        opacity:    loading ? 0.7 : 1,
        border:     saved ? '1px solid rgba(52,211,153,0.2)' : '1px solid transparent',
      }}
    >
      {loading  ? <Loader2     className="w-4 h-4 animate-spin" />
       : saved   ? <CheckCircle2 className="w-4 h-4" />
                 : <Save         className="w-4 h-4" />}
      {saved ? 'Salvo!' : label}
    </button>
  )
}

function Toggle({ value, onChange, label, description }: {
  value: boolean; onChange: (v: boolean) => void; label: string; description?: string
}) {
  return (
    <div className="flex items-center justify-between py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-[13px] font-medium text-[#EDEDED]">{label}</p>
        {description && <p className="text-[12px] text-white/30 mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className="relative shrink-0 rounded-full transition-all duration-200"
        style={{ width: 40, height: 22, background: value ? ACCENT : 'rgba(255,255,255,0.1)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 rounded-full bg-white transition-transform duration-200"
          style={{ width: 18, height: 18, transform: value ? 'translateX(18px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

// ── Avatar ─────────────────────────────────────────────────────

function AvatarEditor({ user, onUpdate }: { user: SupabaseUser; onUpdate: () => void }) {
  const fileRef   = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const name      = displayName(user)
  const initial   = initials(name, user.email)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `avatars/${user.id}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.auth.updateUser({ data: { avatar_url: `${publicUrl}?t=${Date.now()}` } })
      onUpdate()
    } catch { /* avatar is non-critical */ } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-5 mb-8 pb-8" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="relative">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar"
            className="w-16 h-16 rounded-2xl object-cover"
            style={{ border: `2px solid ${BORDER}` }} />
        ) : (
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #E8521A, #C23F12)' }}
          >
            {initial}
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
          style={{ background: '#2A2D38', border: `1px solid ${BORDER}` }}
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 text-white/40 animate-spin" />
            : <Camera  className="w-3.5 h-3.5 text-white/50" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      <div>
        <p className="text-[14px] font-semibold text-[#EDEDED]">{name || user.email}</p>
        <p className="text-[12px] text-white/30 mt-0.5">{user.email}</p>
        <button
          onClick={() => fileRef.current?.click()}
          className="text-[12px] mt-2 hover:underline transition-colors"
          style={{ color: ACCENT }}
        >
          Trocar foto
        </button>
      </div>
    </div>
  )
}

// ── Perfil Tab ────────────────────────────────────────────────

function PerfilTab({ user, onRefresh }: { user: SupabaseUser; onRefresh: () => void }) {
  const [fullName, setFullName] = useState(displayName(user))
  const [username, setUsername] = useState(user.user_metadata?.username ?? '')
  const [website,  setWebsite]  = useState(user.user_metadata?.website  ?? '')
  const [loading,  setLoading]  = useState(false)
  const [saved,    setSaved]    = useState(false)

  async function save() {
    setLoading(true)
    await supabase.auth.updateUser({ data: { full_name: fullName, username, website } })
    setLoading(false)
    setSaved(true)
    onRefresh()
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <SectionHeader
        title="Perfil"
        description="Suas informações pessoais e como você aparece na plataforma."
      />
      <AvatarEditor user={user} onUpdate={onRefresh} />
      <div className="grid grid-cols-1 gap-4 max-w-lg">
        <div>
          <Label>Nome completo</Label>
          <TextInput value={fullName} onChange={setFullName} placeholder="Seu nome" icon={User} />
        </div>
        <div>
          <Label>E-mail</Label>
          <TextInput value={user.email ?? ''} disabled icon={Mail} />
          <p className="text-[11px] text-white/20 mt-1.5">
            O e-mail é gerenciado pelo provedor de autenticação.
          </p>
        </div>
        <div>
          <Label>Usuário</Label>
          <TextInput value={username} onChange={setUsername} placeholder="@usuario" icon={AtSign} />
        </div>
        <div>
          <Label>Website</Label>
          <TextInput value={website} onChange={setWebsite} placeholder="https://seusite.com" icon={Globe} />
        </div>
      </div>
      <div className="mt-6">
        <SaveButton loading={loading} saved={saved} onClick={save} />
      </div>
    </div>
  )
}

// ── Notificações Tab ──────────────────────────────────────────

const NOTIF_KEY = 'bridge:notif_settings'
const defaultNotif: NotifSettings = {
  new_lead:        true,
  qualified_lead:  true,
  daily_summary:   false,
  product_updates: true,
}

function NotificacoesTab() {
  const [settings, setSettings] = useState<NotifSettings>(() => {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) ?? 'null') ?? defaultNotif }
    catch { return defaultNotif }
  })
  const [saved, setSaved] = useState(false)

  function toggle(key: keyof NotifSettings) {
    setSettings(s => ({ ...s, [key]: !s[key] }))
    setSaved(false)
  }

  function save() {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const items: { key: keyof NotifSettings; label: string; description: string }[] = [
    {
      key:         'new_lead',
      label:       'Novo lead capturado',
      description: 'Receber alerta quando um visitante preencher qualquer formulário.',
    },
    {
      key:         'qualified_lead',
      label:       'Lead qualificado',
      description: 'Notificar quando um lead completar o formulário com qualificação positiva.',
    },
    {
      key:         'daily_summary',
      label:       'Resumo diário',
      description: 'Receber um e-mail com o resumo de leads e conversões do dia.',
    },
    {
      key:         'product_updates',
      label:       'Atualizações da plataforma',
      description: 'Novidades, melhorias e comunicados sobre o Bridge.',
    },
  ]

  return (
    <div>
      <SectionHeader
        title="Notificações"
        description="Escolha quais alertas você quer receber."
      />
      <div
        className="rounded-2xl px-5 max-w-lg"
        style={{ background: '#13151A', border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-3 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <Bell className="w-4 h-4 text-white/25" />
          <p className="text-[13px] font-semibold text-white/50">Preferências de e-mail</p>
        </div>
        {items.map(item => (
          <Toggle
            key={item.key}
            value={settings[item.key]}
            onChange={() => toggle(item.key)}
            label={item.label}
            description={item.description}
          />
        ))}
        <div className="py-2" />
      </div>
      <div className="mt-6">
        <SaveButton loading={false} saved={saved} onClick={save} label="Salvar preferências" />
      </div>
    </div>
  )
}

// ── Segurança Tab ─────────────────────────────────────────────

function SegurancaTab({ user }: { user: SupabaseUser }) {
  const [newPass,  setNewPass]  = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')

  async function changePassword() {
    setError('')
    if (!newPass || newPass.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return }
    if (newPass !== confirm)            { setError('As senhas não coincidem.'); return }
    setLoading(true)
    const { error: e } = await supabase.auth.updateUser({ password: newPass })
    setLoading(false)
    if (e) { setError(e.message); return }
    setSaved(true)
    setNewPass(''); setConfirm('')
    setTimeout(() => setSaved(false), 3000)
  }

  const lastSignIn = user.last_sign_in_at
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(user.last_sign_in_at))
    : '—'

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionHeader
          title="Segurança"
          description="Gerencie sua senha e informações de acesso."
        />
        <div className="grid grid-cols-1 gap-4 max-w-lg">
          <div>
            <Label>Nova senha</Label>
            <PasswordInput value={newPass} onChange={setNewPass} placeholder="Mínimo 8 caracteres" />
          </div>
          <div>
            <Label>Confirmar nova senha</Label>
            <PasswordInput value={confirm} onChange={setConfirm} placeholder="Repita a nova senha" />
          </div>
          {error && (
            <p className="text-[12px] text-red-400">{error}</p>
          )}
        </div>
        <div className="mt-6">
          <SaveButton loading={loading} saved={saved} onClick={changePassword} label="Atualizar senha" />
        </div>
      </div>

      {/* Account info card */}
      <div className="max-w-lg">
        <p className="text-[12px] font-semibold uppercase tracking-widest text-white/25 mb-4">
          Informações da conta
        </p>
        <div
          className="rounded-2xl p-5 flex flex-col gap-4"
          style={{ background: '#13151A', border: `1px solid ${BORDER}` }}
        >
          {[
            { label: 'ID do usuário', value: user.id },
            { label: 'Último acesso', value: lastSignIn },
            { label: 'Provedor',      value: user.app_metadata?.provider ?? 'email' },
            { label: 'Papel (role)',  value: (user.app_metadata?.role as string) ?? 'user' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <span className="text-[12px] text-white/30 shrink-0">{label}</span>
              <span className="text-[12px] text-[#EDEDED] text-right font-mono break-all">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'perfil',       label: 'Perfil',       icon: User   },
  { id: 'notificacoes', label: 'Notificações', icon: Bell   },
  { id: 'seguranca',    label: 'Segurança',    icon: Shield },
]

export default function SettingsPage() {
  const [tab,     setTab]    = useState<TabId>('perfil')
  const [user,    setUser]   = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadUser() {
    const { data: { user: u } } = await supabase.auth.getUser()
    setUser(u)
    setLoading(false)
  }

  useEffect(() => { loadUser() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ background: BG_PAGE }}>
      <div className="w-5 h-5 rounded-full border-2 border-[#E8521A] border-t-transparent animate-spin" />
    </div>
  )
  if (!user) return null

  return (
    <div className="flex flex-col min-h-full" style={{ background: BG_PAGE }}>
      <div className="max-w-4xl w-full mx-auto px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-[#EDEDED] tracking-tight">Configurações</h1>
          <p className="text-[13px] text-white/30 mt-0.5">
            Gerencie seu perfil, notificações e segurança
          </p>
        </div>

        <div className="flex gap-8 items-start">
          {/* Sidebar nav */}
          <nav className="w-44 shrink-0 flex flex-col gap-1 sticky top-8">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-left transition-all',
                  tab === t.id
                    ? 'text-[#EDEDED] bg-white/8'
                    : 'text-white/35 hover:text-white/70 hover:bg-white/4',
                )}
              >
                <t.icon className={cn(
                  'w-4 h-4 shrink-0',
                  tab === t.id ? 'text-[#E8521A]' : 'text-white/25',
                )} />
                {t.label}
                {tab === t.id && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#E8521A] shrink-0" />
                )}
              </button>
            ))}
          </nav>

          {/* Content card */}
          <div
            className="flex-1 rounded-2xl p-8"
            style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
          >
            {tab === 'perfil'       && <PerfilTab       user={user} onRefresh={loadUser} />}
            {tab === 'notificacoes' && <NotificacoesTab />}
            {tab === 'seguranca'    && <SegurancaTab    user={user} />}
          </div>
        </div>
      </div>
    </div>
  )
}

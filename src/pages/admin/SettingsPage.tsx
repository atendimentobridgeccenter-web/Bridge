import { useState, useRef, useEffect } from 'react'
import {
  User, Bell, Shield, Camera, Save,
  Eye, EyeOff, CheckCircle2, Loader2,
  Mail, Lock, AtSign, Globe, Tag,
  Plus, Trash2, X, Check,
} from 'lucide-react'
import { toast } from 'sonner'
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

type TabId = 'perfil' | 'notificacoes' | 'seguranca' | 'cupons'

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
  const fileRef    = useRef<HTMLInputElement>(null)
  const [loading,  setLoading]  = useState(false)
  const [preview,  setPreview]  = useState<string | null>(null)
  const avatarUrl  = preview ?? (user.user_metadata?.avatar_url as string | undefined)
  const name       = displayName(user)
  const initial    = initials(name, user.email)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (max 3 MB)
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo: 3 MB.')
      return
    }

    // Optimistic preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setLoading(true)

    try {
      const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${user.id}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const urlWithBust = `${publicUrl}?t=${Date.now()}`

      const { error: authErr } = await supabase.auth.updateUser({
        data: { avatar_url: urlWithBust },
      })
      if (authErr) throw authErr

      setPreview(urlWithBust)
      toast.success('Foto atualizada!')
      onUpdate()
    } catch (err) {
      setPreview(null)
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Erro ao enviar foto: ${msg}`)
    } finally {
      setLoading(false)
      URL.revokeObjectURL(objectUrl)
      // Reset input so the same file can be re-selected
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-5 mb-8 pb-8" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="relative">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar"
            className="w-16 h-16 rounded-2xl object-cover"
            style={{ border: `2px solid ${BORDER}`, opacity: loading ? 0.5 : 1, transition: 'opacity .2s' }} />
        ) : (
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #E8521A, #C23F12)', opacity: loading ? 0.5 : 1 }}
          >
            {initial}
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
          style={{ background: '#2A2D38', border: `1px solid ${BORDER}` }}
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 text-white/40 animate-spin" />
            : <Camera  className="w-3.5 h-3.5 text-white/60" />}
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden" onChange={handleFile} />
      </div>
      <div>
        <p className="text-[14px] font-semibold text-[#EDEDED]">{name || user.email}</p>
        <p className="text-[12px] text-white/30 mt-0.5">{user.email}</p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="text-[12px] mt-2 hover:underline transition-colors disabled:opacity-40"
          style={{ color: ACCENT }}
        >
          {loading ? 'Enviando…' : 'Trocar foto'}
        </button>
        <p className="text-[10px] text-white/20 mt-0.5">PNG, JPG ou WebP · máx. 3 MB</p>
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

// ── CuponsTab ──────────────────────────────────────────────────

interface Coupon {
  id:             string
  code:           string
  description:    string | null
  discount_type:  'percentage' | 'fixed'
  discount_value: number
  applies_to:     'enrollment' | 'monthly' | 'both'
  max_uses:       number | null
  uses_count:     number
  active:         boolean
  expires_at:     string | null
  created_at:     string
}

const BLANK_FORM = {
  code:           '',
  description:    '',
  discount_type:  'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  applies_to:     'both' as 'enrollment' | 'monthly' | 'both',
  max_uses:       '',
  expires_at:     '',
}

function CuponsTab() {
  const [coupons,   setCoupons]   = useState<Coupon[]>([])
  const [loading,   setLoading]   = useState(true)
  const [creating,  setCreating]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [form,      setForm]      = useState(BLANK_FORM)

  const labelCls  = 'block text-[12px] font-semibold text-white/40 mb-1.5 uppercase tracking-wider'
  const inputCls  = 'w-full rounded-xl px-4 py-2.5 text-[13px] text-[#EDEDED] placeholder:text-white/20 outline-none transition-all'
  const inputSty  = { background: BG_INPUT, border: `1px solid ${BORDER}` }
  const focusBdr  = 'rgba(232,82,26,0.4)'

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    setCoupons((data ?? []) as Coupon[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const code = form.code.trim().toUpperCase()
    if (!code) { toast.error('Informe o código do cupom.'); return }
    const value = parseFloat(form.discount_value)
    if (isNaN(value) || value <= 0) { toast.error('Informe um valor de desconto válido.'); return }
    setSaving(true)
    const { error } = await supabase.from('coupons').insert({
      code,
      description:    form.description.trim() || null,
      discount_type:  form.discount_type,
      discount_value: value,
      applies_to:     form.applies_to,
      max_uses:       form.max_uses ? parseInt(form.max_uses) : null,
      expires_at:     form.expires_at || null,
    })
    setSaving(false)
    if (error) { toast.error(`Erro: ${error.message}`); return }
    toast.success('Cupom criado!')
    setForm(BLANK_FORM)
    setCreating(false)
    load()
  }

  async function toggleActive(c: Coupon) {
    const { error } = await supabase.from('coupons').update({ active: !c.active }).eq('id', c.id)
    if (error) { toast.error('Erro ao atualizar.'); return }
    setCoupons(cs => cs.map(x => x.id === c.id ? { ...x, active: !c.active } : x))
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este cupom?')) return
    const { error } = await supabase.from('coupons').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir.'); return }
    setCoupons(cs => cs.filter(c => c.id !== id))
    toast.success('Cupom excluído.')
  }

  function discountLabel(c: Coupon) {
    if (c.discount_type === 'percentage') return `${c.discount_value}%`
    return `R$ ${c.discount_value.toFixed(2).replace('.', ',')}`
  }

  function appliesToLabel(a: string) {
    if (a === 'enrollment') return 'Matrícula'
    if (a === 'monthly')    return 'Mensalidade'
    return 'Ambos'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[15px] font-bold text-[#EDEDED]">Cupons de Desconto</h2>
          <p className="text-[13px] text-white/30 mt-0.5">Gerenciar códigos aplicados no formulário de pagamento</p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{ background: ACCENT, boxShadow: '0 6px 20px rgba(232,82,26,0.25)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#C43E10' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ACCENT }}
          >
            <Plus className="w-3.5 h-3.5" /> Novo Cupom
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <form onSubmit={handleCreate}
          className="mb-6 rounded-xl p-5 flex flex-col gap-4"
          style={{ background: 'rgba(232,82,26,0.05)', border: '1px solid rgba(232,82,26,0.15)' }}>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[#EDEDED]">Novo Cupom</p>
            <button type="button" onClick={() => { setCreating(false); setForm(BLANK_FORM) }}
              className="text-white/30 hover:text-white/70 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Código</label>
              <input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: BRIDGE10"
                className={inputCls + ' font-mono'}
                style={inputSty}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = focusBdr }}
                onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BORDER }}
              />
            </div>
            <div>
              <label className={labelCls}>Descrição</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Desconto de boas-vindas"
                className={inputCls}
                style={inputSty}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = focusBdr }}
                onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BORDER }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Tipo</label>
              <select
                value={form.discount_type}
                onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                className={inputCls + ' appearance-none'}
                style={inputSty}
              >
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{form.discount_type === 'percentage' ? 'Porcentagem' : 'Valor (R$)'}</label>
              <input
                type="number"
                min="0"
                step={form.discount_type === 'percentage' ? '1' : '0.01'}
                value={form.discount_value}
                onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                placeholder={form.discount_type === 'percentage' ? '10' : '50.00'}
                className={inputCls}
                style={inputSty}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = focusBdr }}
                onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BORDER }}
              />
            </div>
            <div>
              <label className={labelCls}>Aplica em</label>
              <select
                value={form.applies_to}
                onChange={e => setForm(f => ({ ...f, applies_to: e.target.value as 'enrollment' | 'monthly' | 'both' }))}
                className={inputCls + ' appearance-none'}
                style={inputSty}
              >
                <option value="both">Ambos</option>
                <option value="enrollment">Matrícula</option>
                <option value="monthly">Mensalidade</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Máx. de usos</label>
              <input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                placeholder="Ilimitado"
                className={inputCls}
                style={inputSty}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = focusBdr }}
                onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BORDER }}
              />
            </div>
            <div>
              <label className={labelCls}>Expira em</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className={inputCls}
                style={{ ...inputSty, colorScheme: 'dark' }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = focusBdr }}
                onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = BORDER }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setCreating(false); setForm(BLANK_FORM) }}
              className="px-4 py-2 rounded-xl text-[13px] font-medium text-white/40 hover:text-white/70 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: ACCENT }}
              onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#C43E10' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ACCENT }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Salvar Cupom
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-white/30" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(232,82,26,0.08)', border: '1px solid rgba(232,82,26,0.15)' }}>
            <Tag className="w-5 h-5 text-[#E8521A]" />
          </div>
          <p className="text-[13px] text-white/30">Nenhum cupom criado ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {coupons.map(c => (
            <div key={c.id}
              className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>

              {/* Code badge */}
              <span className="font-mono font-bold text-[13px] px-2.5 py-1 rounded-lg shrink-0"
                style={{
                  background: c.active ? 'rgba(232,82,26,0.1)' : 'rgba(255,255,255,0.05)',
                  color:      c.active ? '#E8521A'              : 'rgba(255,255,255,0.3)',
                  border:     `1px solid ${c.active ? 'rgba(232,82,26,0.2)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                {c.code}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-[#EDEDED]">{discountLabel(c)}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md text-white/40"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {appliesToLabel(c.applies_to)}
                  </span>
                  {c.max_uses !== null && (
                    <span className="text-[11px] text-white/30">
                      {c.uses_count}/{c.max_uses} usos
                    </span>
                  )}
                  {c.expires_at && (
                    <span className="text-[11px] text-white/30">
                      Expira {new Date(c.expires_at).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                {c.description && (
                  <p className="text-[11px] text-white/25 mt-0.5 truncate">{c.description}</p>
                )}
              </div>

              {/* Toggle active */}
              <button
                onClick={() => toggleActive(c)}
                title={c.active ? 'Desativar' : 'Ativar'}
                className="relative rounded-full transition-all duration-200 shrink-0"
                style={{ width: 36, height: 20, background: c.active ? ACCENT : 'rgba(255,255,255,0.1)' }}>
                <span className="absolute top-0.5 left-0.5 rounded-full bg-white transition-transform duration-200"
                  style={{ width: 16, height: 16, transform: c.active ? 'translateX(16px)' : 'none' }} />
              </button>

              {/* Delete */}
              <button onClick={() => handleDelete(c.id)}
                className="text-white/20 hover:text-red-400 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'perfil',       label: 'Perfil',       icon: User   },
  { id: 'notificacoes', label: 'Notificações', icon: Bell   },
  { id: 'seguranca',    label: 'Segurança',    icon: Shield },
  { id: 'cupons',       label: 'Cupons',        icon: Tag    },
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
            {tab === 'cupons'       && <CuponsTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Loader2, Mail, ArrowLeft, CheckCircle2, Check } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/cn'

type Screen = 'login' | 'forgot' | 'forgot-sent'

export default function Login() {
  const navigate = useNavigate()

  const [screen,   setScreen]   = useState<Screen>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/admin', { replace: true })
    })
  }, [navigate])

  function networkError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Bridge Login] Erro de autenticação:', err)
    if (!isSupabaseConfigured) {
      return 'Configuração incompleta: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidas.'
    }
    if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
      return 'Erro de rede. O projeto Supabase pode estar pausado — restaure em supabase.com/dashboard.'
    }
    return msg
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) { setError(networkError(authErr)); setLoading(false); return }
      navigate('/admin', { replace: true })
    } catch (err) { setError(networkError(err)); setLoading(false) }
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Digite seu e-mail primeiro.'); return }
    setLoading(true); setError(null)
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      setLoading(false)
      if (resetErr) { setError(networkError(resetErr)); return }
      setScreen('forgot-sent')
    } catch (err) { setLoading(false); setError(networkError(err)) }
  }

  const ease = [0.16, 1, 0.3, 1] as const

  const inputCls = cn(
    'w-full h-10 px-3 rounded-lg text-sm text-white placeholder:text-zinc-600',
    'bg-zinc-800/80 border border-white/8',
    'outline-none transition-all duration-150',
  )
  const inputFocusSty = {
    '--tw-ring-color': 'rgba(232,82,26,0.2)',
    borderColor: 'rgba(232,82,26,0.5)',
  } as React.CSSProperties

  return (
    <div className="min-h-screen flex bg-zinc-950">

      {/* ── Left: Form ── */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 lg:max-w-[520px]">
        <div className="w-full max-w-sm">

          <AnimatePresence mode="wait">

            {/* ── Login ── */}
            {screen === 'login' && (
              <motion.div key="login"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4, ease }}>
                <h1 className="text-2xl font-semibold text-white mb-1.5">Bem-vindo de volta</h1>
                <p className="text-sm text-zinc-500 mb-8">Acesse o painel de controle da Bridge HUB.</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">E-mail</label>
                    <input
                      type="email" required autoFocus
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="voce@empresa.com"
                      className={inputCls}
                      onFocus={e => Object.assign(e.currentTarget.style, inputFocusSty)}
                      onBlur={e  => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-zinc-400">Senha</label>
                      <button type="button"
                        onClick={() => { setError(null); setScreen('forgot') }}
                        className="text-xs transition-colors"
                        style={{ color: '#E8521A' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#F97316' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#E8521A' }}>
                        Esqueci minha senha
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'} required
                        value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={cn(inputCls, 'pr-10')}
                        onFocus={e => Object.assign(e.currentTarget.style, inputFocusSty)}
                        onBlur={e  => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
                      />
                      <button type="button" onClick={() => setShowPw(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {error}
                    </motion.p>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full h-10 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#E8521A', boxShadow: '0 4px 16px rgba(232,82,26,0.3)' }}
                    onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#C43E10' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E8521A' }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Entrar <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Forgot password ── */}
            {screen === 'forgot' && (
              <motion.div key="forgot"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4, ease }}>
                <button onClick={() => { setError(null); setScreen('login') }}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-8 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao login
                </button>
                <h1 className="text-2xl font-semibold text-white mb-1.5">Redefinir senha</h1>
                <p className="text-sm text-zinc-500 mb-8">
                  Digite o e-mail da sua conta. Vamos enviar um link para criar uma nova senha.
                </p>
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">E-mail</label>
                    <input type="email" required autoFocus
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="voce@empresa.com"
                      className={inputCls}
                      onFocus={e => Object.assign(e.currentTarget.style, inputFocusSty)}
                      onBlur={e  => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
                    />
                  </div>
                  {error && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {error}
                    </motion.p>
                  )}
                  <button type="submit" disabled={loading}
                    className="w-full h-10 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#E8521A', boxShadow: '0 4px 16px rgba(232,82,26,0.3)' }}
                    onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#C43E10' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E8521A' }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4" /> Enviar link</>}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Forgot sent ── */}
            {screen === 'forgot-sent' && (
              <motion.div key="sent"
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease }} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20
                                flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <h1 className="text-xl font-semibold text-white mb-2">E-mail enviado!</h1>
                <p className="text-sm text-zinc-500 leading-relaxed mb-2">
                  Verifique a caixa de entrada de <strong className="text-zinc-300">{email}</strong>.
                </p>
                <p className="text-xs text-zinc-600 mb-8">
                  Clique no link do e-mail para criar sua nova senha. O link expira em 1 hora.
                </p>
                <button onClick={() => { setScreen('login'); setError(null) }}
                  className="text-sm transition-colors"
                  style={{ color: '#E8521A' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#F97316' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#E8521A' }}>
                  Voltar ao login
                </button>
              </motion.div>
            )}

          </AnimatePresence>

          <p className="mt-10 text-xs text-zinc-700 text-center">
            Bridge HUB © {new Date().getFullYear()} — Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* ── Right: Visual ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden border-l border-white/6"
        style={{ background: '#0D0E12' }}>

        {/* Orange glow blobs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'rgba(232,82,26,0.12)', filter: 'blur(100px)' }} />
        <div className="absolute -bottom-32 -left-16 w-[360px] h-[360px] rounded-full pointer-events-none"
          style={{ background: 'rgba(232,82,26,0.07)', filter: 'blur(80px)' }} />

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-14 text-center gap-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease }}
            className="flex flex-col items-center gap-6 w-full max-w-xs"
          >
            {/* Logo oficial */}
            <img
              src="/logo-bridge.png"
              alt="Bridge Cultural Center"
              className="max-h-36 max-w-[280px] w-full object-contain"
              style={{ filter: 'drop-shadow(0 4px 24px rgba(255,255,255,0.08))' }}
            />

            {/* Feature list */}
            <div className="w-full flex flex-col gap-3 text-left">
              {[
                'Formulários com lógica condicional',
                'CRM integrado para gestão de leads',
                'Checkout e pagamentos em um clique',
                'Analytics e rastreamento avançado',
              ].map(feat => (
                <div key={feat} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(232,82,26,0.15)', border: '1px solid rgba(232,82,26,0.3)' }}>
                    <Check className="w-3 h-3" style={{ color: '#E8521A' }} />
                  </div>
                  <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {feat}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Powered badge */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold"
            style={{
              background: 'rgba(232,82,26,0.08)',
              border:     '1px solid rgba(232,82,26,0.2)',
              color:      '#E8521A',
            }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#E8521A' }} />
            Powered by Bridge HUB
          </motion.div>
        </div>
      </div>
    </div>
  )
}

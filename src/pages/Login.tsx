import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Eye, EyeOff, ArrowRight, Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
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

  // Redirect if already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/admin', { replace: true })
    })
  }, [navigate])

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) {
      setError('E-mail ou senha inválidos. Use "Esqueci minha senha" para redefinir.')
      setLoading(false)
      return
    }
    navigate('/admin', { replace: true })
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Digite seu e-mail primeiro.'); return }
    setLoading(true)
    setError(null)
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (resetErr) { setError(resetErr.message); return }
    setScreen('forgot-sent')
  }

  const ease = [0.16, 1, 0.3, 1] as const

  return (
    <div className="min-h-screen flex bg-zinc-950">

      {/* ── Left: Form ── */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 lg:max-w-[520px]">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">Bridge</span>
          </div>

          <AnimatePresence mode="wait">

            {/* ── Login ── */}
            {screen === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease }}
              >
                <h1 className="text-2xl font-semibold text-white mb-1.5">Bem-vindo de volta</h1>
                <p className="text-sm text-zinc-500 mb-8">Acesse o painel de controle da Bridge.</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">E-mail</label>
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="voce@empresa.com"
                      className={cn(
                        'w-full h-10 px-3 rounded-lg text-sm text-white placeholder:text-zinc-600',
                        'bg-zinc-800/80 border border-white/8',
                        'focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20',
                        'transition-all duration-150',
                      )}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-zinc-400">Senha</label>
                      <button
                        type="button"
                        onClick={() => { setError(null); setScreen('forgot') }}
                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={cn(
                          'w-full h-10 px-3 pr-10 rounded-lg text-sm text-white placeholder:text-zinc-600',
                          'bg-zinc-800/80 border border-white/8',
                          'focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20',
                          'transition-all duration-150',
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      'w-full h-10 rounded-lg text-sm font-medium text-white',
                      'bg-violet-600 hover:bg-violet-500 active:bg-violet-700',
                      'flex items-center justify-center gap-2',
                      'shadow-lg shadow-violet-900/40',
                      'transition-all duration-150',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Entrar <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Forgot password ── */}
            {screen === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease }}
              >
                <button
                  onClick={() => { setError(null); setScreen('login') }}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-8 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao login
                </button>

                <h1 className="text-2xl font-semibold text-white mb-1.5">Redefinir senha</h1>
                <p className="text-sm text-zinc-500 mb-8">
                  Digite o e-mail da sua conta. Vamos enviar um link para criar uma nova senha.
                </p>

                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">E-mail</label>
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="voce@empresa.com"
                      className={cn(
                        'w-full h-10 px-3 rounded-lg text-sm text-white placeholder:text-zinc-600',
                        'bg-zinc-800/80 border border-white/8',
                        'focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20',
                        'transition-all duration-150',
                      )}
                    />
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      'w-full h-10 rounded-lg text-sm font-medium text-white',
                      'bg-violet-600 hover:bg-violet-500',
                      'flex items-center justify-center gap-2',
                      'shadow-lg shadow-violet-900/40',
                      'transition-all duration-150',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4" /> Enviar link de redefinição</>}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Forgot sent ── */}
            {screen === 'forgot-sent' && (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease }}
                className="text-center"
              >
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
                <button
                  onClick={() => { setScreen('login'); setError(null) }}
                  className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Voltar ao login
                </button>
              </motion.div>
            )}

          </AnimatePresence>

          <p className="mt-10 text-xs text-zinc-700 text-center">
            Bridge © {new Date().getFullYear()} — Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* ── Right: Visual ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-zinc-900 border-l border-white/8">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full bg-indigo-600/15 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-16 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.7, ease }}
          >
            <div className="glass rounded-3xl p-8 mb-8 max-w-xs mx-auto shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-violet-900/60">
                <Zap className="w-6 h-6 text-white fill-white" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Bridge</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Motor de Lançamentos Enterprise. Do formulário ao checkout em minutos.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {[{ value: '+500', label: 'Empresas' }, { value: '98%', label: 'Uptime' }, { value: '2.4×', label: 'Conversão' }]
                .map(({ value, label }) => (
                  <div key={label} className="glass rounded-2xl p-3 text-center">
                    <p className="text-lg font-bold text-white">{value}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
                  </div>
                ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

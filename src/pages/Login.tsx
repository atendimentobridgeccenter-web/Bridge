import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Mail, ArrowLeft, CheckCircle2, Check } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import Campo from '@/components/ui/Campo'
import Botao from '@/components/ui/Botao'

type Screen = 'login' | 'forgot' | 'forgot-sent'

export default function Login() {
  const navigate = useNavigate()

  const [screen,   setScreen]   = useState<Screen>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Professor vai direto ao portal. Sem isso ele cairia em /admin e só depois
  // seria rebatido pelo AdminLayout, piscando a interface errada no caminho.
  function homeFor(user: { app_metadata?: Record<string, unknown> } | null | undefined): string {
    return user?.app_metadata?.role === 'professor' ? '/professor' : '/admin'
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(homeFor(session.user), { replace: true })
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
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) { setError(networkError(authErr)); setLoading(false); return }
      navigate(homeFor(data.user), { replace: true })
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

  // Mesmo visual do input de .br-campo (ds.css) — usado aqui fora do Campo
  // porque o campo de senha precisa do botão de mostrar/ocultar por dentro,
  // e o componente Campo não tem um slot para isso (só prefixo à esquerda).
  const inputCls = cn(
    'w-full min-h-[44px] rounded-controle border border-line bg-campo px-3.5',
    'text-[15px] text-texto placeholder:text-texto-mute outline-none transition-colors',
    'focus:border-[var(--laranja-acao)] focus:shadow-[0_0_0_3px_var(--laranja-suave)]',
  )

  return (
    <div className="ds min-h-screen flex" style={{ background: 'var(--fundo)' }}>

      {/* ── Left: Form ── */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 lg:max-w-[520px]">
        <div className="w-full max-w-sm">

          <AnimatePresence mode="wait">

            {/* ── Login ── */}
            {screen === 'login' && (
              <motion.div key="login"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4, ease }}>
                <h1 className="text-2xl font-semibold text-ink mb-1.5">Bem-vindo de volta</h1>
                <p className="text-sm text-texto-mute mb-8">Acesse o painel de controle da Bridge HUB.</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <Campo id="login-email" rotulo="E-mail" obrigatorio>
                    <input
                      type="email" required autoFocus
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="voce@empresa.com"
                      className={inputCls}
                    />
                  </Campo>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="login-password" className="block text-[13px] font-medium text-texto-sub">Senha</label>
                      <button type="button"
                        onClick={() => { setError(null); setScreen('forgot') }}
                        className="text-[13px] text-laranja-texto hover:opacity-75 transition-opacity">
                        Esqueci minha senha
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPw ? 'text' : 'password'} required
                        value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={cn(inputCls, 'pr-10')}
                        style={{ paddingRight: 40 }}
                      />
                      <button type="button" onClick={() => setShowPw(p => !p)}
                        aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-texto-mute hover:text-texto-sub">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="text-[13px] text-erro bg-erro-fundo border border-erro rounded-lg px-3 py-2">
                      {error}
                    </motion.p>
                  )}

                  <Botao type="submit" variante="primario" carregando={loading} className="w-full justify-center">
                    Entrar <ArrowRight className="w-4 h-4" />
                  </Botao>
                </form>
              </motion.div>
            )}

            {/* ── Forgot password ── */}
            {screen === 'forgot' && (
              <motion.div key="forgot"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4, ease }}>
                <button onClick={() => { setError(null); setScreen('login') }}
                  className="flex items-center gap-1.5 text-[13px] text-texto-mute hover:text-texto-sub mb-8 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao login
                </button>
                <h1 className="text-2xl font-semibold text-ink mb-1.5">Redefinir senha</h1>
                <p className="text-sm text-texto-mute mb-8">
                  Digite o e-mail da sua conta. Vamos enviar um link para criar uma nova senha.
                </p>
                <form onSubmit={handleForgot} className="space-y-4">
                  <Campo id="forgot-email" rotulo="E-mail" obrigatorio>
                    <input type="email" required autoFocus
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="voce@empresa.com"
                      className={inputCls}
                    />
                  </Campo>
                  {error && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="text-[13px] text-erro bg-erro-fundo border border-erro rounded-lg px-3 py-2">
                      {error}
                    </motion.p>
                  )}
                  <Botao type="submit" variante="primario" carregando={loading} className="w-full justify-center">
                    <Mail className="w-4 h-4" /> Enviar link
                  </Botao>
                </form>
              </motion.div>
            )}

            {/* ── Forgot sent ── */}
            {screen === 'forgot-sent' && (
              <motion.div key="sent"
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease }} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-ok-fundo border border-ok
                                flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-7 h-7 text-ok" />
                </div>
                <h1 className="text-xl font-semibold text-ink mb-2">E-mail enviado!</h1>
                <p className="text-sm text-texto-mute leading-relaxed mb-2">
                  Verifique a caixa de entrada de <strong className="text-ink-sub">{email}</strong>.
                </p>
                <p className="text-[13px] text-texto-mute mb-8">
                  Clique no link do e-mail para criar sua nova senha. O link expira em 1 hora.
                </p>
                <button onClick={() => { setScreen('login'); setError(null) }}
                  className="text-sm text-laranja-texto hover:opacity-75 transition-opacity">
                  Voltar ao login
                </button>
              </motion.div>
            )}

          </AnimatePresence>

          <p className="mt-10 text-[13px] text-texto-mute text-center">
            Bridge HUB © {new Date().getFullYear()} — Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* ── Right: Visual (trilho — escuro nos dois temas) ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden"
        style={{ background: 'var(--trilho)', borderLeft: '1px solid var(--trilho-linha)' }}>

        {/* Orange glow blobs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'var(--laranja-suave)', filter: 'blur(100px)' }} />
        <div className="absolute -bottom-32 -left-16 w-[360px] h-[360px] rounded-full pointer-events-none"
          style={{ background: 'var(--laranja-suave)', filter: 'blur(80px)', opacity: 0.6 }} />

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(var(--trilho-texto) 1px, transparent 1px), linear-gradient(90deg, var(--trilho-texto) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-14 text-center gap-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease }}
            className="flex flex-col items-center gap-6 w-full max-w-xs"
          >
            {/* Logo oficial — troca por tema via CSS, sem flash (OS-017) */}
            <img
              src="/brand/bridge-horizontal-web.png"
              alt="Bridge Cultural Center"
              className="logo-login-claro max-h-36 max-w-[280px] w-full object-contain"
            />
            <img
              src="/brand/bridge-branco-web.png"
              alt="Bridge Cultural Center"
              className="logo-login-escuro max-h-36 max-w-[280px] w-full object-contain"
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
                    style={{ background: 'var(--laranja-suave)' }}>
                    <Check className="w-3 h-3" style={{ color: 'var(--laranja)' }} />
                  </div>
                  <span className="text-[13px]" style={{ color: 'var(--trilho-sub)' }}>
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
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-semibold"
            style={{
              background: 'var(--laranja-suave)',
              color:      'var(--laranja-texto)',
            }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--laranja)' }} />
            Powered by Bridge HUB
          </motion.div>
        </div>
      </div>
    </div>
  )
}

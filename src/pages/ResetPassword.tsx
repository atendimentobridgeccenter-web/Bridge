import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'

export default function ResetPassword() {
  const navigate = useNavigate()

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [ready,     setReady]     = useState(false)

  // Supabase fires PASSWORD_RECOVERY when the magic link is followed
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Also check if already in a recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('A senha deve ter no mínimo 8 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    setLoading(true)
    setError(null)
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateErr) { setError(updateErr.message); return }
    setDone(true)
    setTimeout(() => navigate('/admin', { replace: true }), 2500)
  }

  const ease = [0.16, 1, 0.3, 1] as const

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-6">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-lg font-semibold text-white tracking-tight">Bridge</span>
        </div>

        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20
                            flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Senha redefinida!</h1>
            <p className="text-sm text-zinc-500">Redirecionando para o painel...</p>
          </div>
        ) : !ready ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20
                            flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-7 h-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Link inválido ou expirado</h1>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
              Este link de redefinição já foi usado ou expirou.<br />
              Solicite um novo na tela de login.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Ir para o login
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-white mb-1.5">Criar nova senha</h1>
            <p className="text-sm text-zinc-500 mb-8">Escolha uma senha segura para a sua conta Bridge.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nova senha</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    autoFocus
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
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

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Confirmar senha</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  className={cn(
                    'w-full h-10 px-3 rounded-lg text-sm text-white placeholder:text-zinc-600',
                    'bg-zinc-800/80 border border-white/8',
                    'focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20',
                    'transition-all duration-150',
                  )}
                />
              </div>

              {/* Strength indicator */}
              {password && (
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-colors duration-300"
                      style={{
                        background: password.length >= i * 3
                          ? (password.length >= 12 ? '#34d399' : password.length >= 8 ? '#fbbf24' : '#f87171')
                          : 'rgba(255,255,255,0.08)',
                      }}
                    />
                  ))}
                </div>
              )}

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
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar nova senha'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}

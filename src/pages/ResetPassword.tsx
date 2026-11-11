import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import Campo from '@/components/ui/Campo'
import Botao from '@/components/ui/Botao'

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

  async function handleSubmit(e: FormEvent) {
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

  const inputCls = cn(
    'w-full min-h-[44px] rounded-controle border border-line bg-campo px-3.5',
    'text-[15px] text-texto placeholder:text-texto-mute outline-none transition-colors',
    'focus:border-[var(--laranja-acao)] focus:shadow-[0_0_0_3px_var(--laranja-suave)]',
  )

  return (
    <div className="ds min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--fundo)' }}>
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        {/* Logo — troca por tema via CSS, sem flash (OS-017) */}
        <div className="mb-10">
          <img
            src="/brand/bridge-horizontal-web.png"
            alt="Bridge Cultural Center"
            className="logo-login-claro h-8 object-contain"
          />
          <img
            src="/brand/bridge-branco-web.png"
            alt="Bridge Cultural Center"
            className="logo-login-escuro h-8 object-contain"
          />
        </div>

        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-ok-fundo border border-ok
                            flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-7 h-7 text-ok" />
            </div>
            <h1 className="text-xl font-semibold text-ink mb-2">Senha redefinida!</h1>
            <p className="text-sm text-texto-mute">Redirecionando para o painel...</p>
          </div>
        ) : !ready ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-atencao-fundo border border-atencao
                            flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-7 h-7 text-atencao" />
            </div>
            <h1 className="text-xl font-semibold text-ink mb-2">Link inválido ou expirado</h1>
            <p className="text-sm text-texto-mute mb-6 leading-relaxed">
              Este link de redefinição já foi usado ou expirou.<br />
              Solicite um novo na tela de login.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-laranja-texto hover:opacity-75 transition-opacity"
            >
              Ir para o login
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-ink mb-1.5">Criar nova senha</h1>
            <p className="text-sm text-texto-mute mb-8">Escolha uma senha segura para a sua conta Bridge.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-password" className="block text-[13px] font-medium text-texto-sub mb-1.5">Nova senha</label>
                <div className="relative">
                  <input
                    id="reset-password"
                    type={showPw ? 'text' : 'password'}
                    required
                    autoFocus
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className={cn(inputCls, 'pr-10')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-texto-mute hover:text-texto-sub"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Campo id="reset-confirm" rotulo="Confirmar senha" obrigatorio>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  className={inputCls}
                />
              </Campo>

              {/* Strength indicator */}
              {password && (
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div
                      key={i}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-colors duration-300',
                        password.length >= i * 3
                          ? (password.length >= 12 ? 'bg-ok' : password.length >= 8 ? 'bg-atencao' : 'bg-erro')
                          : 'bg-superficie-2',
                      )}
                    />
                  ))}
                </div>
              )}

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[13px] text-erro bg-erro-fundo border border-erro rounded-lg px-3 py-2"
                >
                  {error}
                </motion.p>
              )}

              <Botao type="submit" variante="primario" carregando={loading} className="w-full justify-center">
                Salvar nova senha
              </Botao>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}

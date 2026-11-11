import { useEffect } from 'react'
import { Outlet, useNavigate, NavLink } from 'react-router-dom'
import { CalendarDays, Users, LogOut, GraduationCap, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import { useRole } from '@/hooks/useRole'
import { useMyTeacherProfile } from '@/hooks/useTeacherPortal'
import ThemeToggle from '@/components/ui/ThemeToggle'
import {
  FUNDO, TRILHO, TRILHO_LINHA, TRILHO_TEXTO, TRILHO_SUB, TRILHO_ATIVO,
  SUPERFICIE, LARANJA_ACAO, ON_LARANJA, ATENCAO, ATENCAO_FUNDO,
} from '@/lib/theme'


const NAV = [
  { to: '/professor',        icon: CalendarDays, label: 'Minhas turmas', end: true  },
  { to: '/professor/alunos', icon: Users,        label: 'Meus alunos',   end: false },
]

export default function ProfessorLayout() {
  const navigate = useNavigate()
  const { ready, user, role } = useRole()
  const profile = useMyTeacherProfile()

  useEffect(() => {
    if (!ready) return
    if (!user) { navigate('/login', { replace: true }); return }
    // Admin pode abrir o portal para dar suporte; qualquer outro papel vai para o admin.
    if (role !== 'professor' && role !== 'admin') navigate('/admin', { replace: true })
  }, [ready, user, role, navigate])

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  if (!ready || !user) {
    return (
      <div className="ds min-h-screen flex items-center justify-center" style={{ background: FUNDO }}>
        <div className="w-7 h-7 rounded-full border-2 border-laranja border-t-transparent animate-spin" />
      </div>
    )
  }

  // Conta sem vínculo com ficha de professor: a RLS devolve tudo vazio, então é
  // melhor dizer o que falta do que mostrar um portal em branco.
  const unlinked = profile.isFetched && !profile.data

  return (
    <div className="ds flex flex-col h-screen overflow-hidden" style={{ background: FUNDO }}>
      <header className="h-14 shrink-0 flex items-center gap-4 px-5"
        style={{ borderBottom: `1px solid ${TRILHO_LINHA}`, background: TRILHO }}>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: LARANJA_ACAO }}>
            <GraduationCap className="w-4 h-4" style={{ color: ON_LARANJA }} />
          </div>
          <div className="hidden sm:block">
            <p className="text-[13px] font-semibold leading-tight" style={{ color: TRILHO_TEXTO }}>Bridge</p>
            <p className="text-[13px] leading-tight" style={{ color: TRILHO_SUB }}>Portal do professor</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 ml-2">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={cn(
                'px-3 py-1.5 rounded-xl text-[13px] font-medium flex items-center gap-1.5 transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foco)]',
              )}
              style={({ isActive }) => ({
                color: isActive ? TRILHO_TEXTO : TRILHO_SUB,
                background: isActive ? TRILHO_ATIVO : 'transparent',
              })}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] leading-tight" style={{ color: TRILHO_TEXTO }}>
              {profile.data?.name ?? user.email}
            </p>
            {role === 'admin' && (
              <p className="text-[13px] leading-tight text-laranja">
                vendo como administrador
              </p>
            )}
          </div>
          <ThemeToggle onRail />
          <button onClick={signOut} title="Sair" aria-label="Sair"
            className="p-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foco)]"
            style={{ color: TRILHO_SUB }}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto px-5 py-6 sm:px-8 sm:py-8">
        {unlinked ? (
          <div className="max-w-[460px] mx-auto mt-16 rounded-2xl p-6 flex flex-col gap-3"
            style={{ background: SUPERFICIE, border: `1px solid ${ATENCAO_FUNDO}`, boxShadow: 'var(--sombra-cartao)' }}>
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: ATENCAO }} />
              <p className="text-[14px] font-semibold text-ink">Conta ainda não vinculada</p>
            </div>
            <p className="text-[13px] text-ink-sub leading-relaxed">
              Esta conta de acesso não está ligada a nenhuma ficha de professor ativa,
              então não há turmas para mostrar.
            </p>
            <p className="text-[13px] text-ink-mute leading-relaxed">
              Peça à secretaria para abrir <strong className="text-ink-sub">Turmas → Professores</strong>,
              editar sua ficha e vinculá-la a este e-mail
              (<span className="text-ink-sub">{user.email}</span>).
            </p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  )
}

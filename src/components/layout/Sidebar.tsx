import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, Users, FileStack, Zap, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'

const NAV = [
  { to: '/admin',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/products', icon: Package,         label: 'Produtos'  },
  { to: '/admin/leads',    icon: Users,           label: 'Leads CRM' },
  { to: '/admin/builder',  icon: FileStack,       label: 'Pages'     },
]

export default function Sidebar() {
  const navigate = useNavigate()

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside
      className="w-60 shrink-0 flex flex-col h-full"
      style={{
        background: '#0A0A0A',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
          <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#EDEDED] leading-none">Bridge</p>
          <p className="text-[10px] text-[#52525B] mt-0.5 leading-none">Motor de Lançamentos</p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-widest px-2 mb-2">
          Menu
        </p>

        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) => cn(
              'group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150',
              isActive
                ? 'text-[#EDEDED]'
                : 'text-[#71717A] hover:text-[#EDEDED]',
            )}
            style={({ isActive }) => isActive
              ? { background: 'rgba(255,255,255,0.07)' }
              : undefined
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator */}
                {isActive && (
                  <span
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-violet-500"
                  />
                )}
                <Icon className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-violet-400' : 'text-[#52525B] group-hover:text-[#A1A1AA]',
                )} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />

      {/* Sign out */}
      <div className="px-3 py-4">
        <button
          onClick={signOut}
          className="group flex items-center gap-3 px-3 py-2 rounded-md w-full text-sm font-medium
                     text-[#52525B] hover:text-red-400 transition-all duration-150"
          style={{ background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut className="w-4 h-4 shrink-0 group-hover:text-red-400 transition-colors" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}

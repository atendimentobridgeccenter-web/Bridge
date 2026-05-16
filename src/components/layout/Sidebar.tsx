import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Users,
  Zap, LogOut, Settings, ChevronDown,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'

const NAV_MAIN = [
  { to: '/admin',          icon: LayoutDashboard, label: 'Dashboard',  end: true },
  { to: '/admin/leads',    icon: Users,           label: 'Leads CRM',  end: false },
  { to: '/admin/products', icon: Package,         label: 'Produtos',   end: false },
]

const NAV_BOTTOM = [
  { to: '/admin/settings', icon: Settings, label: 'Configurações', end: false },
]

function NavItem({ to, icon: Icon, label, end }: { to: string; icon: React.ElementType; label: string; end: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => cn(
        'group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-100',
        isActive
          ? 'bg-white/8 text-white'
          : 'text-[#71717A] hover:text-[#EDEDED] hover:bg-white/4',
      )}
    >
      {({ isActive }) => (
        <>
          <Icon className={cn(
            'w-[15px] h-[15px] shrink-0 transition-colors',
            isActive ? 'text-white' : 'text-[#52525B] group-hover:text-[#A1A1AA]',
          )} />
          <span className="truncate">{label}</span>
          {isActive && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside
      className="w-[220px] shrink-0 flex flex-col h-full select-none"
      style={{ background: '#111111', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Workspace selector */}
      <div
        className="flex items-center gap-2.5 px-4 py-4 cursor-pointer group"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/40">
          <Zap className="w-3.5 h-3.5 text-white fill-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#EDEDED] leading-none truncate">Bridge</p>
          <p className="text-[10px] text-[#52525B] mt-0.5 leading-none truncate">Motor de Lançamentos</p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[#52525B] group-hover:text-[#71717A] transition-colors shrink-0" />
      </div>

      {/* Main nav */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] font-semibold text-[#3F3F46] uppercase tracking-widest px-3 mb-1">
            Principal
          </p>
          {NAV_MAIN.map(item => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>

        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] font-semibold text-[#3F3F46] uppercase tracking-widest px-3 mb-1">
            Sistema
          </p>
          {NAV_BOTTOM.map(item => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </div>

      {/* User / sign-out */}
      <div
        className="px-2.5 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={signOut}
          className="group flex items-center gap-3 w-full px-3 py-2 rounded-lg
                     text-[13px] font-medium text-[#52525B] hover:text-red-400
                     hover:bg-red-500/8 transition-all duration-100"
        >
          <LogOut className="w-[15px] h-[15px] shrink-0" />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  )
}

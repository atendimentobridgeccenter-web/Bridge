import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Users, UserCheck,
  LogOut, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'

// ── Bridge logo (shape from favicon, orange) ──────────────────

function BridgeLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 46" fill="none">
      <path
        fill="white"
        d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
      />
    </svg>
  )
}

// ── Nav items ─────────────────────────────────────────────────

const NAV_MAIN = [
  { to: '/admin',            icon: LayoutDashboard, label: 'Dashboard', end: true  },
  { to: '/admin/contatos',   icon: UserCheck,       label: 'Contatos',  end: false },
  { to: '/admin/leads',      icon: Users,           label: 'Leads CRM', end: false },
  { to: '/admin/products',   icon: Package,         label: 'Produtos',  end: false },
]

const NAV_BOTTOM = [
  { to: '/admin/settings', icon: Settings, label: 'Configurações', end: false },
]

function NavItem({
  to, icon: Icon, label, end, collapsed,
}: {
  to: string; icon: React.ElementType; label: string; end: boolean; collapsed: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) => cn(
        'group flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-150',
        collapsed ? 'px-0 py-2 justify-center' : 'px-3 py-2',
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
          {!collapsed && <span className="truncate flex-1">{label}</span>}
          {!collapsed && isActive && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: '#E8521A' }} />
          )}
        </>
      )}
    </NavLink>
  )
}

// ── Sidebar ───────────────────────────────────────────────────

export default function Sidebar() {
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('sidebar:collapsed') === 'true'
  )

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar:collapsed', String(next))
  }

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside
      className="shrink-0 flex flex-col h-full select-none transition-all duration-200"
      style={{
        width:       collapsed ? 64 : 220,
        background:  '#111111',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo + name + toggle */}
      <div
        className="flex items-center gap-2.5 px-3 py-4 relative"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', minHeight: 56 }}
      >
        {/* Logo badge */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: '#E8521A', boxShadow: '0 4px 12px rgba(232,82,26,0.35)' }}
        >
          <BridgeLogo size={15} />
        </div>

        {/* Name (hidden when collapsed) */}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#EDEDED] leading-none truncate">
              Bridge HUB
            </p>
            <p className="text-[10px] mt-0.5 leading-none truncate" style={{ color: '#52525B' }}>
              Motor de Lançamentos
            </p>
          </div>
        )}

        {/* Collapse / expand toggle */}
        <button
          onClick={toggle}
          className="flex items-center justify-center rounded-md transition-all duration-150 shrink-0"
          style={{
            width: 22, height: 22,
            background: 'rgba(255,255,255,0.04)',
            border:     '1px solid rgba(255,255,255,0.07)',
            color:      '#52525B',
            marginLeft: collapsed ? 'auto' : undefined,
          }}
          title={collapsed ? 'Expandir' : 'Recolher'}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#52525B'
          }}
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" />
            : <ChevronLeft  className="w-3 h-3" />}
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-4"
        style={{ paddingLeft: collapsed ? 8 : 10, paddingRight: collapsed ? 8 : 10 }}>
        <div className="flex flex-col gap-0.5">
          {!collapsed && (
            <p className="text-[10px] font-semibold text-[#3F3F46] uppercase tracking-widest px-3 mb-1">
              Principal
            </p>
          )}
          {NAV_MAIN.map(item => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </div>

        <div className="flex flex-col gap-0.5">
          {!collapsed && (
            <p className="text-[10px] font-semibold text-[#3F3F46] uppercase tracking-widest px-3 mb-1">
              Sistema
            </p>
          )}
          {NAV_BOTTOM.map(item => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </div>
      </div>

      {/* Sign out */}
      <div
        className="py-3"
        style={{
          borderTop:    '1px solid rgba(255,255,255,0.06)',
          paddingLeft:  collapsed ? 8 : 10,
          paddingRight: collapsed ? 8 : 10,
        }}
      >
        <button
          onClick={signOut}
          title={collapsed ? 'Sair da conta' : undefined}
          className={cn(
            'group flex items-center gap-3 w-full rounded-lg text-[13px] font-medium',
            'text-[#52525B] hover:text-red-400 hover:bg-red-500/8 transition-all duration-100',
            collapsed ? 'px-0 py-2 justify-center' : 'px-3 py-2',
          )}
        >
          <LogOut className="w-[15px] h-[15px] shrink-0" />
          {!collapsed && <span>Sair da conta</span>}
        </button>
      </div>
    </aside>
  )
}

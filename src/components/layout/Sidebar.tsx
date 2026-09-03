import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Users, LogOut, Settings,
  ChevronLeft, ChevronRight, GraduationCap, CreditCard,
  ReceiptText, Ticket, KeyRound, Columns, ClipboardList,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'

// ── Bridge logo ───────────────────────────────────────────────

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

// ── Nav structure ─────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Pessoas',
    items: [
      { to: '/admin/pessoas',   icon: Users,          label: 'Central de Clientes', end: false },
      { to: '/admin/leads',     icon: ClipboardList,  label: 'Leads CRM',           end: false },
      { to: '/admin/pipeline',  icon: Columns,        label: 'Pipeline',            end: false },
      { to: '/admin/alunos',    icon: GraduationCap,  label: 'Alunos',              end: false },
    ],
  },
  {
    label: 'Produtos',
    items: [
      { to: '/admin/products', icon: Package,  label: 'Biblioteca',  end: false },
      { to: '/admin/acessos',  icon: KeyRound, label: 'Acessos',     end: false, badge: 'Novo' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { to: '/admin/financeiro', icon: ReceiptText, label: 'Receita',  end: false, badge: 'Novo' },
      { to: '/admin/cupons',     icon: Ticket,      label: 'Cupons',   end: false },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/admin/settings', icon: Settings, label: 'Configurações', end: false },
    ],
  },
]

// ── NavItem ───────────────────────────────────────────────────

function NavItem({
  to, icon: Icon, label, end, collapsed, badge,
}: {
  to: string; icon: React.ElementType; label: string
  end: boolean; collapsed: boolean; badge?: string
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) => cn(
        'group relative flex items-center gap-2.5 rounded-lg text-[12.5px] font-medium',
        'transition-all duration-150 cursor-pointer',
        collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-[7px]',
        isActive
          ? 'bg-white/8 text-[#EDEDED]'
          : 'text-[#5A5C6A] hover:text-[#C4C6D0] hover:bg-white/[0.035]',
      )}
    >
      {({ isActive }) => (
        <>
          {/* Active left bar */}
          {isActive && !collapsed && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
              style={{ background: '#E8521A' }}
            />
          )}

          <Icon className={cn(
            'w-[14px] h-[14px] shrink-0 transition-colors',
            isActive
              ? 'text-[#E8521A]'
              : 'text-[#404252] group-hover:text-[#7B7E92]',
          )} />

          {!collapsed && (
            <>
              <span className="truncate flex-1">{label}</span>
              {badge && (
                <span
                  className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(109,74,255,0.18)', color: '#9474FF' }}
                >
                  {badge}
                </span>
              )}
            </>
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

  const px = collapsed ? 8 : 10

  return (
    <aside
      className="shrink-0 flex flex-col h-full select-none"
      style={{
        width:       collapsed ? 60 : 216,
        background:  '#0E0F13',
        borderRight: '1px solid rgba(255,255,255,0.055)',
        transition:  'width 200ms cubic-bezier(.4,0,.2,1)',
      }}
    >
      {/* ── Logo bar ── */}
      <div
        className="flex items-center gap-2.5 relative"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.055)',
          minHeight: 52,
          paddingLeft:  px,
          paddingRight: px,
        }}
      >
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ background: '#E8521A', boxShadow: '0 2px 8px rgba(232,82,26,0.4)' }}
        >
          <BridgeLogo size={13} />
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold text-[#DADCE6] leading-none truncate">Bridge HUB</p>
            <p className="text-[9.5px] mt-0.5 leading-none truncate" style={{ color: '#404252' }}>
              Motor de Lançamentos
            </p>
          </div>
        )}

        <button
          onClick={toggle}
          className="flex items-center justify-center rounded-md transition-all duration-150 shrink-0"
          style={{
            width: 20, height: 20,
            background: 'rgba(255,255,255,0.03)',
            border:     '1px solid rgba(255,255,255,0.06)',
            color:      '#404252',
            marginLeft: collapsed ? 'auto' : undefined,
          }}
          title={collapsed ? 'Expandir' : 'Recolher'}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#9194A8'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#404252'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'
          }}
        >
          {collapsed
            ? <ChevronRight className="w-2.5 h-2.5" />
            : <ChevronLeft  className="w-2.5 h-2.5" />}
        </button>
      </div>

      {/* ── Nav groups ── */}
      <div
        className="flex-1 overflow-y-auto py-2.5 flex flex-col gap-0.5"
        style={{ paddingLeft: px, paddingRight: px }}
      >
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
            {/* Group label */}
            {group.label && !collapsed && (
              <p
                className="text-[9.5px] font-semibold uppercase tracking-[0.1em] px-3 mb-0.5"
                style={{ color: '#2E3042', marginTop: gi > 0 ? 8 : 0 }}
              >
                {group.label}
              </p>
            )}
            {group.label && collapsed && gi > 0 && (
              <div className="my-1.5 mx-1.5 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
            )}

            <div className="flex flex-col gap-0.5">
              {group.items.map(item => (
                <NavItem key={item.to} {...item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Sign out ── */}
      <div
        className="py-2.5"
        style={{
          borderTop:    '1px solid rgba(255,255,255,0.055)',
          paddingLeft:  px,
          paddingRight: px,
        }}
      >
        <button
          onClick={signOut}
          title={collapsed ? 'Sair da conta' : undefined}
          className={cn(
            'group flex items-center gap-2.5 w-full rounded-lg text-[12.5px] font-medium cursor-pointer',
            'text-[#3E404F] hover:text-red-400 hover:bg-red-500/[0.07] transition-all duration-150',
            collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-[7px]',
          )}
        >
          <LogOut className="w-[14px] h-[14px] shrink-0" />
          {!collapsed && <span>Sair da conta</span>}
        </button>
      </div>
    </aside>
  )
}

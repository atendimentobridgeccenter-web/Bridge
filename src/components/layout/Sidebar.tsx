import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Users, LogOut, Settings,
  ChevronLeft, ChevronRight, GraduationCap, ReceiptText, Ticket, KeyRound, Columns, ClipboardList,
  CalendarDays, ClipboardCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import { TRILHO, TRILHO_LINHA } from '@/lib/theme'

// ── Nav structure ─────────────────────────────────────────────
// Agrupado por área (OS-017), usando só as rotas que já existem hoje —
// o `to`/`end`/ícone de cada item não mudou, só o rótulo e o grupo.

const NAV_GROUPS = [
  {
    label: 'Hoje',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { to: '/admin/pessoas',  icon: Users,         label: 'Central de Clientes', end: false },
      { to: '/admin/leads',    icon: ClipboardList, label: 'Leads CRM',           end: false },
      { to: '/admin/pipeline', icon: Columns,       label: 'Pipeline',            end: false },
    ],
  },
  {
    label: 'Escola',
    items: [
      { to: '/admin/alunos',     icon: GraduationCap,  label: 'Alunos',     end: false },
      { to: '/admin/turmas',     icon: CalendarDays,   label: 'Turmas',     end: false },
      { to: '/admin/matriculas', icon: ClipboardCheck, label: 'Matrículas', end: false },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { to: '/admin/financeiro', icon: ReceiptText, label: 'Receita', end: false },
      { to: '/admin/cupons',     icon: Ticket,       label: 'Cupons',  end: false },
    ],
  },
  {
    label: 'Cursos',
    items: [
      { to: '/admin/products', icon: Package,  label: 'Cursos e páginas', end: false },
      { to: '/admin/acessos',  icon: KeyRound, label: 'Área de membros',  end: false },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { to: '/admin/settings', icon: Settings, label: 'Configurações', end: false },
    ],
  },
]

// ── NavItem ───────────────────────────────────────────────────

function NavItem({
  to, icon: Icon, label, end, collapsed,
}: {
  to: string; icon: React.ElementType; label: string
  end: boolean; collapsed: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) => cn(
        'group relative flex items-center gap-2.5 rounded-[var(--radius-controle)] text-[13px] font-medium',
        'transition-all duration-150 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foco)]',
        collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-[9px]',
        isActive
          ? 'bg-[var(--trilho-ativo)] text-[var(--trilho-texto)] font-semibold'
          : 'text-[var(--trilho-sub)] hover:text-[var(--trilho-texto)] hover:bg-[var(--trilho-ativo)]',
      )}
    >
      {({ isActive }) => (
        <>
          {/* Traço ativo — o marcador do design system, não uma bolinha */}
          {isActive && (
            <span
              className="absolute left-0 top-[9px] bottom-[9px] w-1 rounded-[0_3px_3px_0]"
              style={{ background: 'var(--laranja)' }}
            />
          )}

          <Icon
            className="w-[18px] h-[18px] shrink-0 transition-colors"
            style={{ color: isActive ? 'var(--laranja)' : undefined }}
          />

          {!collapsed && <span className="truncate flex-1">{label}</span>}
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

  const px = collapsed ? 8 : 14

  return (
    <aside
      className="shrink-0 flex flex-col h-full select-none"
      style={{
        width:       collapsed ? 60 : 232,
        background:  TRILHO,
        borderRight: `1px solid ${TRILHO_LINHA}`,
        transition:  'width 200ms cubic-bezier(.4,0,.2,1)',
      }}
    >
      {/* ── Marca ── */}
      <div
        className="flex items-center gap-2.5 relative"
        style={{
          borderBottom: `1px solid ${TRILHO_LINHA}`,
          minHeight: 64,
          paddingLeft:  px,
          paddingRight: px,
          paddingTop: 14,
          paddingBottom: 14,
        }}
      >
        <img
          src="/brand/bridge-simbolo-256.png"
          alt="Bridge"
          className="shrink-0"
          style={{ width: 36, height: 36 }}
        />

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p
              className="leading-tight truncate"
              style={{ font: '700 15px/1.1 var(--font-titulo)', color: 'var(--trilho-texto)' }}
            >
              BRIDGE
            </p>
            <p
              className="leading-tight truncate mt-0.5"
              style={{ font: '500 13px/1.3 var(--font-texto)', color: 'var(--trilho-sub)' }}
            >
              CULTURAL CENTER
            </p>
          </div>
        )}

        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!collapsed}
          className={cn(
            'flex items-center justify-center rounded-md shrink-0 transition-colors duration-150',
            'text-[var(--trilho-sub)] hover:text-[var(--trilho-texto)] hover:bg-[var(--trilho-ativo)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foco)]',
          )}
          style={{
            width: 22, height: 22,
            marginLeft: collapsed ? 'auto' : undefined,
          }}
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" />
            : <ChevronLeft  className="w-3 h-3" />}
        </button>
      </div>

      {/* ── Grupos de navegação ── */}
      <nav
        className="flex-1 overflow-y-auto py-3 flex flex-col gap-4"
        style={{ paddingLeft: px, paddingRight: px }}
        aria-label="Principal"
      >
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {!collapsed && (
              <p
                className="px-2.5 mb-1"
                style={{ font: '500 13px/16px var(--font-texto)', color: 'var(--trilho-sub)', opacity: 0.8 }}
              >
                {group.label}
              </p>
            )}
            {collapsed && gi > 0 && (
              <div className="my-1.5 mx-1.5 h-px" style={{ background: 'var(--trilho-linha)' }} />
            )}

            <div className="flex flex-col gap-0.5">
              {group.items.map(item => (
                <NavItem key={item.to} {...item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Sair ── */}
      <div
        className="py-3"
        style={{
          borderTop:    `1px solid ${TRILHO_LINHA}`,
          paddingLeft:  px,
          paddingRight: px,
        }}
      >
        <button
          onClick={signOut}
          title={collapsed ? 'Sair da conta' : undefined}
          className={cn(
            'group flex items-center gap-2.5 w-full rounded-[var(--radius-controle)] text-[13px] font-medium cursor-pointer',
            'text-[var(--trilho-sub)] hover:text-[var(--erro)] hover:bg-[var(--trilho-ativo)] transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foco)]',
            collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-[9px]',
          )}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Sair da conta</span>}
        </button>
      </div>
    </aside>
  )
}

import { Outlet, useLocation, NavLink } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import Sidebar from './Sidebar'

const TITLES: Record<string, string> = {
  '/admin':          'Dashboard',
  '/admin/leads':    'Leads CRM',
  '/admin/products': 'Produtos',
  '/admin/builder':  'Páginas',
  '/admin/settings': 'Configurações',
}

function Topbar() {
  const { pathname } = useLocation()

  const title = Object.entries(TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => pathname === path || pathname.startsWith(path + '/'))?.[1]
    ?? 'Admin'

  return (
    <header
      className="h-12 shrink-0 flex items-center gap-4 px-6"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#111111' }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-[#52525B]">Bridge</span>
        <span className="text-[#3F3F46]">/</span>
        <span className="text-[#EDEDED] font-medium">{title}</span>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-[#52525B]
                   hover:text-[#A1A1AA] transition-colors"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Search className="w-3.5 h-3.5" />
        <span>Buscar...</span>
        <span
          className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#52525B' }}
        >
          ⌘K
        </span>
      </button>

      {/* Notifications */}
      <button
        className="relative w-8 h-8 rounded-lg flex items-center justify-center
                   text-[#52525B] hover:text-[#A1A1AA] hover:bg-white/4 transition-all"
      >
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-500" />
      </button>

      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}
      >
        E
      </div>
    </header>
  )
}

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0A0A0A' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

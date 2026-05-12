import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FileStack, Package, Users,
  Zap, LogOut, ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'

const NAV = [
  { to: '/admin',           icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/admin/products',  icon: Package,         label: 'Produtos'    },
  { to: '/admin/leads',     icon: Users,           label: 'Leads CRM'   },
  { to: '/admin/builder',   icon: FileStack,       label: 'Pages'       },
]

export default function Sidebar() {
  const navigate  = useNavigate()
  const [tip, setTip] = useState<string | null>(null)

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside className="w-14 shrink-0 flex flex-col items-center py-4 gap-1
                      bg-zinc-900 border-r border-white/8 relative z-10">
      {/* Logo */}
      <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-900/50">
        <Zap className="w-4 h-4 text-white fill-white" />
      </div>

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-1 flex-1 w-full px-2">
        {NAV.map(({ to, icon: Icon, label }) => (
          <div
            key={to}
            className="relative w-full"
            onMouseEnter={() => setTip(label)}
            onMouseLeave={() => setTip(null)}
          >
            <NavLink
              to={to}
              end={to === '/admin'}
              className={({ isActive }) => cn(
                'flex items-center justify-center w-full h-9 rounded-lg transition-all duration-150',
                isActive
                  ? 'bg-violet-600/20 text-violet-400'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/6',
              )}
            >
              <Icon className="w-4 h-4" />
            </NavLink>

            {/* Tooltip */}
            <AnimatePresence>
              {tip === label && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50
                             px-2.5 py-1 rounded-lg bg-zinc-800 border border-white/10
                             text-xs font-medium text-white whitespace-nowrap shadow-xl"
                >
                  {label}
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2
                                   rotate-45 bg-zinc-800 border-l border-b border-white/10" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div
        className="relative w-full px-2"
        onMouseEnter={() => setTip('Sair')}
        onMouseLeave={() => setTip(null)}
      >
        <button
          onClick={signOut}
          className="flex items-center justify-center w-full h-9 rounded-lg
                     text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>
        <AnimatePresence>
          {tip === 'Sair' && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50
                         px-2.5 py-1 rounded-lg bg-zinc-800 border border-white/10
                         text-xs font-medium text-zinc-300 whitespace-nowrap shadow-xl"
            >
              Sair
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}

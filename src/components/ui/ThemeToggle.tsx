import { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useTheme, THEME_OPTIONS } from '@/lib/useTheme'
import type { ThemeChoice } from '@/lib/useTheme'
import { BG_DROP, BORDER, BORDER2, SHADOW_POP, ACCENT } from '@/lib/theme'

const ICON: Record<ThemeChoice, React.ElementType> = {
  system: Monitor,
  light:  Sun,
  dark:   Moon,
}

/**
 * Seletor de tema.
 *
 * `onRail` troca as cores do gatilho para as do rail escuro: o mesmo botão
 * aparece na topbar clara do admin e no header escuro do portal, e `text-ink`
 * ficaria invisível no segundo caso.
 */
export default function ThemeToggle({ onRail = false }: { onRail?: boolean }) {
  const { choice, setChoice, resolved } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // O ícone mostra o tema em vigor, não a escolha: em "Sistema" o usuário
  // quer ver se deu claro ou escuro.
  const Icon = choice === 'system' ? ICON[resolved] : ICON[choice]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title={`Tema: ${THEME_OPTIONS.find(o => o.value === choice)?.label}`}
        aria-label="Alternar tema"
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
          onRail
            ? 'text-rail-mute hover:text-rail hover:bg-white/8'
            : 'text-ink-mute hover:text-ink hover:bg-tint/6',
        )}
      >
        <Icon className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-[148px] rounded-xl overflow-hidden z-50 py-1"
          style={{ background: BG_DROP, border: `1px solid ${BORDER}`, boxShadow: SHADOW_POP }}
        >
          {THEME_OPTIONS.map(opt => {
            const OptIcon = ICON[opt.value]
            const active = choice === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => { setChoice(opt.value); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-left transition-colors hover:bg-tint/6 text-ink-sub"
                style={active ? { color: ACCENT } : undefined}
              >
                <OptIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">{opt.label}</span>
                {active && <Check className="w-3 h-3 shrink-0" />}
              </button>
            )
          })}
          <p
            className="text-[10.5px] text-ink-faint px-3 pt-2 pb-1 leading-snug"
            style={{ borderTop: `1px solid ${BORDER2}`, marginTop: 4 }}
          >
            "Sistema" acompanha a preferência do seu aparelho.
          </p>
        </div>
      )}
    </div>
  )
}

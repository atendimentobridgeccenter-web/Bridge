import { useCallback, useEffect, useState } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'bridge:theme'

export const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light',  label: 'Claro' },
  { value: 'dark',   label: 'Escuro' },
]

/**
 * Aplica a escolha no <html>.
 *
 * 'system' REMOVE o atributo em vez de escrever um valor: é a ausência de
 * data-theme que deixa a media query prefers-color-scheme decidir. Escrever
 * data-theme="system" faria o CSS cair no tema claro sempre.
 */
export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
}

export function readStoredTheme(): ThemeChoice {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // Janela privada ou armazenamento bloqueado: cai no padrão do sistema.
  }
  return 'system'
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readStoredTheme)

  // Qual tema está valendo de fato — o seletor mostra "Sistema", mas o ícone
  // precisa refletir se isso resultou em claro ou escuro.
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    choice === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : choice,
  )

  useEffect(() => {
    applyTheme(choice)
    try { localStorage.setItem(STORAGE_KEY, choice) } catch { /* sem persistência */ }

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () =>
      setResolved(choice === 'system' ? (mq.matches ? 'dark' : 'light') : choice)

    update()
    // Em 'system', acompanhar a troca do sistema operacional em tempo real.
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [choice])

  const cycle = useCallback(() => {
    setChoice(c => (c === 'system' ? 'light' : c === 'light' ? 'dark' : 'system'))
  }, [])

  return { choice, setChoice, resolved, cycle }
}

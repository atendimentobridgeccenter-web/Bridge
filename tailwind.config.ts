import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Apontam para as variáveis de index.css para que as classes do
        // Tailwind acompanhem a troca de tema junto com os tokens do theme.ts.
        base:        'var(--bg-base)',
        surface:     'var(--bg-surface)',
        'surface-2': 'var(--bg-surface-2)',
        'surface-3': 'var(--bg-input)',

        // Texto. Substituem o text-white/NN do tema escuro antigo, que ficava
        // invisível sobre card branco.
        ink: {
          DEFAULT: 'var(--ink)',
          sub:     'var(--ink-sub)',
          mute:    'var(--ink-mute)',
          faint:   'var(--ink-faint)',
          ghost:   'var(--ink-ghost)',
        },

        // Texto sobre o rail escuro. Permanece claro nos dois temas.
        rail: {
          DEFAULT: 'var(--rail-ink)',
          sub:     'var(--rail-ink-sub)',
          mute:    'var(--rail-ink-mute)',
          faint:   'var(--rail-ink-faint)',
        },

        // Tinta de camada. Substitui bg-white/N e border-white/N, que ficavam
        // invisíveis sobre branco. Vira com o tema.
        tint: 'rgb(var(--tint) / <alpha-value>)',

        line: {
          DEFAULT: 'var(--border)',
          soft:    'var(--border-2)',
          strong:  'var(--border-hover)',
        },

        brand: {
          DEFAULT: 'var(--accent)',
          dim:     'var(--accent-dim)',
        },
      },
      opacity: {
        '2':  '0.02',
        '3':  '0.03',
        '4':  '0.04',
        '6':  '0.06',
        '7':  '0.07',
        '8':  '0.08',
        '12': '0.12',
        '14': '0.14',
        '15': '0.15',
        '16': '0.16',
        '18': '0.18',
        '35': '0.35',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config

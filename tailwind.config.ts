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
        // OS-015: as variáveis em si agora vêm do design system (aliases em
        // index.css); as chaves do Tailwind abaixo continuam as mesmas.
        base:        'var(--bg-base)',
        surface:     'var(--bg-surface)',
        'surface-2': 'var(--bg-surface-2)',
        'surface-3': 'var(--bg-input)',

        // Nomes novos do design system (docs/design-system/tokens.css),
        // para uso direto em classes Tailwind em código novo.
        fundo:          'var(--fundo)',
        superficie:     'var(--superficie)',
        'superficie-2': 'var(--superficie-2)',
        campo:          'var(--campo)',
        trilho: {
          DEFAULT: 'var(--trilho)',
          ativo:   'var(--trilho-ativo)',
          linha:   'var(--trilho-linha)',
          texto:   'var(--trilho-texto)',
          sub:     'var(--trilho-sub)',
        },
        texto: {
          DEFAULT: 'var(--texto)',
          sub:     'var(--texto-sub)',
          mute:    'var(--texto-mute)',
        },
        laranja: {
          DEFAULT: 'var(--laranja)',
          acao:    'var(--laranja-acao)',
          'acao-hover': 'var(--laranja-acao-hover)',
          texto:   'var(--laranja-texto)',
          suave:   'var(--laranja-suave)',
        },
        'on-laranja': 'var(--on-laranja)',
        ok:      { DEFAULT: 'var(--ok)', fundo: 'var(--ok-fundo)' },
        atencao: { DEFAULT: 'var(--atencao)', fundo: 'var(--atencao-fundo)' },
        erro:    { DEFAULT: 'var(--erro)', fundo: 'var(--erro-fundo)' },

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
      borderRadius: {
        controle: 'var(--radius-controle)',
        cartao:   'var(--radius-cartao)',
        grande:   'var(--radius-grande)',
        pilula:   'var(--radius-pilula)',
      },
      fontFamily: {
        // Gate 1 (OS-015): sans continua Plus Jakarta Sans — é o padrão das
        // páginas públicas, que esta OS não toca. A classe .ds (index.css)
        // troca --font-sans por IBM Plex Sans JP dentro do admin, do portal
        // do professor e do login. 'titulo' e 'texto' abaixo são para uso
        // explícito (className="font-titulo") onde fizer sentido citar a
        // fonte do design system diretamente.
        sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        titulo: ['Noto Serif JP', 'Georgia', 'serif'],
        texto:  ['IBM Plex Sans JP', 'Noto Sans JP', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config

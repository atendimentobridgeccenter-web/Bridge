import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base:        '#0B0C10',
        surface:     '#14151B',
        'surface-2': '#191B22',
        'surface-3': '#1C1E27',
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
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config

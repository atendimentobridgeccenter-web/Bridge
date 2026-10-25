// ── Tokens de design do admin ───────────────────────────────────
//
// Fonte única das cores de superfície usadas nas telas do admin.
// Antes, cada página redeclarava BG_PAGE/BG_CARD/BORDER com valores
// levemente diferentes (#0D0E12 vs #0F1117, #13151A vs #1A1C23...),
// o que fazia o preto "piscar" de tom ao navegar entre telas — o
// motivo nº 1 do admin parecer remendado em vez de um produto coeso.
// Daqui em diante, toda página importa estes nomes em vez de
// redeclarar os valores.

export const BG_PAGE  = '#0B0C10'   // fundo da página (por trás de tudo)
export const BG_SIDEBAR = '#0E0F13'  // rail de navegação — um tom mais escuro que a página, de propósito
export const BG_CARD  = '#14151B'   // superfície padrão (cards, painéis)
export const BG_CARD2 = '#191B22'   // superfície aninhada (card dentro de card)
export const BG_INPUT = '#0F1014'   // campos de formulário (levemente recuados)
export const BG_DROP  = '#1C1E27'   // overlays elevados (dropdown, modal, busca)

export const BORDER       = 'rgba(255,255,255,0.07)'
export const BORDER2      = 'rgba(255,255,255,0.05)'
export const BORDER_HOVER = 'rgba(255,255,255,0.14)'

export const ACCENT     = '#E8521A'
export const ACCENT_DIM = 'rgba(232,82,26,0.12)'

// Semânticas — mesmos valores já usados ad hoc nas páginas, agora nomeados
export const SUCCESS = '#34D399'
export const WARNING = '#FBBF24'
export const DANGER  = '#F87171'
export const INFO    = '#60A5FA'

// ── Tokens de design do admin ───────────────────────────────────
//
// Fonte única das cores de superfície usadas nas telas do admin.
// Direção: claro, cards brancos com sombra suave e cantos generosos,
// rail de navegação escuro como âncora de marca. Referência: SaaS
// moderno e acolhedor (não mais o "console escuro").

export const BG_PAGE  = '#F5F6FA'   // fundo da área de conteúdo
export const BG_SIDEBAR = '#0E0F13'  // rail de navegação — permanece escuro, ancora a marca
export const SIDEBAR_BORDER = 'rgba(255,255,255,0.07)'  // divisores dentro do rail escuro

export const BG_CARD  = '#FFFFFF'   // superfície padrão (cards, painéis)
export const BG_CARD2 = '#F7F8FC'   // superfície aninhada (card dentro de card)
export const BG_INPUT = '#F3F4F8'   // campos de formulário
export const BG_DROP  = '#FFFFFF'   // overlays elevados (dropdown, modal, busca) — ganham sombra, não fundo escuro

export const BORDER       = 'rgba(15,23,42,0.08)'
export const BORDER2      = 'rgba(15,23,42,0.06)'
export const BORDER_HOVER = 'rgba(15,23,42,0.16)'

export const ACCENT        = '#E8521A'
export const ACCENT_DIM    = 'rgba(232,82,26,0.12)'
export const ACCENT_GRADIENT = 'linear-gradient(135deg, #FF7A3D 0%, #D6450F 100%)'

export const SHADOW_CARD = '0 1px 2px rgba(15,23,42,0.04), 0 12px 28px -10px rgba(15,23,42,0.12)'
export const SHADOW_POP  = '0 4px 10px rgba(15,23,42,0.06), 0 20px 40px -12px rgba(15,23,42,0.18)'

// Texto
export const INK      = '#12131A'   // texto primário
export const INK_SUB  = '#5B6170'   // texto secundário
export const INK_MUTE = '#8A90A0'   // texto terciário / legendas
export const INK_FAINT= '#B4B8C4'   // placeholders, loading

// Semânticas — pastel sobre branco (pílulas de status)
export const SUCCESS      = '#0F9D66'
export const SUCCESS_BG   = 'rgba(16,185,129,0.12)'
export const WARNING      = '#B45309'
export const WARNING_BG   = 'rgba(245,158,11,0.14)'
export const DANGER       = '#DC2626'
export const DANGER_BG    = 'rgba(239,68,68,0.12)'
export const INFO         = '#4F46E5'
export const INFO_BG      = 'rgba(99,102,241,0.12)'

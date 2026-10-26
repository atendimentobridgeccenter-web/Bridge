// ── Tokens de design do admin ───────────────────────────────────
//
// Fonte única das cores usadas nas telas do admin.
//
// Os valores são `var(--token)` e não hexadecimal: as cores reais vivem em
// index.css, em duas paletas (clara e escura). Como todo `style={{ background:
// BG_CARD }}` espalhado pelas telas resolve a variável em tempo de render, virar
// o tema é só trocar o atributo data-theme no <html> — nenhuma tela precisa
// saber que existe tema.
//
// Direção do tema claro: cards brancos com sombra suave e cantos generosos,
// rail de navegação escuro como âncora de marca.
//
// ATENÇÃO: não concatene alpha nestes tokens (`${ACCENT}14` não funciona com
// var()). Para acento translúcido use ACCENT_DIM, e para as pílulas de status
// use os pares SUCCESS/SUCCESS_BG.

export const BG_PAGE       = 'var(--bg-base)'
export const BG_SIDEBAR    = 'var(--bg-sidebar)'
export const SIDEBAR_BORDER = 'var(--sidebar-border)'

// Texto sobre o rail escuro — claro nos dois temas, ao contrário de INK
export const RAIL_INK       = 'var(--rail-ink)'
export const RAIL_INK_SUB   = 'var(--rail-ink-sub)'
export const RAIL_INK_MUTE  = 'var(--rail-ink-mute)'

export const BG_CARD  = 'var(--bg-surface)'
export const BG_CARD2 = 'var(--bg-surface-2)'
export const BG_INPUT = 'var(--bg-input)'
export const BG_DROP  = 'var(--bg-drop)'

export const BORDER       = 'var(--border)'
export const BORDER2      = 'var(--border-2)'
export const BORDER_HOVER = 'var(--border-hover)'

export const ACCENT          = 'var(--accent)'
export const ACCENT_DIM      = 'var(--accent-dim)'
export const ACCENT_GRADIENT = 'var(--accent-gradient)'

export const SHADOW_CARD = 'var(--shadow-card)'
export const SHADOW_POP  = 'var(--shadow-pop)'

// Texto, do mais forte ao decorativo
export const INK       = 'var(--ink)'
export const INK_SUB   = 'var(--ink-sub)'
export const INK_MUTE  = 'var(--ink-mute)'
export const INK_FAINT = 'var(--ink-faint)'
export const INK_GHOST = 'var(--ink-ghost)'

// Semânticas — o par cor/fundo mantém contraste nos dois temas
export const SUCCESS    = 'var(--success)'
export const SUCCESS_BG = 'var(--success-bg)'
export const WARNING    = 'var(--warning)'
export const WARNING_BG = 'var(--warning-bg)'
export const DANGER     = 'var(--danger)'
export const DANGER_BG  = 'var(--danger-bg)'
export const INFO       = 'var(--info)'
export const INFO_BG    = 'var(--info-bg)'

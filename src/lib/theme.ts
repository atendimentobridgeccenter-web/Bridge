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
//
// MIGRAÇÃO (OS-015): os nomes abaixo (BG_PAGE, INK, ACCENT…) continuam
// funcionando — agora resolvem para os tokens do design system via alias em
// index.css — e ficam marcados @deprecated. Para código novo, use os nomes
// semânticos novos exportados no fim do arquivo (FUNDO, TEXTO, LARANJA_ACAO…),
// que seguem docs/design-system/tokens.css.

/** @deprecated use FUNDO */
export const BG_PAGE       = 'var(--bg-base)'
/** @deprecated use TRILHO */
export const BG_SIDEBAR    = 'var(--bg-sidebar)'
/** @deprecated use TRILHO_LINHA */
export const SIDEBAR_BORDER = 'var(--sidebar-border)'

// Texto sobre o rail escuro — claro nos dois temas, ao contrário de INK
/** @deprecated use TRILHO_TEXTO */
export const RAIL_INK       = 'var(--rail-ink)'
/** @deprecated use TRILHO_SUB */
export const RAIL_INK_SUB   = 'var(--rail-ink-sub)'
/** @deprecated use TRILHO_SUB */
export const RAIL_INK_MUTE  = 'var(--rail-ink-mute)'

/** @deprecated use SUPERFICIE */
export const BG_CARD  = 'var(--bg-surface)'
/** @deprecated use SUPERFICIE_2 */
export const BG_CARD2 = 'var(--bg-surface-2)'
/** @deprecated use CAMPO */
export const BG_INPUT = 'var(--bg-input)'
/** @deprecated use SUPERFICIE_2 */
export const BG_DROP  = 'var(--bg-drop)'

/** @deprecated use LINHA */
export const BORDER       = 'var(--border)'
/** @deprecated use LINHA */
export const BORDER2      = 'var(--border-2)'
/** @deprecated use BORDA_CONTROLE */
export const BORDER_HOVER = 'var(--border-hover)'

/** @deprecated use LARANJA_ACAO */
export const ACCENT          = 'var(--accent)'
/** @deprecated use LARANJA_SUAVE */
export const ACCENT_DIM      = 'var(--accent-dim)'
/** @deprecated use LARANJA_ACAO (sólido — gradiente é proibido no design system) */
export const ACCENT_GRADIENT = 'var(--accent-gradient)'

/** @deprecated use SOMBRA_CARTAO */
export const SHADOW_CARD = 'var(--shadow-card)'
/** @deprecated use SOMBRA_FLUTUA */
export const SHADOW_POP  = 'var(--shadow-pop)'

// Texto, do mais forte ao decorativo
/** @deprecated use TEXTO */
export const INK       = 'var(--ink)'
/** @deprecated use TEXTO_SUB */
export const INK_SUB   = 'var(--ink-sub)'
/** @deprecated use TEXTO_MUTE */
export const INK_MUTE  = 'var(--ink-mute)'
/** @deprecated use TEXTO_MUTE */
export const INK_FAINT = 'var(--ink-faint)'
/** @deprecated use TEXTO */
export const INK_GHOST = 'var(--ink-ghost)'

// Semânticas — o par cor/fundo mantém contraste nos dois temas
/** @deprecated use OK */
export const SUCCESS    = 'var(--success)'
/** @deprecated use OK_FUNDO */
export const SUCCESS_BG = 'var(--success-bg)'
/** @deprecated use ATENCAO */
export const WARNING    = 'var(--warning)'
/** @deprecated use ATENCAO_FUNDO */
export const WARNING_BG = 'var(--warning-bg)'
/** @deprecated use ERRO */
export const DANGER     = 'var(--danger)'
/** @deprecated use ERRO_FUNDO */
export const DANGER_BG  = 'var(--danger-bg)'
export const INFO       = 'var(--info)'
export const INFO_BG    = 'var(--info-bg)'


// ── Tokens novos (docs/design-system/tokens.css) ────────────────
// Nomes semânticos do design system. Preferir estes em código novo;
// os nomes acima (BG_PAGE, INK, ACCENT…) seguem funcionando como aliases
// obsoletos para não quebrar as telas existentes.

export const FUNDO        = 'var(--fundo)'
export const SUPERFICIE    = 'var(--superficie)'
export const SUPERFICIE_2  = 'var(--superficie-2)'
export const CAMPO         = 'var(--campo)'

export const TRILHO        = 'var(--trilho)'
export const TRILHO_ATIVO  = 'var(--trilho-ativo)'
export const TRILHO_LINHA  = 'var(--trilho-linha)'
export const TRILHO_TEXTO  = 'var(--trilho-texto)'
export const TRILHO_SUB    = 'var(--trilho-sub)'

export const LINHA          = 'var(--linha)'
export const BORDA_CONTROLE = 'var(--borda-controle)'
export const FOCO           = 'var(--foco)'

export const TEXTO       = 'var(--texto)'
export const TEXTO_SUB   = 'var(--texto-sub)'
export const TEXTO_MUTE  = 'var(--texto-mute)'

export const LARANJA        = 'var(--laranja)'
export const LARANJA_ACAO   = 'var(--laranja-acao)'
export const LARANJA_ACAO_HOVER = 'var(--laranja-acao-hover)'
export const ON_LARANJA     = 'var(--on-laranja)'
export const LARANJA_TEXTO  = 'var(--laranja-texto)'
export const LARANJA_SUAVE  = 'var(--laranja-suave)'

export const OK           = 'var(--ok)'
export const OK_FUNDO     = 'var(--ok-fundo)'
export const ATENCAO      = 'var(--atencao)'
export const ATENCAO_FUNDO = 'var(--atencao-fundo)'
export const ERRO         = 'var(--erro)'
export const ERRO_FUNDO   = 'var(--erro-fundo)'
// INFO / INFO_BG já exportados acima com os mesmos valores (os tokens novo e
// antigo têm o mesmo nome em design-system/tokens.css, sem precisar de alias).

export const SOMBRA_CARTAO  = 'var(--sombra-cartao)'
export const SOMBRA_FLUTUA  = 'var(--sombra-flutua)'
export const SOMBRA_LARANJA = 'var(--sombra-laranja)'

export const RADIUS_CONTROLE = 'var(--radius-controle)'
export const RADIUS_CARTAO   = 'var(--radius-cartao)'
export const RADIUS_GRANDE   = 'var(--radius-grande)'
export const RADIUS_PILULA   = 'var(--radius-pilula)'

export const FONT_TITULO = 'var(--font-titulo)'
export const FONT_TEXTO  = 'var(--font-sans)'

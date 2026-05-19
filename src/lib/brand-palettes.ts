// Palettes complètes — override total du `meta.theme` IA. Le patron choisit
// une palette dans /dashboard/settings → tous ses drops affichent ces couleurs
// indistinctement (bg / text / accent / accentFg / soft) sur les 5 templates.
//
// Cette version remplace la première tentative (rollback du 19/05) qui ne
// swappait que l'accent en gardant les thèmes IA — créait des conflits sur
// QUIZ (bg-violet) et MANIFESTO (bg-ink). Ici, Shell injecte une palette
// complète comme CSS vars ; templates consomment `var(--bg)`, `var(--text)`,
// `var(--accent)`, `var(--accent-fg)`, `var(--soft)` sans logique de theme.
//
// Contraste : les `accent` ont été calibrés pour passer AA sur leur `bg`. Si
// un combo s'avère limite au test (ex : `or` sur cream-warm), assombrir le
// `accent` d'environ 10% en HSL.

export const BRAND_PALETTES = {
  violet: {
    label: 'Violet',
    bg: '#F4EDE2',
    text: '#1A1A1A',
    // #8C5CE6 : plus pourpre que l'ancien #5246F5 (qui lisait trop bleu) — se
    // distingue mieux d'`indigo` (#3F4ABE) et garde un contraste AA sur le bg cream.
    accent: '#8C5CE6',
    accentFg: '#FFFFFF',
    soft: '#E5DFD4',
  },
  rose: {
    label: 'Rose poudré',
    bg: '#FCF1F0',
    text: '#2D1A1F',
    accent: '#D4738A',
    accentFg: '#FFFFFF',
    soft: '#F5D6D9',
  },
  terracotta: {
    label: 'Terracotta',
    bg: '#F8ECE0',
    text: '#2D1F18',
    accent: '#C24C2C',
    accentFg: '#FFFFFF',
    soft: '#EDC9AC',
  },
  sauge: {
    label: 'Vert sauge',
    bg: '#F0F2EA',
    text: '#1F2316',
    accent: '#5C7C50',
    accentFg: '#FFFFFF',
    soft: '#D5DDC5',
  },
  sapin: {
    label: 'Vert sapin',
    bg: '#EEF3EA',
    text: '#0F1F0F',
    accent: '#2D5016',
    accentFg: '#FFFFFF',
    soft: '#CFE0C5',
  },
  indigo: {
    label: 'Indigo profond',
    bg: '#EEF0F8',
    text: '#0E1430',
    accent: '#3F4ABE',
    accentFg: '#FFFFFF',
    soft: '#CBD2EE',
  },
  or: {
    label: 'Or pâle',
    bg: '#F7F1E5',
    text: '#2A1F0E',
    accent: '#9B7A2D',
    accentFg: '#FFFFFF',
    soft: '#E8D9B5',
  },
  // SEULE palette à fond foncé. L'inversion bg/text se fait toute seule via CSS vars,
  // sans logique conditionnelle dans Shell. `accent === text` = austérité éditoriale
  // (eyebrow et stats en off-white sur charcoal, pas d'accent vif).
  noir: {
    label: 'Noir intense',
    bg: '#1A1A1A',
    text: '#F2F2F2',
    accent: '#F2F2F2',
    accentFg: '#1A1A1A',
    soft: '#3A3A3A',
  },
} as const

export type BrandPalette = (typeof BRAND_PALETTES)[BrandPaletteKey]
export type BrandPaletteKey = keyof typeof BRAND_PALETTES

export const BRAND_PALETTE_KEYS = Object.keys(BRAND_PALETTES) as BrandPaletteKey[]
export const DEFAULT_BRAND_PALETTE: BrandPaletteKey = 'violet'

/**
 * Résout une key (potentiellement null / inconnue) vers une palette concrète.
 * Garantit qu'on retourne toujours quelque chose — si la DB contient une key
 * obsolète (palette retirée), on retombe sur le défaut sans crasher le render.
 */
export function getPalette(key: string | null | undefined): BrandPalette {
  if (!key || !(key in BRAND_PALETTES)) return BRAND_PALETTES[DEFAULT_BRAND_PALETTE]
  return BRAND_PALETTES[key as BrandPaletteKey]
}

/**
 * Construit l'objet `style` à appliquer sur un container racine. Tous les
 * descendants peuvent ensuite consommer les vars via
 * `bg-[var(--bg)] text-[var(--text)] text-[var(--accent)]` etc.
 */
export function paletteStyle(key: string | null | undefined): React.CSSProperties {
  const p = getPalette(key)
  return {
    '--bg': p.bg,
    '--text': p.text,
    '--accent': p.accent,
    '--accent-fg': p.accentFg,
    '--soft': p.soft,
  } as React.CSSProperties
}

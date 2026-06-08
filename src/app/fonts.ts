import {
  Anton,
  Archivo,
  Bodoni_Moda,
  Bricolage_Grotesque,
  Fraunces,
  Geist,
  Hanken_Grotesk,
  Instrument_Serif,
  JetBrains_Mono,
  Newsreader,
  Schibsted_Grotesk,
  Space_Grotesk,
  Spectral,
} from 'next/font/google'

// ─── Anciennes polices éditoriales (utilisées par Shell / templates legacy / dashboard) ───
export const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display-alt',
  display: 'swap',
})

export const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-editorial',
  display: 'swap',
})

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const geist = Geist({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

// ─── Landing-only ───
export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-lp-display',
  display: 'swap',
})

export const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-lp-body',
  display: 'swap',
})

// ─── Templates publics v2 (5 personnalités distinctes — cf. design_handoff_drop_templates/) ───
// Schibsted Grotesk : Guide pratique (display)
export const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-tpl-guide',
  display: 'swap',
})

// Bodoni Moda : Manifeste (display)
export const bodoniModa = Bodoni_Moda({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-tpl-manifesto',
  display: 'swap',
})

// Spectral : Étude de cas (display)
export const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-tpl-case',
  display: 'swap',
})

// Archivo : Étude de cas (body sans-serif)
export const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-tpl-case-body',
  display: 'swap',
})

// Bricolage Grotesque : Quiz (display + body)
export const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-tpl-quiz',
  display: 'swap',
})

// Anton : Annonce (display poster)
export const anton = Anton({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-tpl-announce',
  display: 'swap',
})

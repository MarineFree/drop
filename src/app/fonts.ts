import {
  Fraunces,
  Geist,
  Hanken_Grotesk,
  Instrument_Serif,
  JetBrains_Mono,
  Newsreader,
  Space_Grotesk,
} from 'next/font/google'

// ─── Anciennes polices éditoriales (Shell legacy, templates v2 via CSS vars de
// substitution dans globals.css, dashboard, auth) ───
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

// ─── Templates publics v2 ───
// Les 6 polices spécifiques du design handoff (Schibsted Grotesk, Bodoni Moda,
// Spectral, Archivo, Bricolage Grotesque, Anton) ont été retirées : le VPS
// Hostinger ne peut pas atteindre fonts.gstatic.com depuis le build Docker
// (timeouts ETIMEDOUT systématiques). Les CSS vars --font-tpl-* sont définies
// dans globals.css en fallback vers les fonts déjà chargées ci-dessus.

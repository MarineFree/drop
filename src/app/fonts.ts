import {
  Instrument_Serif,
  Fraunces,
  Newsreader,
  JetBrains_Mono,
  Geist,
  Space_Grotesk,
  Hanken_Grotesk,
} from 'next/font/google'

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

// Polices RÉSERVÉES à la landing /. Pas utilisées ailleurs dans l'app pour
// éviter qu'elles fuient sur le dashboard / les drops publics (qui ont leur
// propre identité éditoriale cream/serif).
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

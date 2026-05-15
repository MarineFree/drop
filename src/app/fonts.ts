import {
  Instrument_Serif,
  Fraunces,
  Newsreader,
  JetBrains_Mono,
  Geist,
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

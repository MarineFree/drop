import type { Metadata } from 'next'
import {
  fraunces,
  geist,
  hankenGrotesk,
  instrumentSerif,
  jetbrainsMono,
  newsreader,
  spaceGrotesk,
} from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'Drop — un mini-site en 90 secondes',
  description:
    "Tape une phrase ou envoie un vocal de 20s. Drop génère un mini-site partageable qui s'auto-détruit après 7 jours.",
}

const fontClassNames = [
  // Editoriales (Shell legacy, templates v2 via fallback CSS vars, dashboard, auth)
  instrumentSerif.variable,
  fraunces.variable,
  newsreader.variable,
  jetbrainsMono.variable,
  geist.variable,
  // Landing-only
  spaceGrotesk.variable,
  hankenGrotesk.variable,
].join(' ')

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fontClassNames}>
      <body className="font-body">{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import {
  anton,
  archivo,
  bodoniModa,
  bricolageGrotesque,
  fraunces,
  geist,
  hankenGrotesk,
  instrumentSerif,
  jetbrainsMono,
  newsreader,
  schibstedGrotesk,
  spaceGrotesk,
  spectral,
} from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'Drop — un mini-site en 90 secondes',
  description:
    "Tape une phrase ou envoie un vocal de 20s. Drop génère un mini-site partageable qui s'auto-détruit après 7 jours.",
}

const fontClassNames = [
  // Legacy + dashboard
  instrumentSerif.variable,
  fraunces.variable,
  newsreader.variable,
  jetbrainsMono.variable,
  geist.variable,
  // Landing-only
  spaceGrotesk.variable,
  hankenGrotesk.variable,
  // Templates publics v2
  schibstedGrotesk.variable,
  bodoniModa.variable,
  spectral.variable,
  archivo.variable,
  bricolageGrotesque.variable,
  anton.variable,
].join(' ')

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fontClassNames}>
      <body className="font-body">{children}</body>
    </html>
  )
}

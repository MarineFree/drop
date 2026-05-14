import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Drop — un mini-site en 90 secondes',
  description:
    "Tape une phrase ou envoie un vocal de 20s. Drop génère un mini-site partageable qui s'auto-détruit après 7 jours.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}

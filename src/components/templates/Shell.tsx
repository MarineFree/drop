import type { ReactNode } from 'react'
import { paletteStyle } from '@/lib/brand-palettes'

interface ShellProps {
  children: ReactNode
  expiresAt: Date
  business: string | null
  /** Clé de palette (cf. `User.brandColor` / brand-palettes.ts). null → défaut violet. */
  brandColor: string | null
}

// Shell ne fait plus de logique de theme cream/violet/dark : elle injecte la
// palette complète comme CSS vars sur le container racine. Tout le reste
// (templates, atoms, interactions) consomme `var(--bg)`, `var(--text)`,
// `var(--accent)`, `var(--accent-fg)`, `var(--soft)`.
//
// `meta.theme` retourné par l'IA devient mort code : le bg et la palette sont
// pilotés exclusivement par la brand du patron. Cohérent : le patron a UNE
// identité visuelle, ses 5 drops la suivent quelque soit le sujet.

function formatTimeLeft(expiresAt: Date): string {
  const diff = Math.max(0, expiresAt.getTime() - Date.now())
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  return `${days}j ${hours}h`
}

export function Shell({ children, expiresAt, business, brandColor }: ShellProps) {
  const timeLeft = formatTimeLeft(expiresAt)
  const style = paletteStyle(brandColor)

  return (
    <div
      style={style}
      className="min-h-screen bg-[var(--bg)] font-body text-[var(--text)] antialiased"
    >
      {/* Sticky header — mix-blend-difference garde la lisibilité quel que soit
          le contenu derrière. Couleurs via vars pour suivre la palette. */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 font-mono text-[11px] uppercase tracking-[0.15em] mix-blend-difference">
        <span className="opacity-70">{business ?? 'Drop'}</span>
        <span className="opacity-70">Expire dans {timeLeft}</span>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-32">{children}</main>

      <footer className="space-y-1 border-t border-[var(--text)]/10 px-6 py-8 text-center font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
        <p>Drop éphémère · {business ?? 'Anonyme'}</p>
        <p>
          Expire le{' '}
          {new Intl.DateTimeFormat('fr-FR', {
            dateStyle: 'long',
            timeStyle: 'short',
          }).format(expiresAt)}
        </p>
      </footer>
    </div>
  )
}

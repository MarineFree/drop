import type { ReactNode } from 'react'

type Theme = 'cream' | 'violet' | 'dark'

interface ShellProps {
  children: ReactNode
  expiresAt: Date
  business: string | null
  theme: Theme
}

// Sans framer-motion ni useEffect : Shell reste Server Component.
// La page est `force-dynamic` → chaque hit SSR re-calcule timeLeft.
// Pas d'auto-update toutes les 30s, c'est OK pour cette passe.
const THEMES: Record<Theme, string> = {
  cream: 'bg-cream-grain text-ink',
  violet: 'bg-violet text-cream',
  dark: 'bg-ink text-cream',
}

function formatTimeLeft(expiresAt: Date): string {
  const diff = Math.max(0, expiresAt.getTime() - Date.now())
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  return `${days}j ${hours}h`
}

export function Shell({ children, expiresAt, business, theme }: ShellProps) {
  const timeLeft = formatTimeLeft(expiresAt)

  return (
    <div className={`min-h-screen ${THEMES[theme]} font-body antialiased`}>
      {/* mix-blend-difference garde le header lisible quel que soit le fond derrière */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 font-mono text-[11px] uppercase tracking-[0.15em] mix-blend-difference">
        <span className="opacity-70">{business ?? 'Drop'}</span>
        <span className="opacity-70">Expire dans {timeLeft}</span>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-32">{children}</main>

      <footer className="border-t border-current/10 px-6 py-8">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
          Drop éphémère · {business ?? 'Anonyme'}
        </p>
      </footer>
    </div>
  )
}

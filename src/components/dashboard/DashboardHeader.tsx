import Link from 'next/link'
import type { Route } from 'next'
import { SignOutButton } from './SignOutButton'

interface DashboardHeaderProps {
  business: string
}

// Nav top partagée entre /dashboard et /dashboard/d/[id].
// Server Component : pas d'état interactif, juste un wrapper.
// Style aligné Direction B (dark + cyan) pour cohérence avec la landing.
export function DashboardHeader({ business }: DashboardHeaderProps) {
  return (
    <nav
      className="border-b"
      style={{ borderColor: 'var(--lp-line)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 font-[var(--font-lp-display)] text-2xl font-bold tracking-[-0.02em]"
        >
          <span aria-hidden className="lp-drop-mark" />
          Drop.
        </Link>

        <div className="flex items-center gap-6">
          <span
            className="hidden font-[var(--font-mono)] text-[11px] uppercase tracking-[0.15em] md:inline"
            style={{ color: 'var(--lp-faint)' }}
          >
            {business}
          </span>
          <Link
            href={'/dashboard/settings' as Route}
            className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.15em] transition hover:opacity-100"
            style={{ color: 'var(--lp-muted)' }}
          >
            Réglages
          </Link>
          <SignOutButton />
        </div>
      </div>
    </nav>
  )
}

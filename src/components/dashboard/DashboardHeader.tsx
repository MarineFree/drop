import Link from 'next/link'
import { SignOutButton } from './SignOutButton'

interface DashboardHeaderProps {
  business: string
}

// Nav top partagée entre /dashboard et /dashboard/d/[id].
// Pas de sidebar, pas d'icônes — cohérent avec l'identité éditoriale.
// Server Component : pas d'état interactif, juste un wrapper.
export function DashboardHeader({ business }: DashboardHeaderProps) {
  return (
    <nav className="border-b border-ink/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/dashboard" className="font-display text-2xl tracking-tight">
          Drop.
        </Link>

        <div className="flex items-center gap-8">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] opacity-50">
            {business}
          </span>
          <SignOutButton />
        </div>
      </div>
    </nav>
  )
}

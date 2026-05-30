import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { GenerateClient } from '@/components/creator/GenerateClient'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Drop — nouveau drop',
}

// Server Component minimal — wrapper visuel autour du GenerateClient (Client).
// `requireUser()` est la VRAIE ceinture de sécurité : le middleware Next redirige
// vite côté browser (UX), mais peut être bypass (CVE-2025-29927). Ici on valide
// la session côté serveur avant de rendre quoi que ce soit.
// On vérifie aussi que l'onboarding business/trade est fait — sinon le contenu
// IA généré n'a pas de contexte métier et les eyebrows tombent sur "Anonyme".
export default async function NewDropPage() {
  const sessionUser = await requireUser()
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: { business: true, trade: true, ctaUrl: true },
  })
  if (!user.business || !user.trade) redirect('/onboarding')

  return (
    <div className="lp-root min-h-screen antialiased">
      <header
        className="border-b"
        style={{ borderColor: 'var(--lp-line)' }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-6 px-6 py-4 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.15em]">
          <Link
            href="/"
            className="flex items-center gap-3 font-[var(--font-lp-display)] text-xl font-bold normal-case tracking-[-0.02em]"
            style={{ letterSpacing: 'normal' }}
          >
            <span aria-hidden className="lp-drop-mark" />
            Drop.
          </Link>
          <Link
            href="/dashboard"
            className="transition hover:opacity-100"
            style={{ color: 'var(--lp-muted)' }}
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-32 pt-12">
        <GenerateClient defaultCtaUrl={user.ctaUrl} />
      </main>

      <footer
        className="border-t px-6 py-8"
        style={{ borderColor: 'var(--lp-line)' }}
      >
        <p
          className="text-center font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em]"
          style={{ color: 'var(--lp-faint)' }}
        >
          Une phrase, un mini-site. Sept jours en ligne, puis ça disparaît.
        </p>
      </footer>
    </div>
  )
}

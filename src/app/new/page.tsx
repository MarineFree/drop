import type { Metadata } from 'next'
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
    <div className="min-h-screen bg-cream-grain font-body text-ink antialiased">
      <header className="flex items-center justify-between px-6 py-4 font-mono text-[11px] uppercase tracking-[0.15em] opacity-70">
        <span>Drop · création</span>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-32 pt-12">
        <GenerateClient defaultCtaUrl={user.ctaUrl} />
      </main>

      <footer className="border-t border-current/10 px-6 py-8">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
          Une phrase, un mini-site. Sept jours en ligne, puis ça disparaît.
        </p>
      </footer>
    </div>
  )
}

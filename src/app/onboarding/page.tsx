import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { OnboardingClient } from '@/components/auth/OnboardingClient'
import { getCurrentUser } from '@/lib/auth-server'
import { prisma } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Drop — onboarding',
}

export default async function OnboardingPage() {
  const sessionUser = await getCurrentUser()
  if (!sessionUser) redirect('/signin?redirect=/onboarding')

  // Source de vérité côté DB plutôt que sur la session — la session peut être
  // cachée (cookieCache enabled), la DB est toujours à jour.
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: { business: true, trade: true },
  })

  // Anti-double-onboarding : si déjà rempli, on file directement au dashboard.
  if (user.business && user.trade) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-cream-grain font-body text-ink antialiased">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <OnboardingClient />
      </main>
    </div>
  )
}

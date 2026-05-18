import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DropCard } from '@/components/dashboard/DropCard'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { getUserDrops } from '@/lib/db/drops'

export const metadata: Metadata = { title: 'Drop — dashboard' }

// `force-dynamic` : pas de cache, chaque visite re-query la liste à jour
// (les counts viewCount / ctaCount évoluent en temps réel via trackEvent).
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const sessionUser = await requireUser()

  // Source de vérité = Prisma, pas la session (la session est cachée 5 min via
  // cookieCache, peut-être stale juste après l'onboarding).
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: { id: true, business: true, trade: true },
  })
  if (!user.business || !user.trade) redirect('/onboarding')

  const { drops, totals } = await getUserDrops(user.id)
  const now = new Date()
  const activeCount = drops.filter(d => d.isActive && d.expiresAt > now).length

  return (
    <div className="min-h-screen bg-cream-grain text-ink">
      <DashboardHeader business={user.business} />

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Page header */}
        <div className="mb-16 flex items-end justify-between">
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-violet">
              {user.business}
            </p>
            <h1 className="font-display text-5xl leading-[0.95] md:text-6xl">Tes Drops.</h1>
          </div>
          <Link
            href="/new"
            className="bg-ink px-6 py-3 font-mono text-xs uppercase tracking-[0.15em] text-cream"
          >
            Nouveau Drop
          </Link>
        </div>

        <KpiGrid
          items={[
            { label: 'Drops actifs', value: activeCount },
            { label: 'Drops au total', value: totals._count.id },
            { label: 'Vues cumulées', value: totals._sum.viewCount ?? 0 },
            { label: 'Conversions', value: totals._sum.ctaCount ?? 0 },
          ]}
        />

        <section className="mt-20">
          <h2 className="mb-6 font-mono text-[11px] uppercase tracking-[0.25em] opacity-60">
            Tous les Drops
          </h2>
          {drops.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {drops.map(d => (
                <DropCard key={d.id} drop={d} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="py-24 text-center">
      <p className="font-display text-3xl italic opacity-80">Aucun Drop encore.</p>
      <p className="mt-4 font-mono text-xs uppercase tracking-[0.15em] opacity-50">
        Commence par tapoter une phrase.
      </p>
      <Link
        href="/new"
        className="mt-8 inline-block bg-ink px-6 py-3 font-mono text-xs uppercase tracking-[0.15em] text-cream"
      >
        Nouveau Drop
      </Link>
    </div>
  )
}

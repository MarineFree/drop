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

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: { id: true, business: true, trade: true },
  })
  if (!user.business || !user.trade) redirect('/onboarding')

  const { drops, totals } = await getUserDrops(user.id)
  const now = new Date()
  const activeCount = drops.filter(d => d.isActive && d.expiresAt > now).length

  return (
    <div className="lp-root min-h-screen">
      <DashboardHeader business={user.business} />

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Page header */}
        <div className="mb-16 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p
              className="mb-3 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.25em]"
              style={{ color: 'var(--lp-accent)' }}
            >
              {user.business}
            </p>
            <h1 className="font-[var(--font-lp-display)] text-5xl font-bold leading-[0.95] tracking-[-0.03em] md:text-6xl">
              Tes Drops.
            </h1>
          </div>
          <Link
            href="/new"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-[var(--font-lp-display)] text-sm font-semibold transition"
            style={{
              background: 'var(--lp-accent)',
              color: 'oklch(20% 0.04 230)',
              boxShadow:
                '0 0 0 1px var(--lp-accent), 0 8px 30px -8px var(--lp-glow)',
            }}
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
          <h2
            className="mb-6 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.25em]"
            style={{ color: 'var(--lp-faint)' }}
          >
            Tous les Drops
          </h2>
          {drops.length === 0 ? (
            <EmptyState />
          ) : (
            <ul
              className="divide-y border-y"
              style={{
                borderColor: 'var(--lp-line)',
                // Tailwind divide-y avec custom color : on hint via inline
                // sur les <li> du DropCard.
              }}
            >
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
      <p
        className="font-[var(--font-lp-display)] text-3xl italic"
        style={{ color: 'var(--lp-muted)' }}
      >
        Aucun Drop encore.
      </p>
      <p
        className="mt-4 font-[var(--font-mono)] text-xs uppercase tracking-[0.15em]"
        style={{ color: 'var(--lp-faint)' }}
      >
        Commence par tapoter une phrase.
      </p>
      <Link
        href="/new"
        className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-[var(--font-lp-display)] text-sm font-semibold transition"
        style={{
          background: 'var(--lp-accent)',
          color: 'oklch(20% 0.04 230)',
          boxShadow:
            '0 0 0 1px var(--lp-accent), 0 8px 30px -8px var(--lp-glow)',
        }}
      >
        Nouveau Drop
      </Link>
    </div>
  )
}

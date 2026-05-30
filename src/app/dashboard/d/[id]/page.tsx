import type { Metadata, Route } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { EventsTimeline } from '@/components/dashboard/EventsTimeline'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { ShareBar } from '@/components/dashboard/ShareBar'
import type { DropContent } from '@/lib/ai/schema'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { getUserDropById } from '@/lib/db/drops'

export const metadata: Metadata = { title: 'Drop — détail' }
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DropDetailPage({ params }: Props) {
  const { id } = await params
  const sessionUser = await requireUser()

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: { id: true, business: true, trade: true },
  })
  if (!user.business || !user.trade) redirect('/onboarding')

  // `getUserDropById` filtre sur `userId: user.id` — un drop d'un autre user
  // retourne null, jamais leak via ID guessing.
  const drop = await getUserDropById(user.id, id)
  if (!drop) notFound()

  const content = drop.content as unknown as DropContent
  const scrollComplete = drop.events.filter(e => e.kind === 'SCROLL_COMPLETE').length
  const uniqueVisitors = new Set(drop.events.map(e => e.visitorHash)).size
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const publicUrl = `${baseUrl}/d/${drop.slug}`

  return (
    <div className="lp-root min-h-screen">
      <DashboardHeader business={user.business} />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <Link
          href="/dashboard"
          className="mb-8 inline-block font-[var(--font-mono)] text-[11px] uppercase tracking-[0.15em] transition hover:opacity-100"
          style={{ color: 'var(--lp-muted)' }}
        >
          ← Retour
        </Link>

        <div className="mb-16 grid gap-12 md:grid-cols-[2fr_3fr]">
          {/* Aperçu */}
          <div>
            <div
              className="relative mb-4 aspect-[4/3] overflow-hidden rounded-xl"
              style={{ background: 'var(--lp-panel)' }}
            >
              {drop.imageUrl && (
                <Image
                  src={drop.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 480px"
                  className="object-cover"
                />
              )}
            </div>
            <Link
              href={`/d/${drop.slug}` as Route}
              target="_blank"
              rel="noopener noreferrer"
              className="font-[var(--font-mono)] text-xs uppercase tracking-[0.15em] underline underline-offset-4 transition hover:opacity-100"
              style={{ color: 'var(--lp-accent)' }}
            >
              Ouvrir le Drop public ↗
            </Link>
          </div>

          {/* Méta */}
          <div>
            <p
              className="mb-3 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.25em]"
              style={{ color: 'var(--lp-accent)' }}
            >
              {drop.templateType.toLowerCase()} · /{drop.slug}
            </p>
            <h1 className="mb-6 font-[var(--font-lp-display)] text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">
              {content.hook.title}
            </h1>
            <p
              className="text-lg leading-relaxed"
              style={{ color: 'var(--lp-muted)' }}
            >
              {content.hook.subtitle}
            </p>

            <ShareBar url={publicUrl} />
          </div>
        </div>

        <KpiGrid
          items={[
            { label: 'Vues', value: drop.viewCount },
            { label: 'Visiteurs uniques', value: uniqueVisitors },
            { label: 'Scrollés à fond', value: scrollComplete },
            { label: 'Conversions', value: drop.ctaCount },
          ]}
        />

        <section className="mt-20">
          <h2
            className="mb-6 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.25em]"
            style={{ color: 'var(--lp-faint)' }}
          >
            Activité récente
          </h2>
          <EventsTimeline events={drop.events} />
        </section>
      </main>
    </div>
  )
}

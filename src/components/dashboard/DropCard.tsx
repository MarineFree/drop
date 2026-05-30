import Image from 'next/image'
import Link from 'next/link'
import type { Route } from 'next'
import type { DropContent } from '@/lib/ai/schema'
import type { DashboardDrop } from '@/lib/db/drops'

const TEMPLATE_LABEL: Record<string, string> = {
  HOW_TO: 'Guide',
  MANIFESTO: 'Manifeste',
  CASE_STUDY: 'Étude de cas',
  QUIZ: 'Quiz',
  ANNOUNCEMENT: 'Annonce',
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(d)
}

// Server Component — hover via transitions CSS pures.
// Style Direction B (dark + cyan).
export function DropCard({ drop }: { drop: DashboardDrop }) {
  const content = drop.content as unknown as DropContent
  const expired = !drop.isActive || drop.expiresAt <= new Date()
  const hoursLeft = Math.max(0, Math.floor((drop.expiresAt.getTime() - Date.now()) / 3_600_000))
  const conversionRate =
    drop.viewCount > 0 ? Math.round((drop.ctaCount / drop.viewCount) * 100) : 0

  return (
    <li style={{ borderColor: 'var(--lp-line)' }}>
      <Link
        href={`/dashboard/d/${drop.id}` as Route}
        className="group -mx-2 flex items-center gap-6 rounded-xl px-2 py-5 transition hover:bg-[var(--lp-bg2)]"
      >
        {/* Thumbnail */}
        <div
          className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-md"
          style={{ background: 'var(--lp-panel)' }}
        >
          {drop.imageUrl && (
            <Image src={drop.imageUrl} alt="" fill sizes="80px" className="object-cover" />
          )}
        </div>

        {/* Title + meta */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-[var(--font-lp-display)] text-xl font-semibold leading-snug tracking-[-0.01em] transition-transform group-hover:translate-x-1">
            {content.hook.title}
          </p>
          <p
            className="mt-1 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.15em]"
            style={{ color: 'var(--lp-faint)' }}
          >
            {TEMPLATE_LABEL[drop.templateType] ?? drop.templateType} ·{' '}
            {formatDate(drop.createdAt)}
          </p>
        </div>

        {/* Stats — masquées sur mobile */}
        <div className="hidden gap-8 font-[var(--font-mono)] text-xs md:flex">
          <Stat label="Vues" value={drop.viewCount} />
          <Stat label="CTA" value={drop.ctaCount} />
          <Stat
            label="Conv."
            value={`${conversionRate}%`}
            muted={drop.viewCount < 10}
          />
        </div>

        {/* Status — droite */}
        <div className="w-24 text-right">
          {expired ? (
            <span
              className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.15em]"
              style={{ color: 'var(--lp-faint)' }}
            >
              Expiré
            </span>
          ) : (
            <span
              className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.15em]"
              style={{ color: 'var(--lp-accent)' }}
            >
              {hoursLeft}h restantes
            </span>
          )}
        </div>
      </Link>
    </li>
  )
}

function Stat({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string | number
  muted?: boolean
}) {
  return (
    <div className={`text-right ${muted ? 'opacity-40' : ''}`}>
      <div
        className="font-[var(--font-lp-display)] text-lg font-semibold tabular-nums"
        style={{ color: 'var(--lp-text)' }}
      >
        {value}
      </div>
      <div
        className="text-[9px] uppercase tracking-[0.15em]"
        style={{ color: 'var(--lp-faint)' }}
      >
        {label}
      </div>
    </div>
  )
}

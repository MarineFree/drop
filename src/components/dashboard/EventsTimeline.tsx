import type { DropEvent } from '@prisma/client'

const KIND_LABEL: Record<string, string> = {
  VIEW: 'A consulté le Drop',
  SCROLL_50: 'A lu la moitié',
  SCROLL_COMPLETE: "A lu jusqu'au bout",
  INTERACTION_START: "A commencé l'interaction",
  INTERACTION_DONE: "A complété l'interaction",
  CTA_CLICK: 'A cliqué sur le CTA',
  LEAD_SUBMITTED: 'A laissé ses coordonnées',
}

// Couleurs sémantiques alignées Direction B :
// - cyan accent : CTA_CLICK + LEAD_SUBMITTED (conversion)
// - vert : INTERACTION_DONE (engagement profond)
const KIND_COLOR: Record<string, string> = {
  CTA_CLICK: 'var(--lp-accent)',
  LEAD_SUBMITTED: 'var(--lp-accent)',
  INTERACTION_DONE: 'oklch(78% 0.14 150)',
}

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}j`
}

export function EventsTimeline({ events }: { events: DropEvent[] }) {
  if (events.length === 0) {
    return (
      <p
        className="py-8 font-[var(--font-lp-display)] text-2xl"
        style={{ color: 'var(--lp-muted)' }}
      >
        Aucune activité encore. Le Drop a peut-être besoin d&apos;un peu de partage.
      </p>
    )
  }

  return (
    <ul
      className="border-y"
      style={{ borderColor: 'var(--lp-line)' }}
    >
      {events.map(e => (
        <li
          key={e.id}
          className="-mx-2 flex items-center gap-4 px-2 py-3 transition hover:bg-[var(--lp-bg2)]"
          style={{ borderBottom: '1px solid var(--lp-line)' }}
        >
          <span
            className="w-24 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.15em] tabular-nums"
            style={{ color: 'var(--lp-faint)' }}
          >
            {formatRelative(e.createdAt)}
          </span>
          <span
            className="flex-1 text-sm"
            style={{ color: KIND_COLOR[e.kind] ?? 'var(--lp-text)' }}
          >
            {KIND_LABEL[e.kind] ?? e.kind}
          </span>
          <span
            className="hidden font-[var(--font-mono)] text-[10px] md:inline"
            style={{ color: 'var(--lp-faint)' }}
          >
            #{e.visitorHash.slice(0, 6)}
          </span>
        </li>
      ))}
    </ul>
  )
}

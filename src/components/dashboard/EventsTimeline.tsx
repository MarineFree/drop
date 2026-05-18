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

const KIND_COLOR: Record<string, string> = {
  CTA_CLICK: 'text-violet',
  LEAD_SUBMITTED: 'text-violet',
  INTERACTION_DONE: 'text-olive',
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

// Liste verticale, dense, anonymisée. Pas de graphique : pas assez de données
// pour qu'un chart soit utile. Le `#abcdef` tronqué à droite rend l'unicité
// visiteur visible sans identifier.
export function EventsTimeline({ events }: { events: DropEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="py-8 font-display text-2xl italic opacity-60">
        Aucune activité encore. Le Drop a peut-être besoin d&apos;un peu de partage.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-ink/10 border-y border-ink/10">
      {events.map(e => (
        <li
          key={e.id}
          className="-mx-2 flex items-center gap-4 px-2 py-3 hover:bg-ink/[0.02]"
        >
          <span className="w-24 font-mono text-[10px] uppercase tracking-[0.15em] tabular-nums opacity-50">
            {formatRelative(e.createdAt)}
          </span>
          <span className={`flex-1 text-sm ${KIND_COLOR[e.kind] ?? ''}`}>
            {KIND_LABEL[e.kind] ?? e.kind}
          </span>
          <span className="hidden font-mono text-[10px] opacity-40 md:inline">
            #{e.visitorHash.slice(0, 6)}
          </span>
        </li>
      ))}
    </ul>
  )
}

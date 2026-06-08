'use client'

import { useExpiryCountdown } from '@/hooks/useExpiryCountdown'

interface DropChromeProps {
  business: string | null
  authorTagline?: string | null
  createdAt: Date
  expiresAt: Date
  /**
   * Affiche la barre de progression sous le header sticky.
   * Optionnel (Guide / Manifeste / Étude de cas la montrent ;
   * Quiz / Annonce peuvent la masquer pour ne pas surcharger).
   */
  showProgressBar?: boolean
}

/**
 * Chrome partagée par les 5 templates publics v2.
 *
 * Consomme les CSS vars définies par le template parent :
 *   --bg ou --paper, --line, --ink, --ink-soft, --accent, --mono
 *
 * Le losange `.drop-mark` est en CSS pur (pas un SVG). Le pulse de la pastille
 * et le keyframe `pulse` sont définis dans `globals.css` (scope `.drop-tpl`).
 *
 * Note SSR : ce composant est client. Le countdown est calculé côté client
 * puis re-tick toutes les 20s. Le premier render serveur affiche une valeur
 * cohérente avec l'heure machine (acceptable — pas d'hydration mismatch
 * visible vu la granularité minute).
 */
export function DropChrome({
  business,
  authorTagline,
  createdAt,
  expiresAt,
  showProgressBar = true,
}: DropChromeProps) {
  const { label, progressPercent } = useExpiryCountdown(createdAt, expiresAt)

  return (
    <header className="sticky top-0 z-50 backdrop-blur-[14px] drop-chrome-bg border-b border-[var(--line)]">
      <div className="drop-chrome-in mx-auto flex w-full items-center justify-between gap-[18px] px-8 py-[14px] md:px-10">
        <div className="flex items-center gap-[11px] font-mono text-[13px] tracking-[0.04em] text-[var(--ink-soft)]">
          <span className="drop-mark" aria-hidden />
          <span>
            <b className="font-bold text-[var(--ink)]">{business ?? 'Drop'}</b>
            {authorTagline ? <> · {authorTagline}</> : null}
          </span>
        </div>

        <div className="flex items-center gap-[9px] rounded-full border border-[var(--line)] px-[13px] py-[7px] font-mono text-[12px] tracking-[0.05em] text-[var(--ink-soft)]">
          <span className="drop-pulse h-[7px] w-[7px] rounded-full bg-[var(--accent)]" aria-hidden />
          Expire dans <span>{label}</span>
        </div>
      </div>

      {showProgressBar && (
        <div className="h-[2px]">
          <i
            className="block h-full bg-[var(--accent)] transition-[width] duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
            aria-hidden
          />
        </div>
      )}
    </header>
  )
}

interface DropFooterProps {
  business: string | null
  createdAt: Date
  expiresAt: Date
}

/**
 * Footer commun. Sert à toutes les 5 templates v2 et confirme la promesse
 * "éphémère par nature" + la date exacte d'auto-destruction.
 */
export function DropFooter({ business, createdAt, expiresAt }: DropFooterProps) {
  const { expiryDateLong } = useExpiryCountdown(createdAt, expiresAt)

  return (
    <footer className="border-t border-[var(--line)]">
      <div className="mx-auto flex max-w-full flex-col items-center gap-3 px-8 pb-14 pt-10 text-center md:px-10">
        <div className="flex items-center gap-[10px] font-mono text-[12px] tracking-[0.08em] text-[var(--ink-soft)]">
          <span className="drop-mark" aria-hidden />
          Créé avec <b className="font-semibold text-[var(--ink)]">Drop</b> · éphémère par nature
        </div>
        <div className="font-mono text-[12px] tracking-[0.06em] text-[var(--muted)]">
          Ce site s&apos;auto-détruit le{' '}
          <b className="font-medium text-[var(--ink)]">{expiryDateLong}</b>
          {business ? <> · {business}</> : null}
        </div>
      </div>
    </footer>
  )
}

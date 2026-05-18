interface CtaButtonProps {
  /** Slug du drop — utilisé pour construire l'URL de tracking `/api/d/<slug>/cta`. */
  slug: string
  /** URL cible. `null` → composant rend `null` (bouton caché). */
  ctaUrl: string | null
  label: string
  /**
   * Couleurs du bouton :
   *  - `dark`  → bg-ink text-cream     (templates fond cream : HowTo, CaseStudy, Announcement)
   *  - `light` → bg-cream text-ink     (templates fond dark/violet : Manifesto, Quiz)
   */
  variant: 'dark' | 'light'
}

// Bouton CTA partagé entre les 5 templates. Évite la duplication du wrap conditionnel
// + de l'href de tracking + des attributs sécurité (rel="noopener noreferrer").
//
// Pas de tracking côté client (sendBeacon) : on délègue à la route de redirect
// `/api/d/<slug>/cta` qui logge l'event puis 302 vers `ctaUrl`. Avantage : marche
// même JS désactivé, métriques fiables.
export function CtaButton({ slug, ctaUrl, label, variant }: CtaButtonProps) {
  if (!ctaUrl) return null

  const colors = variant === 'dark' ? 'bg-ink text-cream' : 'bg-cream text-ink'

  return (
    <section className="my-24 text-center">
      <a
        href={`/api/d/${slug}/cta`}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-block rounded-sm ${colors} px-10 py-5 font-mono text-xs uppercase tracking-[0.2em]`}
      >
        {label}
      </a>
    </section>
  )
}

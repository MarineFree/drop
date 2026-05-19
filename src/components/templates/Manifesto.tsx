import Image from 'next/image'
import type { DropContent } from '@/lib/ai/schema'
import type { PublicDrop } from '@/lib/db/drops'
import { CtaButton } from './CtaButton'
import { Shell } from './Shell'
import { SectionRenderer } from './sections'

interface ManifestoProps {
  drop: PublicDrop
}

// Zod schema borne sections à min(2).max(4) → I à IV couvre tous les cas.
const ROMAN = ['I', 'II', 'III', 'IV'] as const

export function Manifesto({ drop }: ManifestoProps) {
  const content = drop.content as unknown as DropContent
  const business = drop.user.business ?? 'Anonyme'

  return (
    <Shell
      expiresAt={drop.expiresAt}
      business={drop.user.business}
      brandColor={drop.user.brandColor}
    >
      {/* Hero — H1 seul (le subtitle est déplacé dans la composition asymétrique
          ci-dessous, avec l'image). Le manifesto reste "acte de langage" : l'image
          arrive en deuxième temps, comme un appui visuel et non comme une couverture. */}
      <div className="pt-24 pb-12">
        <p className="mb-12 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--accent)]">
          Position · {business}
        </p>

        {/* Titre Fraunces italic, géant, leading très serré */}
        <h1 className="font-display-alt italic text-[clamp(56px,12vw,140px)] leading-[0.9] tracking-[-0.03em]">
          {content.hook.title}
        </h1>
      </div>

      {/* Composition asymétrique : subtitle "lead" à gauche, image portrait 4/5 à droite.
          Mobile-first : flow vertical par défaut (image d'abord pour donner le ton),
          puis grid 2 colonnes en md+. Image en grayscale pour ne pas jurer avec bg-ink
          et pour soutenir le ton éditorial assertif du manifesto. */}
      {drop.imageUrl ? (
        <figure className="my-12 grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-end md:gap-12">
          {/* Image en premier dans le DOM mais reorderée en md+ via order utilities
              pour garder la grille gauche=texte / droite=image. */}
          <div className="relative aspect-[4/5] overflow-hidden md:order-2">
            <Image
              src={drop.imageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover grayscale brightness-90"
              priority
            />
          </div>
          {/* Subtitle gardé en `figcaption` avec le traitement "lead" (border-l violet-soft).
              md:pb-4 cale visuellement le bas du texte avec le bas de l'image. */}
          <figcaption className="max-w-xl border-l-2 border-[var(--accent)] pl-6 font-editorial text-2xl leading-snug opacity-85 md:order-1 md:pb-4 md:text-3xl">
            {content.hook.subtitle}
          </figcaption>
        </figure>
      ) : (
        // Fallback : pas d'image en DB → on garde le subtitle dans la même zone visuelle,
        // sans la grille, pour ne pas créer un vide après le H1.
        <p className="my-12 max-w-xl border-l-2 border-[var(--accent)] pl-6 font-editorial text-2xl leading-snug opacity-85 md:text-3xl">
          {content.hook.subtitle}
        </p>
      )}

      {/* Sections avec numérotation romaine en marge gauche (cf. Docs/04 §9) */}
      <div className="mt-24">
        {content.sections.map((s, i) => (
          <div key={i} className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-2 top-2 font-display-alt text-2xl italic text-[var(--accent)] opacity-50 md:-left-12"
            >
              {ROMAN[i] ?? ''}
            </span>
            <SectionRenderer section={s} />
          </div>
        ))}
      </div>

      {/* CTA — ghost (transparent + bordé accent). Lisible sur palette dark "noir"
          comme sur les autres ; l'accent prend le rôle visuel. Caché si pas d'URL. */}
      <CtaButton
        slug={drop.slug}
        ctaUrl={drop.ctaUrl}
        label={content.cta.label}
        variant="ghost"
      />

    </Shell>
  )
}

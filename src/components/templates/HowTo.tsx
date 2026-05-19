import Image from 'next/image'
import type { DropContent } from '@/lib/ai/schema'
import type { PublicDrop } from '@/lib/db/drops'
import { CtaButton } from './CtaButton'
import { Shell } from './Shell'
import { SectionRenderer } from './sections'
import { Poll } from './interactions/Poll'
import { QuizWidget } from './interactions/QuizWidget'

interface HowToProps {
  drop: PublicDrop
}

export function HowTo({ drop }: HowToProps) {
  // Cast safe : `content` est validé par DropContentSchema à createDrop.
  const content = drop.content as unknown as DropContent

  return (
    <Shell
      expiresAt={drop.expiresAt}
      business={drop.user.business}
      brandColor={drop.user.brandColor}
    >
      {/* Hero — eyebrow / titre géant / sous-titre éditorial */}
      <header className="pt-12 pb-20">
        <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent)]">
          Guide pratique · {content.meta.estimated_read_time_sec}s
        </p>

        <h1 className="font-display text-[clamp(48px,9vw,96px)] leading-[0.95] tracking-[-0.02em]">
          {content.hook.title}
        </h1>

        <p className="mt-8 max-w-xl font-editorial text-xl leading-relaxed md:text-2xl">
          {content.hook.subtitle}
        </p>
      </header>

      {/* Image hero asymétrique (cf. Docs/04 §8 — casse la grille pour éviter le rendu centré "AI slop") */}
      {drop.imageUrl && (
        <div className="relative mb-20 -mr-12 aspect-[4/3] md:mr-0 md:ml-12">
          <Image
            src={drop.imageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 700px"
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Sections (text / stat / checklist / comparison + fallback) */}
      {content.sections.map((s, i) => (
        <SectionRenderer key={i} section={s} />
      ))}

      {/* Interaction : Quiz ou Poll selon kind. Local state pour la révélation,
          events INTERACTION_START / DONE émis via sendBeacon (cf. dropSlug). */}
      {content.interaction.kind === 'quiz' && (
        <QuizWidget quiz={content.interaction} dropSlug={drop.slug} />
      )}
      {content.interaction.kind === 'poll' && (
        <Poll poll={content.interaction} dropSlug={drop.slug} />
      )}

      {/* CTA — bouton cliquable qui passe par /api/d/<slug>/cta pour tracker
          puis rediriger vers `drop.ctaUrl`. Caché si `ctaUrl` est null. */}
      <CtaButton
        slug={drop.slug}
        ctaUrl={drop.ctaUrl}
        label={content.cta.label}
      />

    </Shell>
  )
}

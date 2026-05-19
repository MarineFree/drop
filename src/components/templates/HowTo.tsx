import Image from 'next/image'
import type { AiModel } from '@prisma/client'
import type { DropContent } from '@/lib/ai/schema'
import type { PublicDrop } from '@/lib/db/drops'
import { CtaButton } from './CtaButton'
import { Shell } from './Shell'
import { SectionRenderer } from './sections'
import { Poll } from './interactions/Poll'
import { QuizWidget } from './interactions/QuizWidget'

interface HowToProps {
  drop: PublicDrop
  viewCount: number
  modelUsed: AiModel
}

export function HowTo({ drop, viewCount, modelUsed }: HowToProps) {
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

      {/* Interaction : Quiz ou Poll selon kind. Local state, pas de tracking serveur. */}
      {content.interaction.kind === 'quiz' && <QuizWidget quiz={content.interaction} />}
      {content.interaction.kind === 'poll' && <Poll poll={content.interaction} />}

      {/* CTA — bouton cliquable qui passe par /api/d/<slug>/cta pour tracker
          puis rediriger vers `drop.ctaUrl`. Caché si `ctaUrl` est null. */}
      <CtaButton
        slug={drop.slug}
        ctaUrl={drop.ctaUrl}
        label={content.cta.label}
      />

      {/* Footer interne : meta debug pour la phase actuelle (date, vues, modèle).
          Le Shell a son propre footer de branding par-dessous. */}
      <footer className="mt-12 border-t border-[var(--text)]/20 pt-6 space-y-1 font-mono text-xs opacity-50">
        <div>
          Expire le :{' '}
          {new Intl.DateTimeFormat('fr-FR', {
            dateStyle: 'long',
            timeStyle: 'short',
          }).format(drop.expiresAt)}
        </div>
        <div>Vues (avant ce hit) : {viewCount}</div>
        <div>Modèle : {modelUsed}</div>
      </footer>
    </Shell>
  )
}

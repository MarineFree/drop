import Image from 'next/image'
import type { AiModel } from '@prisma/client'
import type { DropContent } from '@/lib/ai/schema'
import type { PublicDrop } from '@/lib/db/drops'
import { CtaButton } from './CtaButton'
import { Shell } from './Shell'
import { SectionRenderer } from './sections'
import { Poll } from './interactions/Poll'
import { QuizWidget } from './interactions/QuizWidget'

interface QuizTemplateProps {
  drop: PublicDrop
  viewCount: number
  modelUsed: AiModel
}

export function Quiz({ drop, viewCount, modelUsed }: QuizTemplateProps) {
  const content = drop.content as unknown as DropContent

  return (
    <Shell
      expiresAt={drop.expiresAt}
      business={drop.user.business}
      brandColor={drop.user.brandColor}
    >
      {/* Hero centré (contrairement à HowTo asymétrique) — l'interaction est le point central */}
      <header className="pt-20 pb-16 text-center">
        <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--accent)]">
          Auto-évaluation
        </p>

        <h1 className="mx-auto max-w-xl font-display text-[clamp(44px,8vw,84px)] leading-[1.0] tracking-[-0.02em]">
          {content.hook.title}
        </h1>

        <p className="mx-auto mt-8 max-w-md font-display text-2xl italic leading-snug opacity-85">
          {content.hook.subtitle}
        </p>
      </header>

      {/* Image hero portrait centrée — QUIZ garde son axe central (vs MANIFESTO
          asymétrique). Filter léger pour s'harmoniser avec la palette sans masquer
          le sujet. Rien rendu si pas d'imageUrl, le template reste propre. */}
      {drop.imageUrl && (
        <figure className="mx-auto my-12 max-w-md">
          <div className="relative aspect-[3/4] overflow-hidden">
            <Image
              src={drop.imageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 28rem"
              className="object-cover brightness-95 saturate-[0.9]"
              priority
            />
          </div>
        </figure>
      )}

      {/* Sections en grid de cartes glass-light (casse le rythme flow vertical).
          `--soft` est la teinte douce de la palette → cartes harmonieuses sur tout bg. */}
      <div className="my-12 grid gap-4">
        {content.sections.map((s, i) => (
          <div
            key={i}
            className="rounded-md border border-[var(--text)]/15 bg-[var(--soft)]/40 p-6 backdrop-blur-sm"
          >
            <SectionRenderer section={s} />
          </div>
        ))}
      </div>

      {/* Interaction proéminente — coeur du template QUIZ */}
      {content.interaction.kind === 'quiz' && <QuizWidget quiz={content.interaction} />}
      {content.interaction.kind === 'poll' && <Poll poll={content.interaction} />}

      {/* CTA — variant ghost (bordé), laisse respirer la card si l'accent est saturé. Caché si pas d'URL. */}
      <CtaButton
        slug={drop.slug}
        ctaUrl={drop.ctaUrl}
        label={content.cta.label}
        variant="ghost"
      />

      {/* Footer interne meta — même shape que HowTo / Manifesto pour cohérence debug */}
      <footer className="mt-12 space-y-1 border-t border-[var(--text)]/20 pt-6 font-mono text-xs opacity-50">
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

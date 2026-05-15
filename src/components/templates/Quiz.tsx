import type { AiModel } from '@prisma/client'
import type { DropContent } from '@/lib/ai/schema'
import type { PublicDrop } from '@/lib/db/drops'
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
    <Shell theme="violet" expiresAt={drop.expiresAt} business={drop.user.business}>
      {/* Hero centré (contrairement à HowTo asymétrique) — l'interaction est le point central */}
      <header className="pt-20 pb-16 text-center">
        <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.3em] opacity-80">
          Auto-évaluation
        </p>

        <h1 className="mx-auto max-w-xl font-display text-[clamp(44px,8vw,84px)] leading-[1.0] tracking-[-0.02em]">
          {content.hook.title}
        </h1>

        <p className="mx-auto mt-8 max-w-md font-display text-2xl italic leading-snug opacity-85">
          {content.hook.subtitle}
        </p>
      </header>

      {/* Pas d'image hero — l'interaction est le visuel principal (cf. Docs/04 §11) */}

      {/* Sections en grid de cartes glass-light (casse le rythme flow vertical) */}
      <div className="my-12 grid gap-4">
        {content.sections.map((s, i) => (
          <div
            key={i}
            className="rounded-md border border-cream/15 bg-cream/10 p-6 backdrop-blur-sm"
          >
            <SectionRenderer section={s} />
          </div>
        ))}
      </div>

      {/* Interaction proéminente — coeur du template QUIZ */}
      {content.interaction.kind === 'quiz' && <QuizWidget quiz={content.interaction} />}
      {content.interaction.kind === 'poll' && (
        <Poll poll={content.interaction} theme="violet" />
      )}

      {/* CTA — inversion pour fond violet (cream bg, ink text pour contraste) */}
      <section className="my-24 text-center">
        <button
          type="button"
          className="inline-block rounded-sm bg-cream px-10 py-5 font-mono text-xs uppercase tracking-[0.2em] text-ink"
        >
          {content.cta.label}
        </button>
      </section>

      {/* Footer interne meta — même shape que HowTo / Manifesto pour cohérence debug */}
      <footer className="mt-12 space-y-1 border-t border-current/20 pt-6 font-mono text-xs opacity-50">
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

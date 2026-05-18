import type { AiModel } from '@prisma/client'
import type { DropContent } from '@/lib/ai/schema'
import type { PublicDrop } from '@/lib/db/drops'
import { CtaButton } from './CtaButton'
import { Shell } from './Shell'
import { SectionRenderer } from './sections'

interface ManifestoProps {
  drop: PublicDrop
  viewCount: number
  modelUsed: AiModel
}

// Zod schema borne sections à min(2).max(4) → I à IV couvre tous les cas.
const ROMAN = ['I', 'II', 'III', 'IV'] as const

export function Manifesto({ drop, viewCount, modelUsed }: ManifestoProps) {
  const content = drop.content as unknown as DropContent
  const business = drop.user.business ?? 'Anonyme'

  return (
    <Shell theme="dark" expiresAt={drop.expiresAt} business={drop.user.business}>
      {/* Hero — pas d'image (Docs/04 §9 : "le manifeste est un acte de langage") */}
      <div className="pt-24 pb-12">
        <p className="mb-12 font-mono text-[11px] uppercase tracking-[0.3em] text-violet-soft">
          Position · {business}
        </p>

        {/* Titre Fraunces italic, géant, leading très serré */}
        <h1 className="font-display-alt italic text-[clamp(56px,12vw,140px)] leading-[0.9] tracking-[-0.03em]">
          {content.hook.title}
        </h1>

        {/* Sous-titre traité comme une "lead" éditoriale, border-l violet-soft */}
        <p className="mt-12 max-w-xl border-l-2 border-violet-soft pl-6 font-editorial text-2xl leading-snug opacity-85 md:text-3xl">
          {content.hook.subtitle}
        </p>
      </div>

      {/* Sections avec numérotation romaine en marge gauche (cf. Docs/04 §9) */}
      <div className="mt-24">
        {content.sections.map((s, i) => (
          <div key={i} className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-2 top-2 font-display-alt text-2xl italic text-violet-soft opacity-50 md:-left-12"
            >
              {ROMAN[i] ?? ''}
            </span>
            <SectionRenderer section={s} />
          </div>
        ))}
      </div>

      {/* CTA — inversion couleurs pour dark theme (cream bg, ink text). Caché si pas d'URL. */}
      <CtaButton
        slug={drop.slug}
        ctaUrl={drop.ctaUrl}
        label={content.cta.label}
        variant="light"
      />

      {/* Footer interne meta — même shape que HowTo pour cohérence debug */}
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

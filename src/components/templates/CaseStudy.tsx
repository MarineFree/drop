import Image from 'next/image'
import type { AiModel } from '@prisma/client'
import type { DropContent } from '@/lib/ai/schema'
import type { PublicDrop } from '@/lib/db/drops'
import { Shell } from './Shell'
import { SectionRenderer } from './sections'

interface CaseStudyProps {
  drop: PublicDrop
  viewCount: number
  modelUsed: AiModel
}

export function CaseStudy({ drop, viewCount, modelUsed }: CaseStudyProps) {
  const content = drop.content as unknown as DropContent

  return (
    <Shell theme="cream" expiresAt={drop.expiresAt} business={drop.user.business}>
      {/* Header longform : eyebrow ardoise + h1 Newsreader + sous-titre italic */}
      <header className="pt-12 pb-16">
        <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.25em] text-ardoise">
          Étude de cas
        </p>

        <h1 className="font-editorial text-[clamp(40px,7vw,72px)] leading-[1.05] tracking-[-0.01em]">
          {content.hook.title}
        </h1>

        <p className="mt-8 max-w-xl font-editorial text-xl italic leading-relaxed opacity-80 md:text-2xl">
          {content.hook.subtitle}
        </p>
      </header>

      {/* Image hero — signature du template : grayscale + léger boost de contraste.
          Aspect 3/2 (presse éditoriale) vs 4/3 de HOW_TO. */}
      {drop.imageUrl && (
        <div className="relative mb-16 aspect-[3/2]">
          <Image
            src={drop.imageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 700px"
            className="object-cover grayscale contrast-[1.05]"
            priority
          />
        </div>
      )}

      {/* Body en colonne lecture longform — police éditoriale Newsreader, leading généreux */}
      <article className="font-editorial text-lg leading-[1.75]">
        {content.sections.map((s, i) => (
          <SectionRenderer key={i} section={s} />
        ))}
      </article>

      {/* Pas d'interaction widget sur CASE_STUDY (Docs/04 §10) — même si
          content.interaction.kind !== 'none', on ne rend rien : le format
          étude de cas est purement narratif. */}

      {/* CTA — même style que HowTo (cream theme, ink button) */}
      <section className="my-24 text-center">
        <button
          type="button"
          className="inline-block rounded-sm bg-ink px-10 py-5 font-mono text-xs uppercase tracking-[0.2em] text-cream"
        >
          {content.cta.label}
        </button>
      </section>

      {/* Footer interne meta — même shape que les autres templates */}
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

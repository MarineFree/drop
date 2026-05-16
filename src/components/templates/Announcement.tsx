import Image from 'next/image'
import type { AiModel } from '@prisma/client'
import type { DropContent } from '@/lib/ai/schema'
import type { PublicDrop } from '@/lib/db/drops'
import { Shell } from './Shell'
import { SectionRenderer } from './sections'

interface AnnouncementProps {
  drop: PublicDrop
  viewCount: number
  modelUsed: AiModel
}

export function Announcement({ drop, viewCount, modelUsed }: AnnouncementProps) {
  const content = drop.content as unknown as DropContent

  // Date du jour — affichée en énorme rouille (cf. Docs/04 §12 :
  // "Inverse la hiérarchie classique. Donne immédiatement le sentiment
  // 'ça se passe maintenant, c'est éphémère'").
  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Shell theme="cream" expiresAt={drop.expiresAt} business={drop.user.business}>
      {/* Date énorme rouille — point d'entrée visuel, AVANT le titre */}
      <div className="pt-12 pb-6">
        <p className="font-display-alt text-rouille text-[clamp(48px,10vw,120px)] leading-[0.95] tracking-[-0.03em]">
          {today}
        </p>
      </div>

      {/* Bloc titre, après separator */}
      <div className="border-t border-current/30 pt-8 pb-12">
        <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.3em] opacity-70">
          Annonce · {drop.user.business ?? 'Anonyme'}
        </p>

        {/* H1 en Fraunces droit (pas italic) — différencie de MANIFESTO */}
        <h1 className="max-w-2xl font-display-alt text-[clamp(40px,7vw,72px)] leading-[1.05] tracking-[-0.015em]">
          {content.hook.title}
        </h1>

        <p className="mt-6 max-w-lg font-editorial text-xl italic leading-relaxed opacity-85 md:text-2xl">
          {content.hook.subtitle}
        </p>
      </div>

      {/* Image hero portrait — ratio "affiche" (l'announcement = poster) */}
      {drop.imageUrl && (
        <div className="relative mb-16 aspect-[2/3] md:aspect-[3/4]">
          <Image
            src={drop.imageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 700px"
            className="object-cover"
            priority
          />
          {/* Gradient overlay : assombrit le bas pour donner du poids visuel */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      )}

      {/* Infos pratiques en bandeau horizontal — sections en grid 2 colonnes
          (vs flow vertical des autres templates). Évoque l'affichage type "horaire / lieu". */}
      <div className="my-12 grid grid-cols-1 gap-6 border-y border-current/30 py-8 md:grid-cols-2">
        {content.sections.map((s, i) => (
          <SectionRenderer key={i} section={s} />
        ))}
      </div>

      {/* Pas d'interaction widget — format affiche transactionnelle, comme CASE_STUDY */}

      {/* CTA */}
      <section className="my-24 text-center">
        <button
          type="button"
          className="inline-block rounded-sm bg-ink px-10 py-5 font-mono text-xs uppercase tracking-[0.2em] text-cream"
        >
          {content.cta.label}
        </button>
      </section>

      {/* Footer interne meta — shape commune aux autres templates */}
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

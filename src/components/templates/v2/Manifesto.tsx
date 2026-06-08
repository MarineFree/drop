import Image from 'next/image'
import type { CSSProperties } from 'react'
import { getPalette } from '@/lib/brand-palettes'
import type { DropContent } from '@/lib/ai/schema'
import type { PublicDrop } from '@/lib/db/drops'
import { CtaButton } from '../CtaButton'
import { DropChrome, DropFooter } from './DropChrome'

interface ManifestoProps {
  drop: PublicDrop
}

/** Tokens OKLCH du Manifeste (cf. design_handoff/templates/Manifeste.html) */
const MANIFESTO_TOKENS: CSSProperties = {
  '--accent-soft': 'oklch(80% 0.12 40)',
  '--ink': 'oklch(95% 0.012 60)',
  '--ink-soft': 'oklch(74% 0.02 50)',
  '--muted': 'oklch(56% 0.025 50)',
  '--bg': 'oklch(17% 0.012 40)',
  '--bg-2': 'oklch(21% 0.016 40)',
  '--card': 'oklch(21% 0.016 40)',
  '--line': 'oklch(32% 0.02 40)',
  '--tpl-maxw': '1180px',
  fontFamily: 'var(--font-tpl-manifesto), Georgia, serif',
  background: 'var(--bg)',
  color: 'var(--ink)',
} as CSSProperties

// Numérotation romaine pour les arguments. Le schema borne sections à 2-4 → I à IV couvre tout.
const ROMAN = ['I', 'II', 'III', 'IV'] as const

/**
 * Convertit chaque section du DropContent en argument du manifeste.
 * Le design hi-fi prévoit : index romain accent + h2 grand + paragraphe.
 * On dérive selon le kind de section :
 *  - text : h2 = heading, paragraphe = body
 *  - stat : h2 = value, paragraphe = label
 *  - checklist : h2 = "Trois certitudes" (générique), paragraphes = items
 *  - comparison : h2 = "Avant / Après", paragraphes = before + after
 */
function sectionToArg(section: DropContent['sections'][number]): { heading: string; body: string } {
  switch (section.kind) {
    case 'text':
      return { heading: section.heading, body: section.body }
    case 'stat':
      return { heading: section.value, body: section.label }
    case 'checklist':
      return { heading: 'Ce qui compte', body: section.items.join(' · ') }
    case 'comparison':
      return {
        heading: 'Avant / Après',
        body: `Avant : ${section.before}\n\nAprès : ${section.after}`,
      }
  }
}

/**
 * Détecte une section "stat" pour la mettre en avant en pull statement dramatique
 * (chiffre géant centré entre bordures haut/bas, cf. design hi-fi).
 * Retourne null si aucune stat n'est présente — on saute le bloc.
 */
function findPullStat(
  sections: DropContent['sections']
): { value: string; label: string } | null {
  const stat = sections.find(s => s.kind === 'stat')
  if (!stat || stat.kind !== 'stat') return null
  return { value: stat.value, label: stat.label }
}

export function Manifesto({ drop }: ManifestoProps) {
  const content = drop.content as unknown as DropContent
  const accent = drop.user.brandColor
    ? getPalette(drop.user.brandColor).accent
    : 'oklch(72% 0.16 32)' // corail défaut Manifeste
  const pullStat = findPullStat(content.sections)
  // Les arguments excluent la stat utilisée en pullStat pour éviter le doublon
  const args = content.sections.filter(s => s.kind !== 'stat' || s !== content.sections.find(x => x.kind === 'stat'))

  return (
    <div
      className="drop-tpl min-h-screen overflow-x-hidden antialiased"
      style={{ ...MANIFESTO_TOKENS, '--accent': accent } as CSSProperties}
    >
      <DropChrome
        business={drop.user.business}
        authorTagline="freelance augmenté IA"
        createdAt={drop.createdAt}
        expiresAt={drop.expiresAt}
        showProgressBar
      />

      <div className="mx-auto max-w-[1180px] px-8 md:px-10">
        {/* ===== HERO / DÉCLARATION ===== */}
        <section className="pb-[70px] pt-[90px]">
          <div className="font-mono text-[13px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
            Manifeste · Prise de position
          </div>

          <h1
            className="mt-[30px] block w-full text-[clamp(58px,11vw,168px)] font-medium leading-[0.92] tracking-[-0.035em]"
            style={{
              fontFamily: 'var(--font-tpl-manifesto), Georgia, serif',
              textWrap: 'balance' as never,
            }}
          >
            {content.hook.title}
          </h1>

          <p
            className="mt-[44px] max-w-[30ch] text-[clamp(24px,2.6vw,34px)] italic leading-[1.4] text-[var(--ink-soft)]"
            style={{ fontFamily: "'Newsreader', Georgia, serif" }}
          >
            {content.hook.subtitle}
          </p>

          <div className="mt-10 font-mono text-[13px] tracking-[0.08em] text-[var(--muted)]">
            Par {drop.user.business ?? 'Drop'} ·{' '}
            {Math.max(1, Math.round(content.meta.estimated_read_time_sec / 60))} min
          </div>

          {/* Image fal.ai 21:9 après hero */}
          {drop.imageUrl && (
            <figure className="relative mt-[46px] aspect-[21/9] overflow-hidden rounded-[16px] border border-[var(--line)]">
              <Image
                src={drop.imageUrl}
                alt=""
                fill
                sizes="(max-width: 1180px) 100vw, 1180px"
                className="object-cover"
                priority
              />
            </figure>
          )}
        </section>

        {/* ===== ARGUMENTS ===== */}
        <div className="h-px bg-[var(--line)]" />
        <section className="grid gap-[90px] py-20 md:py-[80px]">
          {args.map((s, i) => {
            const { heading, body } = sectionToArg(s)
            return (
              <div
                key={i}
                className="grid grid-cols-1 items-start gap-6 md:grid-cols-[90px_1fr] md:gap-[34px]"
              >
                <div
                  className="text-[clamp(34px,5vw,46px)] italic leading-none text-[var(--accent)]"
                  style={{ fontFamily: 'var(--font-tpl-manifesto), Georgia, serif' }}
                >
                  {ROMAN[i] ?? ''}.
                </div>
                <div>
                  <h2
                    className="text-[clamp(34px,4.4vw,56px)] font-medium leading-[1.04] tracking-[-0.02em]"
                    style={{ fontFamily: 'var(--font-tpl-manifesto), Georgia, serif' }}
                  >
                    {heading}
                  </h2>
                  <p className="mt-[22px] max-w-[54ch] whitespace-pre-line text-[21px] leading-[1.55] text-[var(--ink-soft)]">
                    {body}
                  </p>
                </div>
              </div>
            )
          })}
        </section>

        {/* ===== PULL STAT (si une section stat existe) ===== */}
        {pullStat && (
          <section className="my-[30px] border-y border-[var(--line)] py-[70px] text-center">
            <div
              className="text-[clamp(96px,18vw,260px)] font-semibold leading-[0.82] tracking-[-0.04em] text-[var(--accent)]"
              style={{ fontFamily: 'var(--font-tpl-manifesto), Georgia, serif' }}
            >
              {pullStat.value}
            </div>
            <div className="mt-6 font-mono text-[13px] uppercase tracking-[0.16em] text-[var(--muted)]">
              {pullStat.label}
            </div>
          </section>
        )}

        {/* ===== CLOSING / CTA ===== */}
        <section className="py-[90px] pt-[70px]">
          <blockquote
            className="text-[clamp(40px,6vw,92px)] font-medium leading-[1.0] tracking-[-0.03em]"
            style={{
              fontFamily: 'var(--font-tpl-manifesto), Georgia, serif',
              textWrap: 'balance' as never,
            }}
          >
            {content.cta.label}.
          </blockquote>
          <div
            className="mt-10 text-[24px] italic text-[var(--ink-soft)]"
            style={{ fontFamily: "'Newsreader', Georgia, serif" }}
          >
            — {drop.user.business ?? 'Drop'}
          </div>
          <div className="mt-12">
            <CtaButton
              slug={drop.slug}
              ctaUrl={drop.ctaUrl}
              label={content.cta.label}
              variant="solid"
            />
          </div>
        </section>
      </div>

      <DropFooter
        business={drop.user.business}
        createdAt={drop.createdAt}
        expiresAt={drop.expiresAt}
      />
    </div>
  )
}

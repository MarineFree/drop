import Image from 'next/image'
import type { CSSProperties } from 'react'
import { getPalette } from '@/lib/brand-palettes'
import type { DropContent } from '@/lib/ai/schema'
import type { PublicDrop } from '@/lib/db/drops'
import { CtaButton } from '../CtaButton'
import { DropChrome, DropFooter } from './DropChrome'
import { HowToScrollSpy } from './HowToScrollSpy'

interface HowToProps {
  drop: PublicDrop
}

interface Step {
  id: string
  heading: string
  paragraphs: string[]
  /** Callout "À retenir" — affiché en encadré accent à la fin du step */
  note?: string
}

/**
 * Convertit `DropContent.sections` en steps narratifs.
 * Le contrat IA actuel n'a pas la shape exacte du design Guide pratique
 * (steps avec note callout), donc on dérive intelligemment :
 *  - text → step avec heading + body
 *  - stat → step avec heading=valeur, paragraphs=[label]
 *  - checklist → step "Points clés" avec items en paragraphes
 *  - comparison → step "Avant / Après" avec before + after
 */
function sectionsToSteps(sections: DropContent['sections']): Step[] {
  return sections.map((section, i) => {
    const id = `step-${i + 1}`
    switch (section.kind) {
      case 'text':
        return { id, heading: section.heading, paragraphs: [section.body] }
      case 'stat':
        return { id, heading: section.value, paragraphs: [section.label] }
      case 'checklist':
        return {
          id,
          heading: 'Points clés',
          paragraphs: section.items,
        }
      case 'comparison':
        return {
          id,
          heading: 'Avant / Après',
          paragraphs: [`Avant : ${section.before}`, `Après : ${section.after}`],
        }
    }
  })
}

/** Tokens OKLCH du Guide pratique (cf. design_handoff/templates/Guide pratique.html) */
const GUIDE_TOKENS: CSSProperties = {
  '--accent-deep': 'oklch(52% 0.12 210)',
  '--accent-wash': 'oklch(72% 0.13 196 / 0.10)',
  '--paper': 'oklch(98.5% 0.006 230)',
  '--paper-2': 'oklch(96% 0.01 230)',
  '--ink': 'oklch(26% 0.03 250)',
  '--ink-soft': 'oklch(44% 0.03 250)',
  '--muted': 'oklch(60% 0.02 250)',
  '--line': 'oklch(89% 0.012 250)',
  '--tpl-maxw': '1080px',
  fontFamily: 'var(--font-tpl-guide), system-ui, sans-serif',
  background: 'var(--paper)',
  color: 'var(--ink)',
} as CSSProperties

export function HowTo({ drop }: HowToProps) {
  const content = drop.content as unknown as DropContent
  const steps = sectionsToSteps(content.sections)
  const readingMin = Math.max(1, Math.round(content.meta.estimated_read_time_sec / 60))
  // Accent : default cyan du Guide, overridé par User.brandColor si défini.
  const accent = drop.user.brandColor ? getPalette(drop.user.brandColor).accent : 'oklch(72% 0.13 196)'

  return (
    <div
      className="drop-tpl min-h-screen antialiased"
      style={{ ...GUIDE_TOKENS, '--accent': accent } as CSSProperties}
    >
      <DropChrome
        business={drop.user.business}
        authorTagline="freelance augmenté IA"
        createdAt={drop.createdAt}
        expiresAt={drop.expiresAt}
      />

      <div className="mx-auto max-w-[1080px] px-8 md:px-10">
        {/* ===== HERO ===== */}
        <section className="border-b border-[var(--line)] pb-14 pt-[84px]">
          <div className="inline-flex items-center gap-[10px] font-mono text-[13px] uppercase tracking-[0.16em] text-[var(--accent-deep)]">
            <span className="h-[9px] w-[9px] rounded-[3px] bg-[var(--accent)]" aria-hidden />
            Guide pratique · {drop.user.business ?? 'Drop'}
          </div>

          <h1
            className="mt-[22px] block w-full text-[clamp(44px,6.4vw,80px)] font-bold leading-[1.02] tracking-[-0.03em]"
            style={{ textWrap: 'balance' as CSSProperties['textWrap'] }}
          >
            {content.hook.title}
          </h1>

          <p
            className="mt-[26px] max-w-[42ch] text-[24px] leading-[1.5] text-[var(--ink-soft)]"
            style={{ fontFamily: "'Newsreader', Georgia, serif" }}
          >
            {content.hook.subtitle}
          </p>

          <div className="mt-[34px] flex flex-wrap gap-x-[26px] gap-y-[10px] font-mono text-[13px] tracking-[0.04em] text-[var(--muted)]">
            <span className="inline-flex items-center gap-[8px]">
              ⏱ <b className="font-medium text-[var(--ink)]">{readingMin} min</b> de lecture
            </span>
            <span className="inline-flex items-center gap-[8px]">
              ✦ <b className="font-medium text-[var(--ink)]">{steps.length} étapes</b>
            </span>
            <span className="inline-flex items-center gap-[8px]">↻ Mis à jour <b className="font-medium text-[var(--ink)]">aujourd&apos;hui</b></span>
          </div>

          {/* Image hero — fal.ai, 16:9 */}
          {drop.imageUrl && (
            <figure className="relative mt-9 aspect-[16/9] overflow-hidden rounded-[14px] border border-[var(--line)]">
              <Image
                src={drop.imageUrl}
                alt=""
                fill
                sizes="(max-width: 1080px) 100vw, 1024px"
                className="object-cover"
                priority
              />
            </figure>
          )}
        </section>

        {/* ===== BODY : sticky TOC + steps ===== */}
        <div className="grid gap-14 pb-[30px] pt-[60px] md:grid-cols-[220px_1fr]">
          {/* Sommaire (caché sur mobile via Tailwind md:block) */}
          <div className="hidden md:block">
            <HowToScrollSpy
              sectionIds={steps.map(s => s.id)}
              sectionTitles={steps.map(s => s.heading)}
            />
          </div>

          <div>
            {steps.map((step, i) => (
              <section
                key={step.id}
                id={step.id}
                className="py-2 pb-14"
                style={{ scrollMarginTop: '96px' }}
              >
                <div className="mb-[18px] flex items-center gap-4">
                  <span
                    className="text-[64px] font-extrabold leading-[0.8] tracking-[-0.04em] text-[var(--accent)]"
                    style={{ fontFamily: 'var(--font-tpl-guide), system-ui, sans-serif' }}
                  >
                    {i + 1}
                  </span>
                  <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--muted)]">
                    Geste {String(i + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
                  </span>
                </div>

                <h2
                  className="text-[clamp(28px,3.4vw,40px)] font-bold leading-[1.08] tracking-[-0.02em] text-[var(--ink)]"
                  style={{ fontFamily: 'var(--font-tpl-guide), system-ui, sans-serif' }}
                >
                  {step.heading}
                </h2>

                <div
                  className="text-[20px] leading-[1.6] text-[var(--ink)]"
                  style={{ fontFamily: "'Newsreader', Georgia, serif" }}
                >
                  {step.paragraphs.map((p, j) => (
                    <p key={j} className="mt-[18px] max-w-[62ch] first:mt-[18px]">
                      {p}
                    </p>
                  ))}
                </div>

                {step.note && (
                  <div
                    className="mt-7 rounded-r-[12px] border-l-[3px] border-[var(--accent)] bg-[var(--accent-wash)] px-6 py-5"
                    style={{ background: 'var(--accent-wash)' }}
                  >
                    <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--accent-deep)]">
                      À retenir
                    </div>
                    <p className="mt-2 text-[19px] text-[var(--ink)]">{step.note}</p>
                  </div>
                )}
              </section>
            ))}

            {/* ===== CTA ===== */}
            <div className="mt-[30px] rounded-[20px] border border-[var(--line)] bg-[var(--paper-2)] px-11 py-12 text-center">
              <h3
                className="text-[34px] font-bold tracking-[-0.02em]"
                style={{ fontFamily: 'var(--font-tpl-guide), system-ui, sans-serif' }}
              >
                Envie d&apos;aller plus loin ?
              </h3>
              <p className="mx-auto mt-3 max-w-[46ch] text-[var(--ink-soft)]">
                {content.hook.subtitle}
              </p>
              <div className="mt-[26px] inline-flex">
                <CtaButton slug={drop.slug} ctaUrl={drop.ctaUrl} label={content.cta.label} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <DropFooter
        business={drop.user.business}
        createdAt={drop.createdAt}
        expiresAt={drop.expiresAt}
      />
    </div>
  )
}

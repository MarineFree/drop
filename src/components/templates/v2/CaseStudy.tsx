import Image from 'next/image'
import type { CSSProperties } from 'react'
import { getPalette } from '@/lib/brand-palettes'
import type { DropContent } from '@/lib/ai/schema'
import type { PublicDrop } from '@/lib/db/drops'
import { CtaButton } from '../CtaButton'
import { DropChrome, DropFooter } from './DropChrome'

interface CaseStudyProps {
  drop: PublicDrop
}

/** Tokens OKLCH de l'Étude de cas (cf. design_handoff/templates/Étude de cas.html) */
const CASE_TOKENS: CSSProperties = {
  '--accent-deep': 'oklch(46% 0.11 160)',
  '--accent-wash': 'oklch(58% 0.12 158 / 0.10)',
  '--paper': 'oklch(99% 0.008 150)',
  '--paper-2': 'oklch(96.5% 0.012 155)',
  '--ink': 'oklch(24% 0.02 165)',
  '--ink-soft': 'oklch(42% 0.02 165)',
  '--muted': 'oklch(58% 0.018 165)',
  '--line': 'oklch(90% 0.012 160)',
  '--tpl-maxw': '1120px',
  fontFamily: 'var(--font-tpl-case-body), system-ui, sans-serif',
  background: 'var(--paper)',
  color: 'var(--ink)',
} as CSSProperties

export function CaseStudy({ drop }: CaseStudyProps) {
  const content = drop.content as unknown as DropContent
  const accent = drop.user.brandColor
    ? getPalette(drop.user.brandColor).accent
    : 'oklch(58% 0.12 158)' // vert sauge défaut

  // Tri des sections par type pour rendu spécifique
  const stats = content.sections.filter(s => s.kind === 'stat')
  const comparisons = content.sections.filter(s => s.kind === 'comparison')
  const checklists = content.sections.filter(s => s.kind === 'checklist')
  const texts = content.sections.filter(s => s.kind === 'text')

  return (
    <div
      className="drop-tpl min-h-screen antialiased"
      style={{ ...CASE_TOKENS, '--accent': accent } as CSSProperties}
    >
      <DropChrome
        business={drop.user.business}
        authorTagline="freelance augmenté IA"
        createdAt={drop.createdAt}
        expiresAt={drop.expiresAt}
        showProgressBar
      />

      <div className="mx-auto max-w-[1120px] px-9 md:px-10">
        {/* ===== HERO ===== */}
        <section className="pb-[50px] pt-[76px]">
          <div className="inline-flex items-center gap-[10px] font-mono text-[12px] uppercase tracking-[0.16em] text-[var(--accent-deep)]">
            <span className="h-[9px] w-[9px] rounded-[3px] bg-[var(--accent)]" aria-hidden />
            Étude de cas
          </div>

          <h1
            className="mt-5 block w-full text-[clamp(38px,5vw,58px)] font-semibold leading-[1.07] tracking-[-0.02em]"
            style={{ fontFamily: 'var(--font-tpl-case), Georgia, serif' }}
          >
            {content.hook.title}
          </h1>

          <p
            className="mt-[22px] max-w-[50ch] text-[21px] text-[var(--ink-soft)]"
            style={{ fontFamily: 'var(--font-tpl-case), Georgia, serif' }}
          >
            {content.hook.subtitle}
          </p>
        </section>

        {/* ===== IMAGE 21:9 ===== */}
        {drop.imageUrl && (
          <figure className="relative aspect-[21/9] overflow-hidden rounded-[16px] border border-[var(--line)]">
            <Image
              src={drop.imageUrl}
              alt=""
              fill
              sizes="(max-width: 1120px) 100vw, 1120px"
              className="object-cover"
              priority
            />
          </figure>
        )}

        {/* ===== KPI ROW (si sections stat) ===== */}
        {stats.length > 0 && (
          <div
            className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--line)] md:grid-cols-3"
          >
            {stats.slice(0, 3).map((s, i) => {
              if (s.kind !== 'stat') return null
              return (
                <div key={i} className="bg-[var(--paper)] px-7 py-[34px]">
                  <div
                    className="text-[clamp(44px,6vw,66px)] font-bold leading-[0.9] tracking-[-0.03em] text-[var(--accent-deep)]"
                    style={{
                      fontFamily: 'var(--font-tpl-case), Georgia, serif',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {s.value}
                  </div>
                  <div className="mt-[14px] text-[15px] text-[var(--ink-soft)]">{s.label}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* ===== TEXT SECTIONS (le récit) ===== */}
        {texts.map((s, i) => {
          if (s.kind !== 'text') return null
          return (
            <section
              key={`text-${i}`}
              className="border-t border-[var(--line)] py-[58px]"
            >
              <div className="mb-[18px] font-mono text-[12px] uppercase tracking-[0.16em] text-[var(--accent-deep)]">
                Chapitre {String(i + 1).padStart(2, '0')}
              </div>
              <h2
                className="block w-full max-w-[22ch] text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em]"
                style={{ fontFamily: 'var(--font-tpl-case), Georgia, serif' }}
              >
                {s.heading}
              </h2>
              <p className="mt-[18px] max-w-[60ch] text-[18px] leading-[1.6] text-[var(--ink-soft)]">
                {s.body}
              </p>
            </section>
          )
        })}

        {/* ===== BEFORE / AFTER (si comparisons) ===== */}
        {comparisons.map((s, i) => {
          if (s.kind !== 'comparison') return null
          return (
            <section
              key={`cmp-${i}`}
              className="border-t border-[var(--line)] py-[58px]"
            >
              <div className="mb-[18px] font-mono text-[12px] uppercase tracking-[0.16em] text-[var(--accent-deep)]">
                Avant / Après
              </div>
              <h2
                className="block w-full max-w-[22ch] text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em]"
                style={{ fontFamily: 'var(--font-tpl-case), Georgia, serif' }}
              >
                Ce qui a changé
              </h2>
              <div className="mt-[30px] grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="rounded-[16px] border border-[var(--line)] bg-[var(--paper-2)] px-[26px] py-7">
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Avant
                  </div>
                  <p className="mt-4 text-[17px] leading-[1.4] text-[var(--ink-soft)]">
                    {s.before}
                  </p>
                </div>
                <div
                  className="rounded-[16px] border px-[26px] py-7"
                  style={{
                    borderColor: 'color-mix(in oklab, var(--accent) 45%, var(--line))',
                    background: 'var(--accent-wash)',
                  }}
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--accent-deep)]">
                    Après
                  </div>
                  <p className="mt-4 text-[17px] leading-[1.4] text-[var(--ink)]">{s.after}</p>
                </div>
              </div>
            </section>
          )
        })}

        {/* ===== TIMELINE-LIKE (si checklists) ===== */}
        {checklists.map((s, i) => {
          if (s.kind !== 'checklist') return null
          return (
            <section
              key={`chk-${i}`}
              className="border-t border-[var(--line)] py-[58px]"
            >
              <div className="mb-[18px] font-mono text-[12px] uppercase tracking-[0.16em] text-[var(--accent-deep)]">
                Le protocole
              </div>
              <h2
                className="block w-full max-w-[22ch] text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em]"
                style={{ fontFamily: 'var(--font-tpl-case), Georgia, serif' }}
              >
                Étapes
              </h2>
              <div className="mt-[26px] flex flex-col">
                {s.items.map((item, j) => (
                  <div
                    key={j}
                    className="grid grid-cols-1 gap-[22px] border-t border-[var(--line)] py-[22px] first:border-t-0 md:grid-cols-[90px_1fr]"
                  >
                    <div className="pt-[3px] font-mono text-[13px] text-[var(--accent-deep)]">
                      Étape {String(j + 1).padStart(2, '0')}
                    </div>
                    <div className="max-w-[54ch] text-[17px] leading-[1.55] text-[var(--ink-soft)]">
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}

        {/* ===== CTA final (carte sombre, accent button) ===== */}
        <section className="my-[60px]">
          <div
            className="rounded-[20px] px-11 py-[52px] text-center"
            style={{ background: 'var(--ink)', color: 'var(--paper)' }}
          >
            <h3
              className="text-[34px] font-semibold tracking-[-0.02em]"
              style={{ fontFamily: 'var(--font-tpl-case), Georgia, serif' }}
            >
              Votre cas est unique. La méthode, non.
            </h3>
            <p className="mx-auto mt-3 max-w-[48ch] text-[var(--paper)]/70">
              Construisons ensemble le protocole adapté à votre situation.
            </p>
            <div className="mt-7 inline-flex">
              <CtaButton
                slug={drop.slug}
                ctaUrl={drop.ctaUrl}
                label={content.cta.label}
                variant="solid"
              />
            </div>
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

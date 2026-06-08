import Image from 'next/image'
import type { CSSProperties } from 'react'
import { getPalette } from '@/lib/brand-palettes'
import type { DropContent } from '@/lib/ai/schema'
import type { PublicDrop } from '@/lib/db/drops'
import { Poll } from '../interactions/Poll'
import { CtaButton } from '../CtaButton'
import { DropChrome, DropFooter } from './DropChrome'
import { QuizMachine } from './QuizMachine'

interface QuizProps {
  drop: PublicDrop
}

/** Tokens OKLCH du Quiz (cf. design_handoff/templates/Quiz.html) */
const QUIZ_TOKENS: CSSProperties = {
  '--accent-2': 'oklch(70% 0.17 350)',
  '--ok': 'oklch(74% 0.15 155)',
  '--no': 'oklch(66% 0.16 22)',
  '--ink': 'oklch(96% 0.012 300)',
  '--ink-soft': 'oklch(78% 0.03 300)',
  '--muted': 'oklch(60% 0.04 300)',
  '--bg': 'oklch(17% 0.035 300)',
  '--bg-2': 'oklch(22% 0.045 300)',
  '--card': 'oklch(24% 0.05 300)',
  '--line': 'oklch(34% 0.05 300)',
  '--tpl-maxw': '820px',
  fontFamily: 'var(--font-tpl-quiz), system-ui, sans-serif',
  background: 'var(--bg)',
  color: 'var(--ink)',
  backgroundImage:
    'radial-gradient(600px 400px at 88% -8%, color-mix(in oklab,var(--accent) 24%, transparent), transparent 70%), radial-gradient(500px 380px at 4% 12%, color-mix(in oklab,var(--accent-2) 18%, transparent), transparent 70%)',
} as CSSProperties

export function Quiz({ drop }: QuizProps) {
  const content = drop.content as unknown as DropContent
  const accent = drop.user.brandColor
    ? getPalette(drop.user.brandColor).accent
    : 'oklch(72% 0.16 305)'

  return (
    <div
      className="drop-tpl min-h-screen antialiased"
      style={{ ...QUIZ_TOKENS, '--accent': accent } as CSSProperties}
    >
      <DropChrome
        business={drop.user.business}
        authorTagline="freelance augmenté IA"
        createdAt={drop.createdAt}
        expiresAt={drop.expiresAt}
        showProgressBar={false}
      />

      <main className="mx-auto min-h-[calc(100vh-240px)] max-w-[820px] px-8 pb-[90px] pt-14 md:px-10">
        {/* ===== INTRO HERO ===== */}
        <section>
          <div className="inline-flex items-center gap-[10px] font-mono text-[13px] uppercase tracking-[0.18em] text-[var(--accent)]">
            <span className="h-[9px] w-[9px] rounded-[3px] bg-[var(--accent)]" aria-hidden />
            Quiz · 1 minute
          </div>

          <h1
            className="mt-[22px] block w-full text-[clamp(42px,7vw,78px)] font-bold leading-[1.0] tracking-[-0.03em]"
            style={{
              fontFamily: 'var(--font-tpl-quiz), system-ui, sans-serif',
              textWrap: 'balance' as never,
            }}
          >
            {content.hook.title}
          </h1>

          <p className="mt-[22px] max-w-[46ch] text-[21px] text-[var(--ink-soft)]">
            {content.hook.subtitle}
          </p>

          {/* Image hero — fal.ai, 16:9 */}
          {drop.imageUrl && (
            <figure className="relative mt-[30px] aspect-[16/9] overflow-hidden rounded-[16px] border border-[var(--line)]">
              <Image
                src={drop.imageUrl}
                alt=""
                fill
                sizes="(max-width: 820px) 100vw, 820px"
                className="object-cover"
                priority
              />
            </figure>
          )}

          <div className="mt-[26px] flex flex-wrap gap-[22px] font-mono text-[13px] text-[var(--muted)]">
            <span>
              <b className="font-medium text-[var(--accent)]">1</b> question
            </span>
            <span>
              <b className="font-medium text-[var(--accent)]">~1</b> min
            </span>
            <span>Score en direct</span>
          </div>
        </section>

        {/* ===== INTERACTION ===== */}
        {content.interaction.kind === 'quiz' && (
          <QuizMachine quiz={content.interaction} dropSlug={drop.slug} />
        )}
        {content.interaction.kind === 'poll' && (
          <div className="my-12">
            <Poll poll={content.interaction} dropSlug={drop.slug} />
          </div>
        )}
        {content.interaction.kind === 'none' && (
          <div className="my-12 rounded-[15px] border border-[var(--line)] bg-[var(--card)] px-6 py-8 text-center text-[var(--ink-soft)]">
            {content.cta.label}
          </div>
        )}

        {/* ===== CTA ===== */}
        <div className="mt-8 inline-flex">
          <CtaButton
            slug={drop.slug}
            ctaUrl={drop.ctaUrl}
            label={content.cta.label}
            variant="ghost"
          />
        </div>
      </main>

      <DropFooter
        business={drop.user.business}
        createdAt={drop.createdAt}
        expiresAt={drop.expiresAt}
      />
    </div>
  )
}

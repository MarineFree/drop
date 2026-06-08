import Image from 'next/image'
import type { CSSProperties } from 'react'
import { getPalette } from '@/lib/brand-palettes'
import type { DropContent } from '@/lib/ai/schema'
import type { PublicDrop } from '@/lib/db/drops'
import { CtaButton } from '../CtaButton'
import { DropChrome, DropFooter } from './DropChrome'
import { EventCountdown } from './EventCountdown'

interface AnnouncementProps {
  drop: PublicDrop
}

/** Tokens OKLCH de l'Annonce (cf. design_handoff/templates/Annonce.html) */
const ANNOUNCE_TOKENS: CSSProperties = {
  '--accent-2': 'oklch(72% 0.16 45)',
  '--ink': 'oklch(96% 0.02 80)',
  '--ink-soft': 'oklch(80% 0.03 75)',
  '--muted': 'oklch(62% 0.04 70)',
  '--bg': 'oklch(18% 0.02 60)',
  '--bg-2': 'oklch(22% 0.028 60)',
  '--card': 'oklch(24% 0.03 60)',
  '--line': 'oklch(34% 0.035 60)',
  '--tpl-maxw': '1140px',
  fontFamily: 'var(--font-tpl-announce), system-ui, sans-serif',
  background: 'var(--bg)',
  color: 'var(--ink)',
  backgroundImage:
    'radial-gradient(800px 500px at 92% -10%, color-mix(in oklab,var(--accent) 20%, transparent), transparent 66%)',
} as CSSProperties

/**
 * Date cible de l'événement : J+8, 18h30. Statique côté serveur pour cohérence
 * SSR/CSR. Le contrat IA actuel n'a pas de champ `event_date`, donc on hardcode
 * comme le HTML hi-fi (Phase 2 : étendre le schema avec un champ optionnel).
 */
function getEventTarget(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 8)
  d.setHours(18, 30, 0, 0)
  return d
}

export function Announcement({ drop }: AnnouncementProps) {
  const content = drop.content as unknown as DropContent
  const accent = drop.user.brandColor
    ? getPalette(drop.user.brandColor).accent
    : 'oklch(80% 0.15 75)'

  const eventTarget = getEventTarget()
  const weekday = eventTarget.toLocaleDateString('fr-FR', { weekday: 'long' })
  const dayMonth = eventTarget.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

  return (
    <div
      className="drop-tpl min-h-screen overflow-x-hidden antialiased"
      style={{ ...ANNOUNCE_TOKENS, '--accent': accent } as CSSProperties}
    >
      <DropChrome
        business={drop.user.business}
        authorTagline="freelance augmenté IA"
        createdAt={drop.createdAt}
        expiresAt={drop.expiresAt}
        showProgressBar={false}
      />

      <div className="mx-auto max-w-[1140px] px-8 md:px-10">
        {/* ===== POSTER HERO ===== */}
        <section className="pb-12 pt-[60px]">
          <div className="flex flex-wrap items-center gap-[14px]">
            <span className="font-mono text-[13px] uppercase tracking-[0.14em] text-[var(--accent)]">
              Annonce
            </span>
            <span className="font-mono text-[13px] uppercase tracking-[0.14em] text-[var(--accent)] before:mr-[14px] before:text-[var(--muted)] before:content-['•']">
              {drop.user.business ?? 'Drop'}
            </span>
          </div>

          <h1
            className="mt-[22px] block w-full text-[clamp(64px,13vw,184px)] font-normal uppercase leading-[0.86] tracking-[0.005em]"
            style={{ fontFamily: 'var(--font-tpl-announce), system-ui, sans-serif' }}
          >
            {content.hook.title}
          </h1>

          <p className="mt-6 max-w-[46ch] text-[22px] text-[var(--ink-soft)]">
            {content.hook.subtitle}
          </p>

          {/* Image hero — fal.ai, 21:9 */}
          {drop.imageUrl && (
            <figure className="relative mt-9 aspect-[21/9] overflow-hidden rounded-[16px] border border-[var(--line)]">
              <Image
                src={drop.imageUrl}
                alt=""
                fill
                sizes="(max-width: 1140px) 100vw, 1140px"
                className="object-cover"
                priority
              />
            </figure>
          )}

          {/* Bande date */}
          <div className="mt-[38px] flex flex-wrap items-baseline gap-x-10 gap-y-[14px] border-b-2 border-t-2 border-[var(--line)] py-[26px]">
            <div
              className="text-[clamp(30px,4.4vw,52px)] uppercase tracking-[0.01em]"
              style={{ fontFamily: 'var(--font-tpl-announce), system-ui, sans-serif' }}
            >
              <span className="text-[var(--accent)]">
                {weekday.charAt(0).toUpperCase() + weekday.slice(1)}
              </span>{' '}
              <span>{dayMonth}</span>
            </div>
            <div
              className="text-[clamp(30px,4.4vw,52px)] uppercase"
              style={{ fontFamily: 'var(--font-tpl-announce), system-ui, sans-serif' }}
            >
              18<span className="text-[var(--accent)]">:</span>30
            </div>
            <div className="font-mono text-[14px] tracking-[0.04em] text-[var(--ink-soft)]">
              Lieu à confirmer · {drop.user.business ?? 'Drop'}
            </div>
          </div>

          {/* Compte à rebours */}
          <EventCountdown target={eventTarget} />

          {/* CTA */}
          <div className="mt-9 inline-flex">
            <CtaButton slug={drop.slug} ctaUrl={drop.ctaUrl} label={content.cta.label} />
          </div>
        </section>

        {/* ===== CONTENT (sections en bandeau infos) ===== */}
        {content.sections.length > 0 && (
          <section className="border-t border-[var(--line)] py-16">
            <h2
              className="block w-full text-[clamp(30px,4.4vw,52px)] font-normal uppercase leading-[0.95] tracking-[0.01em]"
              style={{ fontFamily: 'var(--font-tpl-announce), system-ui, sans-serif' }}
            >
              Au programme
            </h2>

            <div className="mt-[30px] grid grid-cols-1 gap-px overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--line)] md:grid-cols-2">
              {content.sections.map((s, i) => {
                const label =
                  s.kind === 'text'
                    ? s.heading
                    : s.kind === 'stat'
                      ? s.value
                      : s.kind === 'checklist'
                        ? 'Points clés'
                        : 'Avant / Après'
                const body =
                  s.kind === 'text'
                    ? s.body
                    : s.kind === 'stat'
                      ? s.label
                      : s.kind === 'checklist'
                        ? s.items.join(' · ')
                        : `Avant : ${s.before} — Après : ${s.after}`
                return (
                  <div key={i} className="bg-[var(--bg)] px-7 py-7">
                    <div className="font-mono text-[13px] tracking-[0.04em] text-[var(--accent)]">
                      {String(i + 1).padStart(2, '0')} — {label}
                    </div>
                    <p className="mt-2 text-[16px] text-[var(--ink-soft)]">{body}</p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

      </div>

      <DropFooter
        business={drop.user.business}
        createdAt={drop.createdAt}
        expiresAt={drop.expiresAt}
      />
    </div>
  )
}

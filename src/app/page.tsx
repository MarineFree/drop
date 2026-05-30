import Link from 'next/link'
import { HeroDemo } from '@/components/landing/HeroDemo'
import { LandingCountdown } from '@/components/landing/LandingCountdown'
import { ScrollReveal } from '@/components/landing/ScrollReveal'
import { StickyHeader } from '@/components/landing/StickyHeader'
import { getCurrentUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// Direction B — landing dark + cyan + Space Grotesk.
// Cf. `Claude design/Drop - Direction B.html` pour la maquette source.
// Tout est scopé sous `.lp-root` (cf. globals.css) pour ne pas leaker sur le reste de l'app.
export default async function HomePage() {
  const user = await getCurrentUser()
  const isAuthed = user !== null
  const ctaHref = isAuthed ? '/new' : '/signin'
  const navAuthHref = isAuthed ? '/dashboard' : '/signin'
  const navAuthLabel = isAuthed ? 'Dashboard' : 'Se connecter'
  const ctaLabel = isAuthed ? 'Nouveau drop' : 'Commencer'
  const ctaLargeLabel = isAuthed ? 'Créer un drop' : 'Commencer gratuitement'

  return (
    <div className="lp-root min-h-screen overflow-x-hidden">
      <StickyHeader>
        <div className="mx-auto flex h-[74px] max-w-[1140px] items-center justify-between px-8">
          <Link
            href="/"
            className="flex items-center gap-3 font-[var(--font-lp-display)] text-[21px] font-bold tracking-[-0.02em]"
            style={{ color: 'var(--lp-text)' }}
          >
            <span aria-hidden className="lp-drop-mark" />
            Drop.
          </Link>
          <nav className="flex items-center gap-6">
            <a
              href="#how"
              className="hidden text-[15px] font-medium transition md:inline"
              style={{ color: 'var(--lp-muted)' }}
            >
              Comment ça marche
            </a>
            <a
              href="#formats"
              className="hidden text-[15px] font-medium transition md:inline"
              style={{ color: 'var(--lp-muted)' }}
            >
              Formats
            </a>
            <Link
              href={navAuthHref}
              className="text-[15px] font-medium transition"
              style={{ color: 'var(--lp-muted)' }}
            >
              {navAuthLabel}
            </Link>
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-[var(--font-lp-display)] text-[15px] font-semibold transition"
              style={{
                background: 'var(--lp-accent)',
                color: 'oklch(20% 0.04 230)',
                boxShadow:
                  '0 0 0 1px var(--lp-accent), 0 8px 30px -8px var(--lp-glow)',
              }}
            >
              {ctaLabel}
            </Link>
          </nav>
        </div>
      </StickyHeader>

      <main>
        {/* ─── HERO ────────────────────────────────────────────────── */}
        <section className="pb-10 pt-24">
          <div className="mx-auto max-w-[1140px] px-8">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-[var(--font-mono)] text-[12px] font-medium uppercase tracking-[0.08em]"
              style={{
                color: 'var(--lp-accent)',
                borderColor: 'var(--lp-line)',
                background: 'oklch(82% 0.15 196 / 0.06)',
              }}
            >
              <span
                aria-hidden
                className="lp-pulse block h-1.5 w-1.5 rounded-full"
                style={{
                  background: 'var(--lp-accent)',
                  boxShadow: '0 0 10px var(--lp-accent)',
                }}
              />
              Pour patrons de TPE / PME
            </span>

            <h1
              className="mt-7 font-[var(--font-lp-display)] text-[clamp(44px,7vw,88px)] font-bold leading-[0.98] tracking-[-0.04em] text-balance"
              style={{ color: 'var(--lp-text)' }}
            >
              Une idée.
              <br />
              <span
                className="bg-clip-text"
                style={{
                  backgroundImage:
                    'linear-gradient(100deg, var(--lp-accent), var(--lp-accent-2) 70%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                90 secondes.
              </span>
              <br />
              Un mini-site partageable.
            </h1>

            <p
              className="mt-6 max-w-[48ch] text-[clamp(17px,1.5vw,21px)]"
              style={{ color: 'var(--lp-muted)' }}
            >
              Tape une phrase ou dicte un vocal. Drop choisit le bon format,
              écrit le contenu, génère l&apos;image, et te rend un lien à
              partager. Le site s&apos;auto-détruit après sept jours.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 rounded-[13px] px-7 py-4 font-[var(--font-lp-display)] text-base font-semibold transition"
                style={{
                  background: 'var(--lp-accent)',
                  color: 'oklch(20% 0.04 230)',
                  boxShadow:
                    '0 0 0 1px var(--lp-accent), 0 8px 30px -8px var(--lp-glow)',
                }}
              >
                {ctaLargeLabel}
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-[13px] border px-7 py-4 font-[var(--font-lp-display)] text-base font-semibold transition"
                style={{
                  background: 'transparent',
                  color: 'var(--lp-text)',
                  borderColor: 'var(--lp-line)',
                }}
              >
                Voir le flow ↓
              </a>
            </div>

            {!isAuthed && (
              <p className="mt-4 text-sm" style={{ color: 'var(--lp-faint)' }}>
                <strong style={{ color: 'var(--lp-muted)' }}>Sans mot de passe.</strong>{' '}
                Lien magique par email.
              </p>
            )}

            <ScrollReveal>
              <HeroDemo />
            </ScrollReveal>

            <div
              className="mt-10 flex flex-wrap items-center gap-4 font-[var(--font-mono)] text-[13px]"
              style={{ color: 'var(--lp-faint)' }}
            >
              <span>
                <strong style={{ color: 'var(--lp-accent)', fontWeight: 500 }}>
                  90s
                </strong>{' '}
                — du brief au lien
              </span>
              <span>·</span>
              <span>
                <strong style={{ color: 'var(--lp-accent)', fontWeight: 500 }}>
                  5
                </strong>{' '}
                formats intelligents
              </span>
              <span>·</span>
              <span>
                <strong style={{ color: 'var(--lp-accent)', fontWeight: 500 }}>
                  7j
                </strong>{' '}
                puis auto-destruction
              </span>
            </div>
          </div>
        </section>

        {/* ─── COMMENT ÇA MARCHE ──────────────────────────────────── */}
        <section id="how" className="py-[104px]">
          <div className="mx-auto max-w-[1140px] px-8">
            <ScrollReveal>
              <p
                className="font-[var(--font-mono)] text-[12px] uppercase tracking-[0.1em]"
                style={{ color: 'var(--lp-accent)' }}
              >
                {'// comment ça marche'}
              </p>
              <h2
                className="mt-4 font-[var(--font-lp-display)] text-[clamp(30px,3.8vw,48px)] font-bold leading-tight tracking-[-0.035em] text-balance"
              >
                Trois gestes. Un lien qui vit sept jours.
              </h2>
            </ScrollReveal>

            <ScrollReveal>
              <div
                className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border md:grid-cols-3"
                style={{ background: 'var(--lp-line)', borderColor: 'var(--lp-line)' }}
              >
                <Step
                  n="01"
                  title="Tu décris"
                  body="Une phrase qui explique ton offre, ton événement ou ta position. Pas besoin de rédiger : la première version brute suffit."
                  icon={
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  }
                />
                <Step
                  n="02"
                  title="L'IA choisit"
                  body="Le modèle sélectionne le format le plus adapté parmi cinq. Chaque template a sa propre identité visuelle, écrite et illustrée pour toi."
                  icon={
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3v2m0 14v2m9-9h-2M5 12H3m13.5-6.5-1.5 1.5M8 16l-1.5 1.5m11 0L16 16M8 8 6.5 6.5" />
                      <circle cx="12" cy="12" r="3.5" />
                    </svg>
                  }
                />
                <Step
                  n="03"
                  title="Tu partages"
                  body="Le lien part sur WhatsApp, LinkedIn, SMS. Tu suis les vues et l'activité en temps réel. Sept jours plus tard, le site disparaît."
                  icon={
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
                    </svg>
                  }
                />
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ─── FORMATS ──────────────────────────────────────────── */}
        <section
          id="formats"
          className="border-y py-[104px]"
          style={{
            borderColor: 'var(--lp-line)',
            background:
              'linear-gradient(180deg, var(--lp-bg), var(--lp-bg2) 60%, var(--lp-bg))',
          }}
        >
          <div className="mx-auto max-w-[1140px] px-8">
            <ScrollReveal>
              <p
                className="font-[var(--font-mono)] text-[12px] uppercase tracking-[0.1em]"
                style={{ color: 'var(--lp-accent)' }}
              >
                {'// les formats'}
              </p>
              <h2 className="mt-4 font-[var(--font-lp-display)] text-[clamp(30px,3.8vw,48px)] font-bold leading-tight tracking-[-0.035em] text-balance">
                Cinq templates. Chacun sa voix.
              </h2>
              <p
                className="mt-4 max-w-[54ch] text-[17px]"
                style={{ color: 'var(--lp-muted)' }}
              >
                Tu n&apos;as rien à choisir. Drop lit ton intention et habille
                ton idée dans le bon costume — typographie, structure, image.
              </p>
            </ScrollReveal>

            <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-10">
              <FormatCard
                num="format_01"
                label="GUIDE PRATIQUE"
                title="Explique, étape par étape"
                body="Pour les modes d'emploi et les « comment faire ». Sommaire clair, sections numérotées, ton pédagogue."
                accent="oklch(82% 0.14 196)"
                span="md:col-span-6"
              />
              <FormatCard
                num="format_02"
                label="MANIFESTE"
                title="Prends position"
                body="Grand titre, ton tranché. Pour marquer les esprits."
                accent="oklch(72% 0.15 30)"
                span="md:col-span-4"
              />
              <FormatCard
                num="format_03"
                label="ÉTUDE DE CAS"
                title="Montre la preuve"
                body="Avant / après, chiffres, résultat. Pour rassurer un prospect."
                accent="oklch(78% 0.14 150)"
                span="md:col-span-4"
              />
              <FormatCard
                num="format_04"
                label="QUIZ"
                title="Fais participer"
                body="Questions + résultat perso. Se partage tout seul."
                accent="oklch(74% 0.15 300)"
                span="md:col-span-3"
              />
              <FormatCard
                num="format_05"
                label="ANNONCE"
                title="Crée l'événement"
                body="Date, promo, compte à rebours intégré + bouton d'action."
                accent="oklch(80% 0.14 75)"
                span="md:col-span-3"
              />
            </div>
          </div>
        </section>

        {/* ─── ÉPHÉMÈRE ─────────────────────────────────────────── */}
        <section className="py-[104px]">
          <div className="mx-auto grid max-w-[1140px] grid-cols-1 items-center gap-14 px-8 md:grid-cols-2">
            <ScrollReveal>
              <p
                className="font-[var(--font-mono)] text-[12px] uppercase tracking-[0.1em]"
                style={{ color: 'var(--lp-accent)' }}
              >
                {`// le pari de l'éphémère`}
              </p>
              <h2 className="mt-4 font-[var(--font-lp-display)] text-[clamp(30px,3.8vw,48px)] font-bold leading-tight tracking-[-0.035em] text-balance">
                Sept jours. Puis plus rien.
              </h2>
              <p
                className="mt-4 max-w-[54ch] text-[17px]"
                style={{ color: 'var(--lp-muted)' }}
              >
                Pas d&apos;archive qui traîne, pas de site fantôme à maintenir.
                L&apos;urgence douce du compte à rebours donne envie de cliquer
                maintenant — et te libère de la gestion. Tu crées, tu partages,
                tu passes à autre chose.
              </p>
              <div className="mt-8">
                <Link
                  href={ctaHref}
                  className="inline-flex items-center gap-2 rounded-[13px] px-7 py-4 font-[var(--font-lp-display)] text-base font-semibold transition"
                  style={{
                    background: 'var(--lp-accent)',
                    color: 'oklch(20% 0.04 230)',
                    boxShadow:
                      '0 0 0 1px var(--lp-accent), 0 8px 30px -8px var(--lp-glow)',
                  }}
                >
                  Lancer mon premier Drop
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <LandingCountdown />
            </ScrollReveal>
          </div>
        </section>

        {/* ─── CTA FINAL ────────────────────────────────────────── */}
        <section className="py-[104px] text-center">
          <div className="mx-auto max-w-[1140px] px-8">
            <ScrollReveal>
              <h2 className="mx-auto max-w-[16ch] font-[var(--font-lp-display)] text-[clamp(34px,5vw,68px)] font-bold leading-none tracking-[-0.04em] text-balance">
                Ton idée mérite un lien.
                <br />
                <span
                  className="bg-clip-text"
                  style={{
                    backgroundImage:
                      'linear-gradient(100deg, var(--lp-accent), var(--lp-accent-2) 70%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Pas un projet.
                </span>
              </h2>
              <p
                className="mx-auto mt-6 max-w-[42ch] text-lg"
                style={{ color: 'var(--lp-muted)' }}
              >
                Décris-la. Drop s&apos;occupe du format, du texte, de
                l&apos;image et du partage. En 90 secondes.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href={ctaHref}
                  className="inline-flex items-center gap-2 rounded-[13px] px-7 py-4 font-[var(--font-lp-display)] text-base font-semibold transition"
                  style={{
                    background: 'var(--lp-accent)',
                    color: 'oklch(20% 0.04 230)',
                    boxShadow:
                      '0 0 0 1px var(--lp-accent), 0 8px 30px -8px var(--lp-glow)',
                  }}
                >
                  {isAuthed ? 'Créer un drop' : "Commencer — c'est gratuit"}
                </Link>
                {!isAuthed && (
                  <Link
                    href="/signin"
                    className="inline-flex items-center gap-2 rounded-[13px] border px-7 py-4 font-[var(--font-lp-display)] text-base font-semibold transition"
                    style={{
                      background: 'transparent',
                      color: 'var(--lp-text)',
                      borderColor: 'var(--lp-line)',
                    }}
                  >
                    Se connecter
                  </Link>
                )}
              </div>
              {!isAuthed && (
                <p
                  className="mt-5 text-sm"
                  style={{ color: 'var(--lp-faint)' }}
                >
                  Sans mot de passe. Lien magique par email.
                </p>
              )}
            </ScrollReveal>
          </div>
        </section>
      </main>

      <footer
        className="border-t py-10"
        style={{ borderColor: 'var(--lp-line)' }}
      >
        <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-4 px-8">
          <Link
            href="/"
            className="flex items-center gap-3 font-[var(--font-lp-display)] text-[21px] font-bold tracking-[-0.02em]"
          >
            <span aria-hidden className="lp-drop-mark" />
            Drop.
          </Link>
          <span
            className="font-[var(--font-mono)] text-xs"
            style={{ color: 'var(--lp-faint)' }}
          >
            Drop éphémère · Académie IApreneurs × Hostinger
          </span>
        </div>
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Sub-components (Server)
// ─────────────────────────────────────────────────────────────────────

function Step({
  n,
  title,
  body,
  icon,
}: {
  n: string
  title: string
  body: string
  icon: React.ReactNode
}) {
  return (
    <div
      className="relative p-9 transition"
      style={{ background: 'var(--lp-bg)' }}
    >
      <span
        className="font-[var(--font-mono)] text-[13px] tracking-[0.06em]"
        style={{ color: 'var(--lp-accent)' }}
      >
        {n}
      </span>
      <div
        className="mt-6 grid h-[46px] w-[46px] place-items-center rounded-xl border"
        style={{
          background: 'oklch(82% 0.15 196 / 0.08)',
          borderColor: 'var(--lp-line)',
          color: 'var(--lp-accent)',
        }}
      >
        {icon}
      </div>
      <h3 className="mt-5 font-[var(--font-lp-display)] text-[21px] font-semibold tracking-[-0.01em]">
        {title}
      </h3>
      <p className="mt-2.5 text-[15px]" style={{ color: 'var(--lp-muted)' }}>
        {body}
      </p>
    </div>
  )
}

function FormatCard({
  num,
  label,
  title,
  body,
  accent,
  span,
}: {
  num: string
  label: string
  title: string
  body: string
  accent: string
  span: string
}) {
  return (
    <article
      className={`lp-fcard relative overflow-hidden rounded-2xl border p-6 ${span}`}
      style={
        {
          background: 'var(--lp-panel)',
          borderColor: 'var(--lp-line)',
          '--c': accent,
        } as React.CSSProperties
      }
    >
      <span
        aria-hidden
        className="lp-fbeam absolute -right-10 -top-10 h-[140px] w-[140px] rounded-full"
        style={{ filter: 'blur(50px)', opacity: 0.16 }}
      />
      <p
        className="font-[var(--font-mono)] text-[12px]"
        style={{ color: 'var(--lp-faint)' }}
      >
        {num}
      </p>
      <div className="mt-3.5 inline-flex items-center gap-2 font-[var(--font-mono)] text-[12px] font-medium">
        <span aria-hidden className="lp-fsq block h-2.5 w-2.5 rounded-[2px]" />
        {label}
      </div>
      <h4 className="mt-3.5 font-[var(--font-lp-display)] text-[21px] font-semibold tracking-[-0.01em]">
        {title}
      </h4>
      <p className="mt-2.5 text-sm" style={{ color: 'var(--lp-muted)' }}>
        {body}
      </p>
    </article>
  )
}

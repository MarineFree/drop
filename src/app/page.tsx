import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getCurrentUser()
  const isAuthed = user !== null

  return (
    <div className="min-h-screen bg-cream-grain font-body text-ink antialiased">
      {/* Nav top — mêmes codes que /dashboard mais sans business ni signout */}
      <nav className="border-b border-ink/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-display text-2xl tracking-tight">Drop.</span>
          <Link
            href={isAuthed ? '/dashboard' : '/signin'}
            className="font-mono text-[11px] uppercase tracking-[0.15em] opacity-70 transition hover:opacity-100"
          >
            {isAuthed ? 'Mon dashboard' : 'Se connecter'}
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        {/* Eyebrow */}
        <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.25em] text-violet">
          Pour patrons de TPE/PME
        </p>

        {/* H1 */}
        <h1 className="font-display text-[clamp(44px,8vw,84px)] leading-[0.95] tracking-[-0.02em]">
          Une idée. 90 secondes.
          <br />
          Un mini-site partageable.
        </h1>

        {/* Subtitle éditorial */}
        <p className="mt-10 max-w-2xl font-editorial text-xl italic leading-relaxed opacity-80 md:text-2xl">
          Tape une phrase ou dicte un vocal. Drop choisit le bon format, écrit le contenu,
          génère l&apos;image, et te rend un lien à partager. Le site s&apos;auto-détruit
          après sept jours.
        </p>

        {/* CTAs */}
        <div className="mt-12 flex flex-col items-start gap-4 md:flex-row md:items-center">
          <Link
            href={isAuthed ? '/new' : '/signin'}
            className="inline-block bg-ink px-10 py-5 font-mono text-xs uppercase tracking-[0.2em] text-cream transition hover:opacity-90"
          >
            {isAuthed ? 'Nouveau Drop' : 'Commencer'}
          </Link>
          {!isAuthed && (
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
              Sans mot de passe. Lien magique par email.
            </p>
          )}
        </div>

        {/* Comment ça marche — 3 étapes */}
        <section className="mt-32 border-t border-ink/15 pt-16">
          <p className="mb-10 font-mono text-[11px] uppercase tracking-[0.25em] opacity-60">
            Comment ça marche
          </p>
          <ol className="space-y-10">
            <Step n="01" title="Tu décris">
              Une phrase qui explique ton offre, ton événement, ou ta position. Pas besoin
              de rédiger : la première version brute suffit.
            </Step>
            <Step n="02" title="L&apos;IA choisit">
              Le modèle sélectionne le format le plus adapté parmi cinq : guide pratique,
              manifeste, étude de cas, quiz, annonce. Chaque template a sa propre identité
              visuelle.
            </Step>
            <Step n="03" title="Tu partages">
              Le lien part sur WhatsApp, LinkedIn, SMS. Tu suis les vues et l&apos;activité
              en temps réel. Sept jours plus tard, le site disparaît.
            </Step>
          </ol>
        </section>

        {/* Re-CTA en bas */}
        <section className="mt-24 text-center">
          <Link
            href={isAuthed ? '/new' : '/signin'}
            className="inline-block bg-ink px-10 py-5 font-mono text-xs uppercase tracking-[0.2em] text-cream transition hover:opacity-90"
          >
            {isAuthed ? 'Créer un Drop' : 'Essayer maintenant'}
          </Link>
        </section>
      </main>

      <footer className="border-t border-ink/10 px-6 py-8">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
          Drop éphémère · Académie IApreneurs × Hostinger
        </p>
      </footer>
    </div>
  )
}

function Step({
  n,
  title,
  children,
}: {
  n: string
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-6 md:gap-8">
      <span className="font-display text-2xl leading-none text-violet tabular-nums">
        {n}
      </span>
      <div className="flex-1">
        <p className="font-display text-2xl leading-tight">{title}</p>
        <p className="mt-2 font-editorial text-lg leading-relaxed opacity-80">
          {children}
        </p>
      </div>
    </li>
  )
}

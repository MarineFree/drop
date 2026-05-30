# 06 — Dashboard Patron

L'espace où le patron PME crée, suit et gère ses Drops. Cohérent visuellement avec les templates publics, mais plus dense et utilitaire.

---

## 1. Principe directeur

Le dashboard est **utilitaire mais pas générique**. Tentation à éviter : reproduire un dashboard Linear/Vercel avec sidebar grise + cards arrondies + iconographie Lucide partout. Ce rendu admin générique casserait la cohérence avec les pages publiques.

Règles :
- Mêmes fonts que les templates (Instrument Serif + JetBrains Mono + Geist).
- Mêmes couleurs (cream / ink / violet / ardoise).
- **Pas de sidebar.** Navigation horizontale top, plus aérée, plus mature.
- Données dénudées : pas de gradients, pas de skeumorphisme, pas de "doughnut chart" inutile.
- Une typo plus dense pour les listes (Geist 14 px), mais on garde le serif pour les titres.

---

## 2. Pages à construire

Pas de route group `(creator)/` : les pages vivent directement sous `src/app/` aux chemins finaux. La protection auth se fait par `requireUser()` dans chaque Server Component sensible (cf. Docs/05 §9 et §10).

```
src/app/
├── dashboard/
│   ├── page.tsx            # liste des drops + KPIs globaux
│   ├── d/[id]/
│   │   └── page.tsx        # détail d'un drop + stats
│   └── settings/
│       └── page.tsx        # profil + préférences
├── new/
│   └── page.tsx            # création (couvert dans 03-pipeline)
└── onboarding/
    └── page.tsx            # 1ère connexion : business + trade
```

> Pour partager le header `DashboardHeader` entre `/dashboard`, `/dashboard/d/[id]`, `/dashboard/settings` (et `/new`), il est monté **en composant** dans chaque page, pas via un `layout.tsx` parent.

---

## 3. Header du dashboard (`src/components/dashboard/DashboardHeader.tsx`)

> **Notes sur les snippets §3 à §11** :
> - Les imports `motion/react` (framer-motion) sont illustratifs ; l'implémentation réelle est CSS-only (`@keyframes` dans `globals.css`, classes `animate-fade-in` / `animate-slide-up`). Cf. `CLAUDE.md`.
> - L'auth n'est pas faite via un `layout.tsx` parent : chaque Server Component (`/dashboard/page.tsx`, `/dashboard/d/[id]/page.tsx`, etc.) appelle directement `requireUser()` puis monte `<DashboardHeader user={user} />` au-dessus de son contenu.

```tsx
import Link from 'next/link'
import type { User } from '@prisma/client'
import { SignOutButton } from '@/components/dashboard/SignOutButton'

export function DashboardHeader({ user }: { user: User }) {
  return (
    <nav className="border-b border-ink/10">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/dashboard" className="font-display text-2xl tracking-tight">
          Drop.
        </Link>

        <div className="flex items-center gap-8">
          <NavLink href="/dashboard">Drops</NavLink>
          <NavLink href="/dashboard/settings">Compte</NavLink>
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] opacity-50">
            {user.business ?? user.email}
          </span>
          <SignOutButton />
        </div>
      </div>
    </nav>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-mono text-[11px] uppercase tracking-[0.15em] opacity-70 hover:opacity-100 transition"
    >
      {children}
    </Link>
  )
}
```

Pas de logo Lucide, pas d'avatar généré. La nav est honnête.

---

## 4. Page dashboard (`src/app/dashboard/page.tsx`)

```tsx
import Link from 'next/link'
import { requireUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { DropCard } from '@/components/dashboard/drop-card'
import { KpiGrid } from '@/components/dashboard/kpi-grid'

export default async function DashboardPage() {
  const user = await requireUser()
  if (!user.business || !user.trade) redirect('/dashboard/onboarding')

  // En parallèle
  const [drops, totals] = await Promise.all([
    prisma.drop.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, slug: true, content: true, imageUrl: true,
        templateType: true, viewCount: true, ctaCount: true,
        createdAt: true, expiresAt: true, isActive: true,
      },
    }),
    prisma.drop.aggregate({
      where: { userId: user.id },
      _sum: { viewCount: true, ctaCount: true },
      _count: { id: true },
    }),
  ])

  const activeCount = drops.filter(d => d.isActive && d.expiresAt > new Date()).length

  return (
    <>
      {/* Header de page */}
      <div className="flex items-end justify-between mb-16">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet mb-3">
            {user.business}
          </p>
          <h1 className="font-display text-5xl md:text-6xl leading-[0.95]">Tes Drops.</h1>
        </div>
        <Link
          href="/dashboard/new"
          className="px-6 py-3 bg-ink text-cream font-mono text-xs uppercase tracking-[0.15em]"
        >
          Nouveau Drop
        </Link>
      </div>

      {/* KPIs */}
      <KpiGrid
        items={[
          { label: 'Drops actifs', value: activeCount },
          { label: 'Drops au total', value: totals._count.id },
          { label: 'Vues cumulées', value: totals._sum.viewCount ?? 0 },
          { label: 'Conversions', value: totals._sum.ctaCount ?? 0 },
        ]}
      />

      {/* Liste */}
      <section className="mt-20">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] opacity-60 mb-6">
          Tous les Drops
        </h2>
        {drops.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-ink/10 border-y border-ink/10">
            {drops.map(d => <DropCard key={d.id} drop={d} />)}
          </ul>
        )}
      </section>
    </>
  )
}

function EmptyState() {
  return (
    <div className="py-24 text-center">
      <p className="font-display italic text-3xl opacity-80">Aucun Drop encore.</p>
      <p className="font-mono text-xs uppercase tracking-[0.15em] opacity-50 mt-4">
        Commence par tapoter une phrase.
      </p>
    </div>
  )
}
```

---

## 5. KPI Grid (`src/components/dashboard/kpi-grid.tsx`)

Volontairement plat. Pas de carte 3D, pas de gradient. Juste de la typo bien hiérarchisée.

```tsx
interface Item {
  label: string
  value: number | string
  hint?: string
}

export function KpiGrid({ items }: { items: Item[] }) {
  return (
    <dl className="grid grid-cols-2 md:grid-cols-4 border-y border-ink/15 divide-x divide-ink/15">
      {items.map((item, i) => (
        <div key={i} className="py-8 px-5 first:pl-0">
          <dt className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 mb-3">
            {item.label}
          </dt>
          <dd className="font-display text-5xl tabular-nums leading-none">
            {typeof item.value === 'number' ? item.value.toLocaleString('fr-FR') : item.value}
          </dd>
          {item.hint && <p className="font-mono text-[10px] opacity-50 mt-2">{item.hint}</p>}
        </div>
      ))}
    </dl>
  )
}
```

Le `tabular-nums` est important : les chiffres ont la même largeur, les colonnes restent alignées même quand la valeur change.

---

## 6. DropCard (`src/components/dashboard/drop-card.tsx`)

Une ligne par Drop, dense, lisible. Cliquable.

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'motion/react'
import type { DropContent } from '@/lib/ai/schema'

interface Props {
  drop: {
    id: string
    slug: string
    content: unknown                    // JSON DropContent
    imageUrl: string | null
    templateType: string
    viewCount: number
    ctaCount: number
    createdAt: Date
    expiresAt: Date
    isActive: boolean
  }
}

const TEMPLATE_LABEL: Record<string, string> = {
  HOW_TO: 'Guide',
  MANIFESTO: 'Manifeste',
  CASE_STUDY: 'Étude de cas',
  QUIZ: 'Quiz',
  ANNOUNCEMENT: 'Annonce',
}

export function DropCard({ drop }: Props) {
  const content = drop.content as DropContent
  const expired = !drop.isActive || drop.expiresAt <= new Date()
  const hoursLeft = Math.max(0, Math.floor((drop.expiresAt.getTime() - Date.now()) / 3_600_000))
  const conversionRate = drop.viewCount > 0 ? Math.round((drop.ctaCount / drop.viewCount) * 100) : 0

  return (
    <li>
      <Link
        href={`/dashboard/d/${drop.id}`}
        className="group flex gap-6 py-5 items-center hover:bg-ink/[0.03] transition px-2 -mx-2"
      >
        {/* Thumbnail */}
        <div className="relative w-20 h-14 flex-shrink-0 bg-ink/10 overflow-hidden">
          {drop.imageUrl && (
            <Image src={drop.imageUrl} alt="" fill className="object-cover" />
          )}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className="font-display text-xl leading-snug truncate group-hover:translate-x-1 transition-transform">
            {content.hook.title}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-50 mt-1">
            {TEMPLATE_LABEL[drop.templateType]} · {formatDate(drop.createdAt)}
          </p>
        </div>

        {/* Stats */}
        <div className="hidden md:flex gap-8 font-mono text-xs">
          <Stat label="Vues" value={drop.viewCount} />
          <Stat label="CTA" value={drop.ctaCount} />
          <Stat label="Conv." value={`${conversionRate}%`} muted={drop.viewCount < 10} />
        </div>

        {/* Status */}
        <div className="w-24 text-right">
          {expired ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-40">
              Expiré
            </span>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-violet">
              {hoursLeft}h restantes
            </span>
          )}
        </div>
      </Link>
    </li>
  )
}

function Stat({ label, value, muted = false }: { label: string; value: string | number; muted?: boolean }) {
  return (
    <div className={`text-right ${muted ? 'opacity-40' : ''}`}>
      <div className="font-display text-lg tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-[0.15em] opacity-60">{label}</div>
    </div>
  )
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(d)
}
```

Détails :
- Hover : la card s'éclaire **et** le titre slide légèrement à droite. Micro-interaction qui signale la cliquabilité.
- Le taux de conversion est en opacité réduite si < 10 vues (le chiffre n'est pas significatif statistiquement, on l'indique visuellement).
- Status "X h restantes" plutôt que "actif" : crée le sentiment d'urgence cohérent avec la promesse 7 jours.

---

## 7. Page détail d'un Drop (`src/app/dashboard/d/[id]/page.tsx`)

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { KpiGrid } from '@/components/dashboard/kpi-grid'
import { EventsTimeline } from '@/components/dashboard/events-timeline'
import { ShareBar } from '@/components/dashboard/share-bar'
import type { DropContent } from '@/lib/ai/schema'

export default async function DropDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const drop = await prisma.drop.findFirst({
    where: { id, userId: user.id },
    include: {
      events: { orderBy: { createdAt: 'desc' }, take: 200 },
    },
  })

  if (!drop) notFound()

  const content = drop.content as DropContent
  const scrollComplete = drop.events.filter(e => e.kind === 'SCROLL_COMPLETE').length
  const uniqueVisitors = new Set(drop.events.map(e => e.visitorHash)).size
  const publicUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/d/${drop.slug}`

  return (
    <>
      <Link
        href="/dashboard"
        className="font-mono text-[11px] uppercase tracking-[0.15em] opacity-60 hover:opacity-100 mb-8 inline-block"
      >
        ← Retour
      </Link>

      <div className="grid md:grid-cols-[2fr_3fr] gap-12 mb-16">
        {/* Aperçu */}
        <div>
          <div className="relative aspect-[4/3] bg-ink/10 mb-4">
            {drop.imageUrl && <Image src={drop.imageUrl} alt="" fill className="object-cover" />}
          </div>
          <Link
            href={`/d/${drop.slug}`}
            target="_blank"
            className="font-mono text-xs uppercase tracking-[0.15em] underline underline-offset-4"
          >
            Ouvrir le Drop public ↗
          </Link>
        </div>

        {/* Méta */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet mb-3">
            {drop.templateType.toLowerCase()} · /{drop.slug}
          </p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] mb-6">
            {content.hook.title}
          </h1>
          <p className="font-editorial italic text-lg opacity-80 leading-relaxed">
            {content.hook.subtitle}
          </p>

          <ShareBar url={publicUrl} />
        </div>
      </div>

      <KpiGrid
        items={[
          { label: 'Vues', value: drop.viewCount },
          { label: 'Visiteurs uniques', value: uniqueVisitors },
          { label: 'Scrollés à fond', value: scrollComplete },
          { label: 'Conversions', value: drop.ctaCount },
        ]}
      />

      <section className="mt-20">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] opacity-60 mb-6">
          Activité récente
        </h2>
        <EventsTimeline events={drop.events} />
      </section>
    </>
  )
}
```

---

## 8. ShareBar (`src/components/dashboard/share-bar.tsx`)

Pas un widget social media glorifié. Juste : copier le lien, et 3 raccourcis natifs.

```tsx
'use client'
import { useState } from 'react'

export function ShareBar({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const encoded = encodeURIComponent(url)

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button
        onClick={copy}
        className="px-4 py-2 bg-ink text-cream font-mono text-[11px] uppercase tracking-[0.15em]"
      >
        {copied ? 'Copié.' : 'Copier le lien'}
      </button>
      <ExternalShare label="LinkedIn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`} />
      <ExternalShare label="Email" href={`mailto:?body=${encoded}`} />
      <ExternalShare label="WhatsApp" href={`https://wa.me/?text=${encoded}`} />
    </div>
  )
}

function ExternalShare({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="px-4 py-2 border border-ink/20 hover:border-ink font-mono text-[11px] uppercase tracking-[0.15em] transition"
    >
      {label}
    </a>
  )
}
```

---

## 9. Events Timeline (`src/components/dashboard/events-timeline.tsx`)

Liste verticale, dense, anonymisée. Pas de graphique en barres : on n'a pas assez de données dans un hackathon pour que ce soit utile.

```tsx
import type { DropEvent } from '@prisma/client'

const KIND_LABEL: Record<string, string> = {
  VIEW: 'A consulté le Drop',
  SCROLL_50: 'A lu la moitié',
  SCROLL_COMPLETE: 'A lu jusqu\'au bout',
  INTERACTION_START: 'A commencé l\'interaction',
  INTERACTION_DONE: 'A complété l\'interaction',
  CTA_CLICK: 'A cliqué sur le CTA',
  LEAD_SUBMITTED: 'A laissé ses coordonnées',
}

const KIND_COLOR: Record<string, string> = {
  CTA_CLICK: 'text-violet',
  LEAD_SUBMITTED: 'text-violet',
  INTERACTION_DONE: 'text-olive',
}

export function EventsTimeline({ events }: { events: DropEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="font-display italic text-2xl opacity-60 py-8">
        Aucune activité encore. Le Drop a peut-être besoin d'un peu de partage.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-ink/10 border-y border-ink/10">
      {events.map(e => (
        <li key={e.id} className="py-3 px-2 -mx-2 flex items-center gap-4 hover:bg-ink/[0.02]">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-50 w-24 tabular-nums">
            {formatRelative(e.createdAt)}
          </span>
          <span className={`flex-1 text-sm ${KIND_COLOR[e.kind] ?? ''}`}>
            {KIND_LABEL[e.kind] ?? e.kind}
          </span>
          <span className="font-mono text-[10px] opacity-40 hidden md:inline">
            #{e.visitorHash.slice(0, 6)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function formatRelative(d: Date) {
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}j`
}
```

Le `#a3f8c1` (hash visiteur tronqué) sur la droite donne une impression "honest analytics" — l'utilisateur voit qu'on n'identifie pas les gens, juste qu'on compte les uniques.

---

## 10. Onboarding (`src/app/onboarding/page.tsx`)

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TRADES = [
  { value: 'plombier', label: 'Plombier' },
  { value: 'electricien', label: 'Électricien' },
  { value: 'coach', label: 'Coach professionnel' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'restaurateur', label: 'Restaurateur' },
  { value: 'commerce', label: 'Commerce local' },
  { value: 'artisan', label: 'Artisan' },
  { value: 'autre', label: 'Autre' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [business, setBusiness] = useState('')
  const [trade, setTrade] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/user/profile', {
      method: 'PATCH',
      body: JSON.stringify({ business, trade }),
      headers: { 'Content-Type': 'application/json' },
    })
    router.push('/dashboard')
  }

  return (
    <div className="max-w-md">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet mb-6">Bienvenue</p>
      <h1 className="font-display text-5xl leading-[0.95]">On démarre vite.</h1>
      <p className="mt-6 text-lg opacity-80">
        Deux infos pour que l'IA comprenne ton contexte. Tu peux les modifier plus tard.
      </p>

      <form onSubmit={submit} className="mt-12 flex flex-col gap-6">
        <Field label="Nom de ta boîte">
          <input
            required
            value={business}
            onChange={e => setBusiness(e.target.value)}
            placeholder="Plomberie Lyon Centre"
            className="w-full px-5 py-4 bg-transparent border border-ink/30 focus:border-ink rounded-sm font-mono text-sm outline-none"
          />
        </Field>

        <Field label="Ton métier">
          <select
            required
            value={trade}
            onChange={e => setTrade(e.target.value)}
            className="w-full px-5 py-4 bg-transparent border border-ink/30 focus:border-ink rounded-sm font-mono text-sm outline-none"
          >
            <option value="">Choisir…</option>
            {TRADES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>

        <button
          type="submit"
          disabled={loading || !business || !trade}
          className="mt-4 px-8 py-4 bg-ink text-cream font-mono text-xs uppercase tracking-[0.15em] disabled:opacity-50"
        >
          {loading ? 'Configuration…' : 'Continuer vers mon dashboard'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] opacity-70 mb-2">
        {label}
      </span>
      {children}
    </label>
  )
}
```

L'endpoint `/api/user/profile` est une route simple qui met à jour `User.business` et `User.trade` après auth.

---

## 11. Settings (`src/app/dashboard/settings/page.tsx`)

Minimal. Pour le hackathon, on ne fait pas un panneau préférences complet.

```tsx
import { requireUser } from '@/lib/auth-server'
import { ProfileForm } from '@/components/dashboard/profile-form'

export default async function SettingsPage() {
  const user = await requireUser()

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-5xl leading-[0.95] mb-4">Compte.</h1>
      <p className="opacity-70 mb-12">Tes informations de marque pour l'IA.</p>

      <ProfileForm
        defaultValues={{
          business: user.business ?? '',
          trade: user.trade ?? '',
          name: user.name ?? '',
        }}
      />

      <section className="mt-20 pt-12 border-t border-ink/15">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-60 mb-4">
          Email de connexion
        </h2>
        <p className="font-display text-2xl">{user.email}</p>
        <p className="font-mono text-xs opacity-50 mt-2">
          L'email ne peut pas être modifié pour l'instant.
        </p>
      </section>
    </div>
  )
}
```

---

## 12. Mises à jour des stats dénormalisées

Le `viewCount` et `ctaCount` sont mis à jour à chaque event dans `trackEvent` (cf. 02-database.md). Pour le dashboard, ça suffit : pas besoin d'agréger en temps réel.

Si les counts ne s'affichent pas immédiatement (problème de cache Next), forcer une revalidation après la création d'un drop :

```ts
import { revalidatePath } from 'next/cache'
// après createDrop
revalidatePath('/dashboard')
```

---

## 13. Performance et caches

Le dashboard est appelé plusieurs fois par session. Trois choses à surveiller :

- **Liste des drops** : pas de pagination pour le hackathon (un patron n'aura jamais > 50 drops en 2 semaines). `take: 50` suffit.
- **`generateMetadata` ou `params.then()`** ne doit pas refaire de query si déjà fait dans la page. Utiliser `cache()` de React si besoin.
- **`prisma.drop.aggregate`** scanne potentiellement beaucoup de rows. Vérifier qu'on a bien l'index `(userId, createdAt DESC)`. Sinon Postgres scan toute la table à chaque visite du dashboard.

---

## 14. Checklist avant la démo

- [ ] Onboarding marche pour un nouvel utilisateur frais (créer un compte demo juste avant).
- [ ] Les 3 drops seed apparaissent en haut de liste avec leurs stats.
- [ ] La page détail d'un drop affiche les events seed (en générer 30+ par drop dans le seed pour que la timeline ait du contenu).
- [ ] Le bouton "Copier le lien" fonctionne (testé sur Safari et Chrome — les permissions clipboard diffèrent).
- [ ] La transition dashboard → /d/[slug] dans un nouvel onglet ne casse pas la session (target="_blank" sans rel="noopener" peut leak).
- [ ] Responsive mobile : la liste des drops doit rester lisible. Les colonnes stats se cachent sous 768 px, c'est OK.

---

## 15. Hors scope assumé (et pourquoi)

Volontairement écartés pour cette itération :

- **Graphiques temporels** (vues par jour) : sexy mais peu actionnable à ce volume. La timeline d'events suffit.
- **Filtres / recherche** : pas de problème de scaling à ce stade.
- **Export CSV** : pas de cas d'usage clair pour les premiers utilisateurs.
- **Notifications email** (« Ton Drop expire demain ! ») : nice-to-have, mais coût de dev disproportionné par rapport à l'apport perçu.
- **Multi-user / teams** : Drop est mono-utilisateur, par design.
- **Édition d'un drop publié** : par design, un drop est immuable. C'est cohérent avec la promesse « éphémère, comme un événement ».

Périmètre prioritaire : **liste + détail + onboarding**. Préférer trois pages qui fonctionnent à dix pages incomplètes.

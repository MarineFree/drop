# 04 — Templates React

Les 5 templates sont **le** point critique du projet. Le pipeline IA peut être parfait, si le visuel est mou, l'expérience perd l'essentiel. Allouer ~35-40 % du temps de build à ces composants, pas 10 %.

---

## 1. Principe directeur : différenciation par template

Le piège classique du multi-template : tous les templates finissent par se ressembler (même grille, même typo, même rythme). Résultat : on génère 100 drops, tous identiques. Mort de la promesse.

**Règle absolue** : chaque template a une **personnalité visuelle propre** — composition, font display, rythme. Un Drop `manifesto` ne doit jamais ressembler à un Drop `quiz`.

**Note importante sur les couleurs** : la palette est **patron-side**, pas template-side. Le patron choisit une `User.brandColor` (8 palettes prédéfinies dans `src/lib/brand-palettes.ts` — violet, rose, terracotta, sauge, sapin, indigo, or, noir). Shell injecte 5 CSS vars (`--bg`, `--text`, `--accent`, `--accent-fg`, `--soft`) qui surchargent tout. Le `meta.theme` retourné par l'IA est **kept-for-compat** (présent dans le Zod schema) mais ignoré côté Shell — il devient mort code. Cohérent : un patron a UNE identité chromatique, ses drops la suivent quels que soient les sujets.

| Template | Personnalité | Display font | Composition |
|---|---|---|---|
| `how-to` | Pédagogique, swiss design | Instrument Serif | Sections numérotées + image hero asymétrique |
| `manifesto` | Brutaliste, intense | Fraunces (italic) | Pas d'image hero, typo géante italique, sections en chiffres romains |
| `case-study` | Éditorial longform | Newsreader | Image hero en N&B, body en colonne lecture |
| `quiz` | Ludique, vivant | Instrument Serif | Mini-sections en cartes, interaction centrale |
| `announcement` | Affiche, événementiel | Fraunces (display) | Date d'aujourd'hui géante, hiérarchie inversée |

---

## 2. Setup des fonts (`src/app/fonts.ts`)

**Sept fonts** au total, en deux familles d'usage :

- **Cinq fonts éditoriales** consommées par les templates publics `/d/[slug]`, le dashboard et l'auth : Instrument Serif, Fraunces, Newsreader, JetBrains Mono, Geist.
- **Deux fonts landing-only** réservées à la page d'accueil `/` : Space Grotesk + Hanken Grotesk. **Volontairement séparées** pour ne pas fuir sur le dashboard ou les drops publics, qui ont leur propre identité éditoriale (cream/serif).

```ts
import {
  Instrument_Serif, Fraunces, Newsreader, JetBrains_Mono, Geist,
  Space_Grotesk, Hanken_Grotesk,
} from 'next/font/google'

// — Cinq fonts éditoriales (templates publics, dashboard, auth) —
export const instrumentSerif = Instrument_Serif({
  subsets: ['latin'], weight: ['400'], style: ['normal', 'italic'],
  variable: '--font-display', display: 'swap',
})
export const fraunces      = Fraunces({       subsets: ['latin'], variable: '--font-display-alt', display: 'swap' })
export const newsreader    = Newsreader({     subsets: ['latin'], variable: '--font-editorial',   display: 'swap' })
export const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono',        display: 'swap' })
export const geist         = Geist({          subsets: ['latin'], variable: '--font-body',        display: 'swap' })

// — Deux fonts landing-only (page `/` uniquement) —
export const spaceGrotesk  = Space_Grotesk({  subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-lp-display', display: 'swap' })
export const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-lp-body',    display: 'swap' })
```

Dans `src/app/layout.tsx`, les 7 variables sont appliquées au `<html>` :

```tsx
const fontClassNames = [
  instrumentSerif.variable, fraunces.variable, newsreader.variable,
  jetbrainsMono.variable, geist.variable,
  spaceGrotesk.variable, hankenGrotesk.variable,
].join(' ')

return <html lang="fr" className={fontClassNames}><body className="font-body">{children}</body></html>
```

---

## 3. Variables CSS de thème (`src/app/globals.css`)

```css
@import "tailwindcss";

@theme {
  /* Thèmes */
  --color-cream: #EFE9DB;
  --color-cream-soft: #F5F1E5;
  --color-ink: #1a1a1a;
  --color-ink-soft: #2A2A2A;
  --color-violet: #5246F5;
  --color-violet-soft: #6E63FF;
  --color-ardoise: #3D3F47;
  --color-rouille: #C24C2C;
  --color-olive: #6B7A3A;

  /* Typographie */
  --font-display: var(--font-display);
  --font-display-alt: var(--font-display-alt);
  --font-editorial: var(--font-editorial);
  --font-mono: var(--font-mono);
  --font-body: var(--font-body);
}

/* Grain léger sur fond cream pour éviter le plat */
.bg-cream-grain {
  background-color: var(--color-cream);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

Le grain SVG inline est crucial pour que le cream ne paraisse pas plat / "AI slop". Détail discret, gros impact.

---

## 4. Shell commun (`src/components/templates/Shell.tsx`)

Layout enveloppant. Hérité par tous les templates. Injecte la palette du patron en CSS vars et affiche le compteur d'expiration. **Pas de tracking ici** : le `ScrollTracker` est monté côté page `/d/[slug]` (cf. Docs/03 §5), le tracking VIEW est serveur.

```tsx
import type { ReactNode } from 'react'
import { paletteStyle } from '@/lib/brand-palettes'

interface ShellProps {
  children: ReactNode
  expiresAt: Date
  business: string | null
  /** Clé de palette (cf. `User.brandColor` / brand-palettes.ts). null → défaut violet. */
  brandColor: string | null
}

function formatTimeLeft(expiresAt: Date): string {
  const diff = Math.max(0, expiresAt.getTime() - Date.now())
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  return `${days}j ${hours}h`
}

export function Shell({ children, expiresAt, business, brandColor }: ShellProps) {
  const timeLeft = formatTimeLeft(expiresAt)
  const style = paletteStyle(brandColor)

  return (
    <div
      style={style}
      className="min-h-screen bg-[var(--bg)] font-body text-[var(--text)] antialiased"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 font-mono text-[11px] uppercase tracking-[0.15em] mix-blend-difference">
        <span className="opacity-70">{business ?? 'Drop'}</span>
        <span className="opacity-70">Expire dans {timeLeft}</span>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-32">{children}</main>

      <footer className="space-y-1 border-t border-[var(--text)]/10 px-6 py-8 text-center font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
        <p>Drop éphémère · {business ?? 'Anonyme'}</p>
        <p>Expire le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(expiresAt)}</p>
      </footer>
    </div>
  )
}
```

**Détails à noter** :
- `paletteStyle(brandColor)` injecte 5 CSS vars (`--bg`, `--text`, `--accent`, `--accent-fg`, `--soft`) sur le container racine. Tous les enfants consomment via `bg-[var(--bg)]` / `text-[var(--text)]` / `text-[var(--accent)]` etc. — pas de classes Tailwind brutes type `bg-cream` côté templates publics.
- Le compteur d'expiration est calculé **côté serveur** au render — pas d'horloge live, pas de `setInterval`. La page est `force-dynamic`, chaque hit donne un compteur frais (cf. Docs/03 §5).
- `mix-blend-difference` sur le header pour rester lisible quel que soit le fond.
- Pas de logo Drop. Le drop appartient à la marque ; branding discret en footer.

> **Notes sur les snippets §5 à §12** — deux écarts par rapport à l'implémentation réelle, à lire comme du pseudocode d'intention :
>
> 1. **Animations** : les `motion.X` (framer-motion) sont illustratifs. L'implémentation réelle utilise des animations CSS pures (`@keyframes` dans `src/app/globals.css`, classes Tailwind `animate-fade-in` / `animate-slide-up`). `framer-motion` est encore listé dans `package.json` mais aucun composant ne l'importe (vérifié par grep `src/`). Cf. `CLAUDE.md` : « pas de framer-motion ».
> 2. **Couleurs** : les classes Tailwind brutes (`bg-violet`, `text-cream`, `bg-ink`…) dans les snippets sont illustratives de l'intention chromatique. Les templates publics réels consomment **exclusivement** les CSS vars injectées par Shell (`bg-[var(--bg)]`, `text-[var(--text)]`, `text-[var(--accent)]`, `bg-[var(--accent)] text-[var(--accent-fg)]`, `border-[var(--text)]/15`). La palette vient de `User.brandColor` (cf. §1 + `src/lib/brand-palettes.ts`).

---

## 5. Composants atomiques de section (`src/components/templates/sections.tsx`)

Réutilisés par plusieurs templates. UN composant par `section.kind`.

```tsx
import { motion } from 'motion/react'
import type { DropContent } from '@/lib/ai/schema'

type Section = DropContent['sections'][number]

export function SectionRenderer({ section, index }: { section: Section; index: number }) {
  const common = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] as const },
  }

  switch (section.kind) {
    case 'text':
      return (
        <motion.section {...common} className="my-16">
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05] mb-6">{section.heading}</h2>
          <p className="text-lg leading-relaxed opacity-90">{section.body}</p>
        </motion.section>
      )

    case 'stat':
      return (
        <motion.section {...common} className="my-20 text-center">
          <p className="font-display text-[clamp(80px,18vw,180px)] leading-none text-violet">
            {section.value}
          </p>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] max-w-md mx-auto opacity-70">
            {section.label}
          </p>
        </motion.section>
      )

    case 'checklist':
      return (
        <motion.section {...common} className="my-16">
          <ul className="space-y-4">
            {section.items.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="flex gap-4 items-start text-lg"
              >
                <span className="font-mono text-xs mt-2 opacity-60 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 leading-relaxed">{item}</span>
              </motion.li>
            ))}
          </ul>
        </motion.section>
      )

    case 'comparison':
      return (
        <motion.section {...common} className="my-16 grid md:grid-cols-2 gap-4">
          <div className="p-6 border border-current/15 rounded-sm">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50 mb-3">Avant</p>
            <p className="text-base leading-relaxed">{section.before}</p>
          </div>
          <div className="p-6 bg-current/5 border border-current/30 rounded-sm">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 mb-3">Après</p>
            <p className="text-base leading-relaxed font-medium">{section.after}</p>
          </div>
        </motion.section>
      )
  }
}
```

---

## 6. CTA unifié (`src/components/templates/cta.tsx`)

Un seul composant, paramétré par `cta.kind`.

```tsx
'use client'
import { useState } from 'react'
import { motion } from 'motion/react'
import type { DropContent } from '@/lib/ai/schema'

interface Props {
  cta: DropContent['cta']
  dropId: string
}

export function CTA({ cta, dropId }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [value, setValue] = useState('')

  async function submit() {
    await fetch('/api/events', {
      method: 'POST',
      body: JSON.stringify({ dropId, kind: 'LEAD_SUBMITTED', metadata: { ctaKind: cta.kind, value } }),
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="my-20 text-center"
      >
        <p className="font-display text-3xl md:text-4xl">Reçu.</p>
        <p className="opacity-70 mt-2 font-mono text-sm">On revient vers vous sous 24 h.</p>
      </motion.div>
    )
  }

  // Lead / newsletter : input + bouton
  if (cta.kind === 'lead' || cta.kind === 'newsletter') {
    return (
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="my-24 p-8 md:p-12 bg-current/5 rounded-md border border-current/15"
      >
        <p className="font-display text-3xl md:text-4xl leading-tight mb-6">{cta.label}</p>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="email"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={cta.placeholder ?? 'votre@email.fr'}
            className="flex-1 px-5 py-4 bg-transparent border border-current/30 focus:border-current rounded-sm font-mono text-sm outline-none"
          />
          <button
            onClick={submit}
            className="px-8 py-4 bg-current text-cream font-mono text-xs uppercase tracking-[0.15em] rounded-sm hover:opacity-90 transition"
          >
            Envoyer
          </button>
        </div>
      </motion.section>
    )
  }

  // Contact / booking / devis : bouton seul (lien externe configuré par le patron)
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="my-24 text-center"
    >
      <button
        onClick={submit}
        className="inline-block px-10 py-5 bg-current text-cream font-mono text-xs uppercase tracking-[0.2em] rounded-sm hover:scale-[1.02] transition"
      >
        {cta.label}
      </button>
    </motion.section>
  )
}
```

---

## 7. Composant Interaction — Quiz (`src/components/templates/quiz-interaction.tsx`)

```tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface Quiz {
  kind: 'quiz'
  question: string
  options: Array<{ label: string; is_correct: boolean; feedback: string }>
}

export function QuizInteraction({ quiz, dropId }: { quiz: Quiz; dropId: string }) {
  const [selected, setSelected] = useState<number | null>(null)
  const correctIdx = quiz.options.findIndex(o => o.is_correct)

  function choose(i: number) {
    setSelected(i)
    fetch('/api/events', {
      method: 'POST',
      body: JSON.stringify({
        dropId,
        kind: 'INTERACTION_DONE',
        metadata: { correct: i === correctIdx },
      }),
    })
  }

  return (
    <section className="my-24">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-60 mb-4">Question</p>
      <h3 className="font-display text-3xl md:text-4xl leading-tight mb-8">{quiz.question}</h3>

      <div className="space-y-3">
        {quiz.options.map((opt, i) => {
          const isSelected = selected === i
          const isCorrect = opt.is_correct
          const showResult = selected !== null

          return (
            <motion.button
              key={i}
              onClick={() => selected === null && choose(i)}
              disabled={selected !== null}
              whileHover={selected === null ? { x: 6 } : {}}
              className={`
                w-full text-left p-5 border rounded-sm transition
                ${!showResult ? 'border-current/20 hover:border-current/60' : ''}
                ${showResult && isSelected && isCorrect ? 'border-olive bg-olive/10' : ''}
                ${showResult && isSelected && !isCorrect ? 'border-rouille bg-rouille/10' : ''}
                ${showResult && !isSelected && isCorrect ? 'border-olive/50' : ''}
              `}
            >
              <div className="flex justify-between items-center">
                <span className="text-base">{opt.label}</span>
                {showResult && isCorrect && <span className="font-mono text-[10px] uppercase opacity-60">Bonne réponse</span>}
              </div>
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence>
        {selected !== null && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-5 bg-current/5 border-l-2 border-current italic leading-relaxed"
          >
            {quiz.options[selected].feedback}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  )
}
```

---

# Les 5 templates

---

## 8. Template `how-to` (`src/components/templates/how-to.tsx`)

**Personnalité** : Guide éditorial swiss, structuré, calme. Forte numérotation, beaucoup d'air.

```tsx
import Image from 'next/image'
import { motion } from 'motion/react'
import { Shell } from './shell'
import { SectionRenderer } from './sections'
import { CTA } from './cta'
import type { DropContent } from '@/lib/ai/schema'

interface Props {
  content: DropContent
  imageUrl: string | null
  slug: string
  expiresAt: Date
  business: string | null
  dropId: string
}

export function HowToTemplate({ content, imageUrl, expiresAt, business, dropId }: Props) {
  return (
    <Shell theme="cream" expiresAt={expiresAt} business={business} dropId={dropId}>
      {/* Hero */}
      <header className="pt-12 pb-20">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet mb-8"
        >
          Guide pratique · {content.meta.estimated_read_time_sec}s
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-[clamp(48px,9vw,96px)] leading-[0.95] tracking-[-0.02em]"
        >
          {content.hook.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-8 font-editorial text-xl md:text-2xl leading-relaxed max-w-xl"
        >
          {content.hook.subtitle}
        </motion.p>
      </header>

      {/* Image hero, désaxée à droite */}
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2 }}
          className="relative aspect-[4/3] -mr-12 md:mr-0 md:ml-12 mb-20"
        >
          <Image src={imageUrl} alt="" fill className="object-cover" priority />
        </motion.div>
      )}

      {/* Sections */}
      {content.sections.map((s, i) => (
        <SectionRenderer key={i} section={s} index={i} />
      ))}

      {/* Interaction */}
      {content.interaction.kind === 'quiz' && (
        <QuizInteraction quiz={content.interaction} dropId={dropId} />
      )}

      {/* CTA */}
      <CTA cta={content.cta} dropId={dropId} />
    </Shell>
  )
}
```

**Détail design** : l'image hero est volontairement décalée à droite (`-mr-12`) sur mobile pour créer une asymétrie. Pas centrée. Petit détail qui évite le rendu trop centré et générique.

---

## 9. Template `manifesto` (`src/components/templates/manifesto.tsx`)

**Personnalité** : Brutalisme éditorial. Tout en noir, typo géante italique, pas d'image (l'image hero devient un texte). Le sous-titre se transforme en citation pleine page.

```tsx
import { motion } from 'motion/react'
import { Shell } from './shell'
import { SectionRenderer } from './sections'
import { CTA } from './cta'
import type { DropContent } from '@/lib/ai/schema'

export function ManifestoTemplate({ content, expiresAt, business, dropId }: Props) {
  return (
    <Shell theme="dark" expiresAt={expiresAt} business={business} dropId={dropId}>
      {/* Pas d'image hero. Volontaire : le manifeste est un acte de langage. */}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="pt-24 pb-12"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-violet-soft mb-12">
          Position · {business}
        </p>

        {/* Titre en Fraunces italic, géant */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="font-display-alt italic text-[clamp(56px,12vw,140px)] leading-[0.9] tracking-[-0.03em]"
        >
          {content.hook.title}
        </motion.h1>

        {/* Sous-titre traité comme une lead */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="font-editorial text-2xl md:text-3xl leading-snug mt-12 max-w-xl border-l-2 border-violet-soft pl-6"
        >
          {content.hook.subtitle}
        </motion.p>
      </motion.div>

      {/* Sections : numérotation romaine pour marquer la prise de position */}
      <div className="mt-24">
        {content.sections.map((s, i) => (
          <div key={i} className="relative">
            <span className="absolute -left-2 md:-left-12 top-2 font-display-alt italic text-violet-soft text-2xl opacity-50">
              {['I', 'II', 'III', 'IV'][i]}
            </span>
            <SectionRenderer section={s} index={i} />
          </div>
        ))}
      </div>

      <CTA cta={content.cta} dropId={dropId} />
    </Shell>
  )
}
```

**Détail design** : aucune image. C'est le seul template qui n'utilise pas `imageUrl`. C'est l'effet voulu : un manifeste est verbal, pas illustré. La force vient du contraste typographique.

---

## 10. Template `case-study` (`src/components/templates/case-study.tsx`)

**Personnalité** : Magazine longform. Structure narrative claire (problème → action → résultat). Sérif éditoriale (Newsreader). Ratio plus généreux côté texte.

```tsx
export function CaseStudyTemplate({ content, imageUrl, expiresAt, business, dropId }: Props) {
  return (
    <Shell theme="cream" expiresAt={expiresAt} business={business} dropId={dropId}>
      <header className="pt-12 pb-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ardoise mb-6">
          Étude de cas
        </p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="font-editorial text-[clamp(40px,7vw,72px)] leading-[1.05] tracking-[-0.01em]"
        >
          {content.hook.title}
        </motion.h1>

        <p className="font-editorial italic text-xl md:text-2xl mt-8 opacity-80 max-w-xl leading-relaxed">
          {content.hook.subtitle}
        </p>
      </header>

      {imageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="relative aspect-[3/2] mb-16"
        >
          <Image src={imageUrl} alt="" fill className="object-cover grayscale contrast-[1.05]" priority />
        </motion.div>
      )}

      {/* Body en colonne lecture confortable */}
      <article className="font-editorial text-lg leading-[1.75]">
        {content.sections.map((s, i) => (
          <SectionRenderer key={i} section={s} index={i} />
        ))}
      </article>

      <CTA cta={content.cta} dropId={dropId} />
    </Shell>
  )
}
```

**Détail design** : l'image hero est en **noir et blanc** (`grayscale`). C'est la signature du template case-study — référence éditoriale presse. Différencie immédiatement.

---

## 11. Template `quiz` (`src/components/templates/quiz.tsx`)

**Personnalité** : Plein violet, presque sans image. Format quiz centré. Le hook devient une question ouverte. Tout pousse vers l'interaction.

```tsx
export function QuizTemplate({ content, expiresAt, business, dropId }: Props) {
  return (
    <Shell theme="violet" expiresAt={expiresAt} business={business} dropId={dropId}>
      <header className="pt-20 pb-16 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-mono text-[11px] uppercase tracking-[0.3em] mb-8 opacity-80"
        >
          Auto-évaluation
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-[clamp(44px,8vw,84px)] leading-[1.0] tracking-[-0.02em] max-w-xl mx-auto"
        >
          {content.hook.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          transition={{ delay: 0.5 }}
          className="font-display italic text-2xl mt-8 max-w-md mx-auto leading-snug"
        >
          {content.hook.subtitle}
        </motion.p>
      </header>

      {/* Mini-sections en cartes flottantes plutôt qu'en flow vertical */}
      <div className="grid gap-4 my-12">
        {content.sections.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-cream/10 backdrop-blur-sm rounded-md border border-cream/15"
          >
            <SectionRenderer section={s} index={i} />
          </motion.div>
        ))}
      </div>

      {/* L'interaction est LE cœur du template */}
      {content.interaction.kind === 'quiz' && (
        <QuizInteraction quiz={content.interaction} dropId={dropId} />
      )}
      {content.interaction.kind === 'poll' && (
        <PollInteraction poll={content.interaction} dropId={dropId} />
      )}

      <CTA cta={content.cta} dropId={dropId} />
    </Shell>
  )
}
```

**Détail design** : c'est le seul template qui utilise un **grid de cartes** plutôt qu'un flow vertical. Casse le rythme attendu. Et les cartes ont un `backdrop-blur-sm` sur fond violet plein = effet "glass" léger qui claque.

---

## 12. Template `announcement` (`src/components/templates/announcement.tsx`)

**Personnalité** : Affiche d'événement. Date proéminente, hiérarchie inversée (la date avant le titre). Couleur d'accent contextuelle. Sensation "tirage limité".

```tsx
export function AnnouncementTemplate({ content, imageUrl, expiresAt, business, dropId }: Props) {
  // Date du jour formatée — l'annonce vit aujourd'hui
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Shell theme="cream" expiresAt={expiresAt} business={business} dropId={dropId}>
      {/* Date énorme en haut, comme un poster */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1 }}
        className="pt-12 pb-6"
      >
        <p className="font-display-alt text-rouille text-[clamp(48px,10vw,120px)] leading-[0.95] tracking-[-0.03em]">
          {today}
        </p>
      </motion.div>

      <div className="border-t border-current/30 pt-8 pb-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] mb-6 opacity-70">
          Annonce · {business}
        </p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.9 }}
          className="font-display-alt text-[clamp(40px,7vw,72px)] leading-[1.05] tracking-[-0.015em] max-w-2xl"
        >
          {content.hook.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          transition={{ delay: 0.6 }}
          className="font-editorial italic text-xl md:text-2xl mt-6 max-w-lg leading-relaxed"
        >
          {content.hook.subtitle}
        </motion.p>
      </div>

      {/* Image plein cadre, ratio affiche */}
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4 }}
          className="relative aspect-[2/3] md:aspect-[3/4] mb-16"
        >
          <Image src={imageUrl} alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </motion.div>
      )}

      {/* Infos pratiques en bandeau */}
      <div className="my-12 border-y border-current/30 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {content.sections.map((s, i) => (
          <SectionRenderer key={i} section={s} index={i} />
        ))}
      </div>

      <CTA cta={content.cta} dropId={dropId} />
    </Shell>
  )
}
```

**Détail design** : la date d'aujourd'hui en énorme couleur rouille au-dessus du titre. Inverse la hiérarchie classique. Donne immédiatement le sentiment "ça se passe maintenant, c'est éphémère". Cohérent avec la promesse du produit (7 jours).

---

## 13. Checklist de polissage avant la démo

Pour chaque template, vérifier :

- [ ] Rendu mobile (375 px de large) sans débordement horizontal
- [ ] Animation d'entrée du H1 fluide, pas de flash blanc avant le fade-in (mettre la couleur de fond au plus haut niveau dans le HTML)
- [ ] L'image hero ne pixellise pas en grand format : `priority` + `sizes` adapté
- [ ] Le compteur d'expiration est lisible sur le hero (test sur image sombre + image claire)
- [ ] Les fonts sont chargées avant le premier rendu (sinon FOUT moche) : `display: swap` + preload
- [ ] Quand on touche un quiz, la réponse arrive sans lag perceptible
- [ ] OG image générée : tester sur LinkedIn debugger, Twitter card validator, WhatsApp
- [ ] Performance : Lighthouse > 90 sur mobile. La grosse charge = framer-motion. Si lourd, lazy-load les sections sous le fold.

---

## 14. Références visuelles consultées

Sites consultés pour caler typo + rythme + image avant d'écrire les templates :

- **how-to** : pitchfork.com (reviews), pudding.cool (data-storytelling)
- **manifesto** : are.na, dirt.fyi, exemples brutalistes sur godly.website
- **case-study** : nytimes.com/section/magazine, harpers.org, longform.org
- **quiz** : nytimes.com/spelling-bee, atlasobscura quizzes
- **announcement** : the-pool.com, jacquemus.com (drops produits), it's nice that newsletters

L'objectif : calibrer l'œil sur ce qui distingue un rendu éditorial soigné d'un rendu générique IA, et limiter le tâtonnement en phase de design.

---

## 15. Honnêteté sur les limites

Trois choses à savoir :

1. **Les visuels Flux Schnell ne seront pas magnifiques systématiquement.** Pour 3 drops sur 10, il faudra peut-être retrigger la génération d'image (ou avoir un fallback visuel : pattern abstrait généré). Prévoir un bouton "régénérer l'image" dans le dashboard.

2. **Framer-motion pèse ~50 KB.** Si on veut un score Lighthouse parfait, il faudra peut-être passer à des animations CSS-only pour les drops les plus simples. Pas critique pour le hackathon.

3. **Les 5 templates couvrent ~80 % des sujets.** Il y aura des inputs où aucun ne va bien. C'est OK, c'est même un atout : Claude choisit "celui qui colle le mieux" et c'est lisible. Mieux que d'avoir 15 templates moyens.

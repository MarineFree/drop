# Drop

Un patron de TPE/PME tape une phrase ou envoie un vocal de 20 secondes. En moins de 90 secondes, l'app génère un **mini-site web partageable** (hook visuel, contenu structuré, interaction, CTA, tracking) servi sous `/d/[slug]`. Le site s'auto-détruit après 7 jours.

Hackathon **Académie IApreneurs × Hostinger** — thème 02 (création de contenu).

---

## Stack

- **Framework** : Next.js 15 (App Router), TypeScript strict, Node 20+
- **UI** : Tailwind v4 (palette custom `@theme`), pas de lib UI ni framer-motion — animations CSS `@keyframes`
- **DB** : PostgreSQL (Supabase pooler) via Prisma 5.22
- **Auth** : Better Auth (magic link via Resend, sessions DB)
- **IA texte** : Anthropic SDK, **Sonnet 4.6 par défaut** (`DROP_GENERATION_MODEL=sonnet|opus`), retry Zod + fallback modèle
- **IA image** : fal.ai (Flux Schnell, ~2s) OU upload photo patron via volume Docker `/data/uploads` (abstraction `src/lib/storage/`, prête à basculer S3)
- **IA voice → text** : fal.ai Whisper (`fal-ai/whisper`, langue `fr`) — réutilise la même clé `FAL_KEY` que l'image
- **Rate limit** : Upstash Redis (sliding window, préfixes distincts `drop:generate` / `drop:transcribe` / `drop:events`)
- **Tracking** : table `drop_events` custom, hash visiteur quotidien (SHA-256 + HMAC daily salt — RGPD-anonyme). VIEW + CTA_CLICK trackés serveur, SCROLL_50/COMPLETE + INTERACTION_START/DONE via `sendBeacon` → `POST /api/events`
- **Brand palette** : `User.brandColor` (8 palettes prédéfinies dans `src/lib/brand-palettes.ts`) injecte 5 CSS vars `--bg` `--text` `--accent` `--accent-fg` `--soft` sur Shell — **override total** de `meta.theme` IA (mort code mais conservé dans le Zod schema pour compat)
- **Cron** : route `/api/cron/expire` (bearer `CRON_SECRET`)
- **Déploiement** : **Hostinger VPS + Dokploy** sur `getdrop.cloud` (Dockerfile multi-stage Node 20-alpine, Traefik + Let's Encrypt, Postgres interne `drop-db`, volume persistant `drop-uploads`). Cf. `DEPLOY.md` pour la procédure complète + pièges rencontrés.

---

## Commands

```bash
pnpm dev              # dev local sur :3000
pnpm build            # build prod
pnpm typecheck        # tsc --noEmit, à lancer avant commit
pnpm lint             # eslint, à lancer avant commit
pnpm db:push          # push schema sans migration (hackathon mode)
pnpm db:migrate       # migration propre
pnpm db:studio        # ouvrir prisma studio
pnpm db:seed          # 3 drops de demo pour la présentation
```

---

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Landing publique
│   ├── signin/               # Magic link Better Auth
│   ├── onboarding/           # Collecte business + trade post-signup
│   ├── new/                  # Form de création (auth requise) — texte OU vocal
│   ├── dashboard/
│   │   ├── page.tsx          # Liste drops + KPIs
│   │   ├── settings/         # Réglages user (CTA URL par défaut + brand palette)
│   │   └── d/[id]/           # Détail drop + timeline events
│   ├── d/[slug]/             # PAGES PUBLIQUES — force-dynamic, tracking VIEW
│   └── api/
│       ├── auth/[...all]/    # Better Auth handler
│       ├── generate/         # SSE streaming : Claude → fal.ai/Blob → createDrop
│       ├── transcribe/       # POST audio → Whisper → string
│       ├── upload-image/     # POST multipart → src/lib/storage (FilesystemStorage → /data/uploads)
│       ├── events/           # POST sendBeacon → SCROLL_*/INTERACTION_* tracking
│       ├── d/[slug]/cta/     # 302 redirect + tracking CTA_CLICK
│       └── cron/expire/      # bearer CRON_SECRET → soft-delete TTL
├── lib/
│   ├── ai/
│   │   ├── generate.ts       # Pipeline : Sonnet/Opus + retry Zod + fallback
│   │   ├── prompts.ts        # System prompts (FR strict)
│   │   ├── schema.ts         # Zod DropContent
│   │   ├── image.ts          # Wrapper fal.ai Flux Schnell
│   │   └── whisper.ts        # Wrapper fal.ai Whisper (fal-ai/whisper)
│   ├── auth.ts               # Better Auth config
│   ├── auth-server.ts        # getCurrentUser / requireUser
│   ├── db.ts                 # Prisma singleton
│   ├── db/drops.ts           # createDrop, getActiveDropBySlug, trackEvent…
│   ├── brand-palettes.ts     # 8 palettes complètes + getPalette + paletteStyle
│   ├── events-client.ts      # sendEvent : sendBeacon + fetch keepalive fallback
│   ├── ratelimit.ts          # Upstash sliding windows
│   ├── privacy/visitor.ts    # hashVisitor (anonyme quotidien)
│   ├── emails/               # Templates Resend magic link
│   └── slug.ts               # Slugs lisibles depuis SlugWord pool
├── components/
│   ├── d/                    # ScrollTracker (sendBeacon SCROLL_50 / SCROLL_COMPLETE)
│   ├── templates/            # 5 templates publics + Shell (palette inject) + CtaButton + sections/interactions
│   ├── creator/              # GenerateClient (SSE), VoiceRecorder
│   └── dashboard/            # DashboardHeader, DropCard, KpiGrid, ShareBar, EventsTimeline, BrandPalettePicker, SettingsSubmitButton
├── middleware.ts             # Redirect /signin si pas de cookie (UX, défense-en-profondeur côté Server)
└── prisma/schema.prisma
```

### Flow de création (le truc à ne pas casser)

1. Patron remplit `/new` : **textarea** OU **bouton "Parler à la place"** (MediaRecorder → POST `/api/transcribe` → Whisper → remplit le textarea, éditable) + optionnel **photo perso** (POST `/api/upload-image` → `getStorage().put()` → volume `/data/uploads`) + optionnel **URL CTA** (pré-remplie depuis `User.ctaUrl`)
2. Submit → POST `/api/generate` (SSE)
3. Auth check + rate limit (`drop:generate`, per-IP, 10/h)
4. **Un seul appel Claude** (tool use, output structuré) → `DropContent` validé Zod. Sur Zod fail : retry même modèle ; sur API fail : fallback Opus→Sonnet. `modelUsed` persisté.
5. **Image** : si photo uploadée fournie → skip fal.ai, sinon `generateImage(content.image_prompt)`
6. `createDrop` → slug unique (P2002 retry × 5 sur pool `slug_words`) → SSE `done` avec URL
7. Page `/d/[slug]` : `force-dynamic`, lookup `getActiveDropBySlug` (filtre `isActive + expiresAt`), track VIEW, render `TEMPLATES[templateType]` avec `MinimalRender` en filet. Shell injecte la palette du patron (`User.brandColor`) via CSS vars → tous les drops d'un patron ont la même identité chromatique, indépendamment de `meta.theme` IA
8. `ScrollTracker` Client Component émet `SCROLL_50` à 50% du scrollable, `SCROLL_COMPLETE` à 95% (fallback temps 3s/8s si le contenu tient dans le viewport). `QuizWidget` / `Poll` émettent `INTERACTION_START` + `INTERACTION_DONE` au premier engagement (idempotent via refs). Tous via `sendBeacon` → `POST /api/events`
9. Clic sur le CTA → `/api/d/[slug]/cta` (GET) → track `CTA_CLICK` + 302 vers `drop.ctaUrl`

**SSE en place** dans `/api/generate` — events `status` / `done` / `error` consommés par `GenerateClient`.

---

## Le contrat IA (le plus important)

Claude doit **toujours** renvoyer un objet conforme à `DropContentSchema` (`src/lib/ai/schema.ts`). Tout le reste de l'app en dépend. Ne jamais générer du contenu en texte libre. **Source de vérité = le fichier**, le résumé ci-dessous peut dériver.

```ts
{
  template_type: 'how-to' | 'manifesto' | 'case-study' | 'quiz' | 'announcement',
  hook: { title: string, subtitle: string },
  image_prompt: string,                                // pour fal.ai
  sections: Array<                                     // 2 à 4
    | { kind: 'text', heading: string, body: string }
    | { kind: 'stat', value: string, label: string }
    | { kind: 'checklist', items: string[] }
    | { kind: 'comparison', before: string, after: string }
  >,
  interaction:
    | { kind: 'none' }
    | { kind: 'quiz', question: string, options: { label: string, is_correct: boolean, feedback: string }[] }
    | { kind: 'poll', question: string, options: string[] },
  cta: { label: string, kind: 'contact' | 'booking' | 'devis' | 'lead' | 'newsletter', placeholder?: string },
  meta: { theme: 'cream' | 'violet' | 'dark', tone: string, estimated_read_time_sec: number }
}
```

**Notes opérationnelles** :
- L'**URL cible** du CTA est PATRON-side (stockée sur `Drop.ctaUrl`, résolue à la création depuis `User.ctaUrl` ou override `/new`). L'IA ne génère **que** le label et le kind du bouton.
- C'est Claude qui choisit le `template_type` selon le sujet — détermine la composition / typo / layout. Mais **les couleurs viennent de `User.brandColor`**, pas de `meta.theme` (qui reste dans le schema mais est ignoré par Shell — kept-for-compat).
- **Règle quiz vs poll** strictement énoncée dans `prompts.ts` (section `RÈGLE INTERACTION KIND`) : `quiz` uniquement si réponse objectivement vérifiable ; **toute question subjective ("Quel est ton…", "Quelle préférence…", "Pour quel usage…") doit être un poll**. Un faux quiz qui nie la réponse d'un visiteur ("Pas tout à fait" sur une préférence) est catastrophique en UX.

---

## Conventions importantes

- **Toujours générer en streaming côté serveur** quand l'utilisateur regarde — pas de loading spinner pendant 60s, sinon la perception de réactivité s'effondre.
- **Toujours valider avec Zod** la sortie de Claude avant insertion DB. Si parse échoue, retry une fois avec un message d'erreur explicite injecté dans le prompt.
- **Image strictement séquentielle après Claude** dans `/api/generate` — `generateImage()` consomme `content.image_prompt` retourné par le tool_use. Pas de Promise.all. Paralléliser exigerait de prédire l'image_prompt en amont, ~3 s gagnés sur 60-90 s : pas le bon trade-off.
- **Les templates ne doivent jamais fetch eux-mêmes** — ils reçoivent toute la data en props depuis la page serveur.
- **Pas de migrations Prisma pendant le hackathon** — utiliser `db:push`. On fera propre après si le projet survit.
- **Le slug doit être human-readable** : `lent-papillon-mauve`, pas un UUID. Slugs garantis uniques via la table `SlugWord`.
- **TTL = `expiresAt` en DB**, jamais une suppression manuelle. Le cron lit cette colonne et soft-delete (`isActive = false`). La page `/d/[slug]` filtre via `getActiveDropBySlug` (`isActive && expiresAt > now`) → `notFound()` (404) sinon. Pas de 410 Gone pour l'instant — TODO si l'UX éphémère devient un argument différenciant.
- **Défense en profondeur auth** : middleware redirige côté UX, MAIS chaque Server Component sensible appelle `requireUser()` côté serveur (CVE-2025-29927).
- **Pas d'`amend`, pas de `--no-verify`**. Création de NOUVEAU commit toujours.
- **Toujours grep défensif les secrets** avant `git add` sur des fichiers modifiés.

---

## Variables d'env (`.env.local`)

Référence canonique : `.env.local.example`. Liste actuelle :

```
DATABASE_URL=postgresql://...          # Supabase pooler (port 5432, PAS de ?pgbouncer=true)
ANTHROPIC_API_KEY=sk-ant-...
DROP_GENERATION_MODEL=sonnet           # sonnet (défaut) | opus
FAL_KEY=...
CRON_SECRET=...                        # bearer pour /api/cron/expire
SALT_SEED=...                          # random long — base du daily salt visiteur
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
BETTER_AUTH_SECRET=...                 # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
RESEND_API_KEY=...
RESEND_FROM_EMAIL=onboarding@resend.dev # sandbox (livre uniquement au compte Resend)
UPLOAD_DIR=/data/uploads               # Volume Docker persistant Dokploy (uploads photos patron)
```

---

## Toujours / Jamais

- **Toujours** lancer `pnpm typecheck` et `pnpm lint` avant un commit.
- **Toujours** tester la génération avec un vrai input réel (pas "lorem ipsum") quand on touche aux prompts. Les prompts cassent silencieusement.
- **Toujours** garder les 3 drops de seed à jour — ce sont les exemples de référence du repo.
- **Toujours** consommer `var(--bg)` / `var(--text)` / `var(--accent)` / `var(--accent-fg)` / `var(--soft)` dans les templates publics, JAMAIS les classes Tailwind `bg-cream` / `text-violet` / etc. — Shell injecte les vars selon `User.brandColor`. Dashboard reste neutre cream/ink (pas brandé).
- **Jamais** push des secrets. `.env.local` est dans `.gitignore`. Grep défensif avant `git add`.
- **Jamais** changer le schema `DropContent` sans mettre à jour les 5 templates en même temps. Le template attend exactement ces clés.
- **Jamais** déployer un drop sans `expires_at` set. Sinon il reste vivant pour toujours, contradiction avec la promesse produit.
- **Jamais** ajouter du contenu debug visible côté `/d/[slug]` (compteurs vues, modèle, slug, etc.) — ces signaux n'ont rien à faire devant un visiteur. Dashboard `/dashboard/d/[id]` est l'endroit pour les métriques patron.

---

## Seeds de référence

Trois drops seed dans `db:seed`, couvrant les trois templates les plus différents en composition (guide pratique, quiz, annonce) :

1. **Plombier Lyon** — « Pourquoi 80% des chaudières lâchent en novembre » (template `how-to`, checklist + CTA devis)
2. **Coach pro Bordeaux** — « Tu changes de boîte ? » (template `quiz`, lead capture)
3. **Restaurant Lille** — « Le menu de cette semaine en 3 plats » (template `announcement`, CTA réservation)

Ces trois exemples servent de base de référence pour vérifier les templates et calibrer les prompts.

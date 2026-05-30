# Drop

Un patron de TPE/PME tape une phrase. En 90 secondes, Drop génère un mini-site partageable (texte, image, interaction, CTA, tracking), accessible sous `/d/<slug>`, qui s'auto-détruit après 7 jours.

→ **Démo** : <https://getdrop.cloud/signin> (auth par magic link, self-service)
→ **Status uptime** : <https://stats.uptimerobot.com/Rd3dJ0eSNG>
→ **Deck de pitch** : [`Drop_Pitch_Jury.pdf`](./Drop_Pitch_Jury.pdf)

## Stack

- **Framework** : Next.js 15 (App Router), TypeScript strict, Node 20
- **UI** : Tailwind v4 (`@theme` custom), animations CSS pures
- **DB** : PostgreSQL, Prisma 5.22, schema poussé via `prisma db push`
- **Auth** : Better Auth — magic link via Resend, sessions DB
- **IA texte** : Anthropic Claude — Sonnet 4.6 par défaut (Opus 4.7 opt-in via `DROP_GENERATION_MODEL`), tool-use structuré + retry Zod + fallback modèle
- **IA image** : fal.ai (Flux Schnell, ~2s) OU upload patron (filesystem volume + abstraction `src/lib/storage/`)
- **IA voice** : OpenAI Whisper (`whisper-1`, langue `fr`) — entrée vocale optionnelle sur `/new`
- **Rate limit** : Upstash Redis sliding windows (préfixes distincts par route)
- **Tracking** : table `drop_events` custom + hash visiteur quotidien (SHA-256 + HMAC daily salt → RGPD-anonyme)
- **Hébergement** : VPS Hostinger + Dokploy v0.29.5 (Traefik + Let's Encrypt + volume Docker persistant)

## Run locally

Requiert Node 20+, pnpm 9.12, Postgres (Docker local, Neon ou Supabase).

```bash
pnpm install
cp .env.example .env.local       # remplir les clés API + DATABASE_URL
pnpm db:push                     # crée les tables Prisma
pnpm db:seed                     # peuple slug_words + 3 users démo + 3 drops démo
pnpm dev                         # http://localhost:3000
```

Sanity avant push :
```bash
pnpm typecheck && pnpm lint
```

## Architecture

Doc complète dans [`Docs/`](./Docs/) :

| Doc | Contenu |
|---|---|
| `01-ai-contract.md` | Schema Zod `DropContent` + system prompt Claude |
| `02-database.md` | Modèle Prisma (User, Drop, DropEvent, SlugWord) |
| `03-generation-pipeline.md` | Flow `/api/generate` (SSE streaming, retry Zod, fallback modèle) |
| `04-templates.md` | 5 templates React (how-to, manifesto, case-study, quiz, announcement) + Shell |
| `05-auth.md` | Better Auth + magic link Resend |
| `06-dashboard.md` | Espace patron (liste drops, KPIs, timeline events) |
| `07-pitch-video.md` | Script et structure de la vidéo de pitch |
| `08-livraison-jury.md` | Procédure de livraison + monitoring + plan B |

[`CLAUDE.md`](./CLAUDE.md) résume les conventions de code et l'architecture en une page.

## Déploiement

[`DEPLOY.md`](./DEPLOY.md) — procédure complète pour redéployer le projet sur un nouveau VPS Hostinger + Dokploy : DNS, services Postgres + Application, env, volume persistant, bootstrap DB, cron horaire, vérifs post-deploy + 10 pièges rencontrés au premier déploiement (avec leur fix).

## Hackathon

Académie IApreneurs × Hostinger — mai 2026 — Thème 02 (Création de contenu).

## Équipe

Marine Carité — <contact@marinecarite.fr>

## Licence

Code source distribué sans licence explicite — non réutilisable hors démonstration au jury sans accord.

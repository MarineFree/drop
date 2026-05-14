# 02 — Database & Schema

Schema Prisma complet, indexes critiques, requêtes types, seed data pour la démo.

---

## 1. Setup

```bash
pnpm add prisma @prisma/client
pnpm add -D prisma
pnpm dlx prisma init
```

`DATABASE_URL` dans `.env.local` :

```
DATABASE_URL="postgresql://user:pass@host:5432/drop?schema=public"
```

Pour la démo locale : Postgres en Docker ou Neon free tier. **Pas SQLite** : on a besoin de `jsonb` natif pour stocker le `DropContent`.

---

## 2. Schema complet (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ────────────────────────────────────────────────
// USER : patron de PME
// ────────────────────────────────────────────────
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String?
  business     String?  // "Plomberie Lyon Centre"
  trade        String?  // "plombier", "coach", utilisé en context IA
  createdAt    DateTime @default(now())

  drops        Drop[]
  events       DropEvent[]

  @@map("users")
}

// ────────────────────────────────────────────────
// DROP : un mini-site généré
// ────────────────────────────────────────────────
model Drop {
  id           String     @id @default(cuid())
  slug         String     @unique                    // "lent-papillon-mauve"
  userId       String
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Input source
  rawInput     String     @db.Text                   // ce que le patron a tapé/dicté
  inputKind    InputKind  @default(TEXT)

  // Output IA structuré
  content      Json                                   // DropContent (Zod-validated avant insert)
  imageUrl     String?    @db.Text                    // URL fal.ai
  templateType TemplateType

  // Lifecycle
  createdAt    DateTime   @default(now())
  expiresAt    DateTime                              // createdAt + 7 jours
  isActive     Boolean    @default(true)             // false après expiration ou soft-delete

  // Stats dénormalisées (mises à jour par job)
  viewCount    Int        @default(0)
  ctaCount     Int        @default(0)

  events       DropEvent[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([expiresAt, isActive])                     // pour le cron d'expiration
  @@map("drops")
}

enum InputKind {
  TEXT
  VOICE
}

enum TemplateType {
  HOW_TO
  MANIFESTO
  CASE_STUDY
  QUIZ
  ANNOUNCEMENT
}

// ────────────────────────────────────────────────
// EVENT : tracking minimal sans cookies
// ────────────────────────────────────────────────
model DropEvent {
  id           String     @id @default(cuid())
  dropId       String
  drop         Drop       @relation(fields: [dropId], references: [id], onDelete: Cascade)

  userId       String?    // null si visiteur anonyme
  user         User?      @relation(fields: [userId], references: [id], onDelete: SetNull)

  kind         EventKind
  metadata     Json?                                  // { from: "linkedin", quiz_score: 3, etc. }

  // Anonymisé : pas d'IP brute, hash quotidien
  visitorHash  String     @db.VarChar(64)
  userAgent    String?    @db.VarChar(200)

  createdAt    DateTime   @default(now())

  @@index([dropId, kind, createdAt])
  @@index([visitorHash])
  @@map("drop_events")
}

enum EventKind {
  VIEW                // page chargée
  SCROLL_50           // 50% de la page lue
  SCROLL_COMPLETE     // bas atteint
  INTERACTION_START   // clic sur quiz/poll
  INTERACTION_DONE    // quiz/poll complété
  CTA_CLICK           // clic sur le bouton final
  LEAD_SUBMITTED      // formulaire envoyé
}

// ────────────────────────────────────────────────
// SLUG_WORDS : pour générer des slugs lisibles
// ────────────────────────────────────────────────
model SlugWord {
  id           Int      @id @default(autoincrement())
  word         String   @unique
  kind         SlugKind

  @@index([kind])
  @@map("slug_words")
}

enum SlugKind {
  ADJECTIVE   // "lent", "mauve", "carré"
  NOUN        // "papillon", "phare", "atelier"
  COLOR       // "ocre", "indigo", "ardoise"
}
```

---

## 3. Pourquoi ces choix

**`content` en `Json` (jsonb)** : Plutôt que d'éclater `DropContent` en 15 tables relationnelles, on stocke l'objet entier. C'est lu/écrit en bloc, jamais requêté par sous-champ. Gain : 0 jointure, 0 migration quand le schema Zod évolue.

**`expiresAt` indexé avec `isActive`** : le cron tourne `WHERE expiresAt < NOW() AND isActive = true`. Sans cet index composite, le cron scanne toute la table à chaque heure.

**`visitorHash` au lieu d'IP** : RGPD-friendly. Hash = `sha256(ip + dateDuJour + secret)`. Identifie un visiteur unique sur la journée, oublie à minuit. Aucun cookie. C'est l'approche Plausible.

**`viewCount` / `ctaCount` dénormalisés** : pour afficher les stats au patron sans agréger 50 000 events à chaque page. Incrémentés par triggers SQL ou par job toutes les 5 minutes (au choix selon ce qui rentre dans le hackathon).

**Pas de table `Template`** : les templates sont du code React, pas de la data. Inutile en DB.

---

## 4. Génération de slug (`src/lib/slug.ts`)

```ts
import { prisma } from './db'

const MAX_ATTEMPTS = 10

export async function generateUniqueSlug(): Promise<string> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const [adj, noun, color] = await Promise.all([
      prisma.slugWord.findFirst({ where: { kind: 'ADJECTIVE' }, skip: randInt(150) }),
      prisma.slugWord.findFirst({ where: { kind: 'NOUN' }, skip: randInt(150) }),
      prisma.slugWord.findFirst({ where: { kind: 'COLOR' }, skip: randInt(40) }),
    ])
    const slug = `${adj!.word}-${noun!.word}-${color!.word}`
    const exists = await prisma.drop.findUnique({ where: { slug }, select: { id: true } })
    if (!exists) return slug
  }
  // Fallback impossible en pratique : 150 × 150 × 40 = 900 000 combos
  throw new Error('Slug generation exhausted')
}

const randInt = (n: number) => Math.floor(Math.random() * n)
```

Seed les `slug_words` une fois pour toutes (cf. seed plus bas).

---

## 5. Le client Prisma (`src/lib/db.ts`)

Pattern singleton pour éviter le "too many connections" en dev :

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## 6. Requêtes critiques

### Créer un drop (transaction)

```ts
import { DropContentSchema } from './ai/schema'

export async function createDrop(input: {
  userId: string
  rawInput: string
  inputKind: 'TEXT' | 'VOICE'
  content: unknown            // sortie brute du tool_use, à valider
  imageUrl: string | null
}) {
  // Validation stricte AVANT insert
  const parsed = DropContentSchema.parse(input.content)

  const slug = await generateUniqueSlug()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  return prisma.drop.create({
    data: {
      userId: input.userId,
      slug,
      rawInput: input.rawInput,
      inputKind: input.inputKind,
      content: parsed,
      imageUrl: input.imageUrl,
      templateType: parsed.template_type.toUpperCase().replace('-', '_') as any,
      expiresAt,
    },
  })
}
```

### Lire un drop public

```ts
export async function getActiveDropBySlug(slug: string) {
  return prisma.drop.findFirst({
    where: { slug, isActive: true, expiresAt: { gt: new Date() } },
    select: {
      slug: true,
      content: true,
      imageUrl: true,
      templateType: true,
      createdAt: true,
      expiresAt: true,
      user: { select: { business: true, trade: true } },
    },
  })
}
```

### Marquer les drops expirés (cron)

```ts
export async function expireOldDrops() {
  const result = await prisma.drop.updateMany({
    where: { expiresAt: { lt: new Date() }, isActive: true },
    data: { isActive: false },
  })
  return result.count
}
```

### Tracker un event

```ts
import { createHash } from 'crypto'

export async function trackEvent(input: {
  dropId: string
  kind: EventKind
  ip: string
  userAgent?: string
  metadata?: Record<string, unknown>
}) {
  const today = new Date().toISOString().slice(0, 10)
  const visitorHash = createHash('sha256')
    .update(`${input.ip}|${today}|${process.env.HASH_SECRET}`)
    .digest('hex')

  await prisma.dropEvent.create({
    data: {
      dropId: input.dropId,
      kind: input.kind,
      visitorHash,
      userAgent: input.userAgent?.slice(0, 200),
      metadata: input.metadata ?? undefined,
    },
  })

  // Update dénormalisé (fire-and-forget, pas critique)
  if (input.kind === 'VIEW') {
    prisma.drop.update({
      where: { id: input.dropId },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {})
  }
  if (input.kind === 'CTA_CLICK') {
    prisma.drop.update({
      where: { id: input.dropId },
      data: { ctaCount: { increment: 1 } },
    }).catch(() => {})
  }
}
```

---

## 7. Seed pour la démo (`prisma/seed.ts`)

```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ADJECTIVES = ['lent','vif','calme','brut','clair','dense','fin','frais','net','ample','sobre','vibrant', /* … 150 */]
const NOUNS = ['papillon','phare','atelier','sentier','horizon','rivage','colline','silex','glycine','ardoise','onyx', /* … 150 */]
const COLORS = ['ocre','indigo','ardoise','mauve','ivoire','prune','sienne','olive','rouille','encre', /* … 40 */]

async function main() {
  // Slug words
  for (const word of ADJECTIVES) {
    await prisma.slugWord.upsert({ where: { word }, update: {}, create: { word, kind: 'ADJECTIVE' } })
  }
  for (const word of NOUNS) {
    await prisma.slugWord.upsert({ where: { word }, update: {}, create: { word, kind: 'NOUN' } })
  }
  for (const word of COLORS) {
    await prisma.slugWord.upsert({ where: { word }, update: {}, create: { word, kind: 'COLOR' } })
  }

  // 3 users démo
  const plombier = await prisma.user.upsert({
    where: { email: 'plombier@demo.fr' },
    update: {},
    create: { email: 'plombier@demo.fr', name: 'Marc Dubois', business: 'Plomberie Lyon Centre', trade: 'plombier' },
  })
  const coach = await prisma.user.upsert({
    where: { email: 'coach@demo.fr' },
    update: {},
    create: { email: 'coach@demo.fr', name: 'Aïcha Martin', business: 'Cap Transition', trade: 'coach' },
  })
  const resto = await prisma.user.upsert({
    where: { email: 'resto@demo.fr' },
    update: {},
    create: { email: 'resto@demo.fr', name: 'Théo Lehmann', business: 'Table d\'Adèle', trade: 'restaurateur' },
  })

  // Les 3 drops de démo sont générés par script séparé : `pnpm tsx scripts/seed-drops.ts`
  // (parce qu'ils nécessitent des appels API réels à Claude + fal.ai)
  console.log({ plombier, coach, resto })
}

main().finally(() => prisma.$disconnect())
```

---

## 8. Migrations pendant le hackathon

```bash
pnpm db:push     # synchronise sans créer de fichier de migration
pnpm db:seed     # peuple les slug_words et users démo
```

**Ne pas utiliser `prisma migrate dev`** pendant les 2 semaines de hackathon. Trop de friction quand on itère sur le schema. On migrera proprement quand le projet sera stabilisé.

---

## 9. Backup avant la démo

Le jour J, **dump la DB** avant tout test live :

```bash
pg_dump $DATABASE_URL > backup-demo-day.sql
```

Si un test plante les 3 drops seed pendant la démo, restore en 30 secondes :

```bash
psql $DATABASE_URL < backup-demo-day.sql
```

C'est paranoïaque mais ça a sauvé plus d'un hackathon.

import {
  AiModel,
  EventKind,
  Prisma,
  type Drop,
  type InputKind,
  InteractionType,
} from '@prisma/client'
import { prisma } from '../db'
import { generateSlugCandidate } from '../slug'
import { type ModelTag } from '../ai/generate'
import { toPrismaTemplateType, type DropContent } from '../ai/schema'

const TTL_DAYS = 7
const SLUG_RETRY_MAX = 5

const AI_MODEL_MAP: Record<ModelTag, AiModel> = {
  opus: AiModel.OPUS,
  sonnet: AiModel.SONNET,
}

export interface DropMetadata {
  hasInteraction: boolean
  interactionType: InteractionType | null
  sectionCount: number
}

/**
 * Calcule les champs dénormalisés à stocker sur `Drop`.
 * Source de vérité : le JSON validé par Zod. À appeler une fois à la création.
 */
export function extractDropMetadata(content: DropContent): DropMetadata {
  const kind = content.interaction.kind

  const hasInteraction = kind !== 'none'
  const interactionType: InteractionType | null =
    kind === 'quiz' ? InteractionType.QUIZ : kind === 'poll' ? InteractionType.POLL : null

  // Invariant impossible à déclencher par construction — sert de garde-fou pour
  // les modifs futures qui voudraient diverger l'un sans l'autre.
  if (hasInteraction !== (interactionType !== null)) {
    throw new Error(
      '[extractDropMetadata] invariant violated: hasInteraction must equal (interactionType !== null)'
    )
  }

  return {
    hasInteraction,
    interactionType,
    sectionCount: content.sections.length,
  }
}

export interface CreateDropInput {
  userId: string
  rawInput: string
  inputKind: InputKind
  /** Déjà validé par DropContentSchema en amont. */
  content: DropContent
  imageUrl: string | null
  /** Modèle effectif renvoyé par `generateDrop()` — persisté pour analytics fallback. */
  modelUsed: ModelTag
  /** URL de redirection du bouton CTA (déjà validée `.url()` côté route). `null` = bouton caché. */
  ctaUrl: string | null
}

function isSlugCollision(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false
  if (err.code !== 'P2002') return false
  const target = err.meta?.target
  return Array.isArray(target) && target.includes('slug')
}

/**
 * Crée un Drop avec garantie d'unicité de slug : on tire un candidat, on insère,
 * on rattrape P2002 sur la colonne `slug` et on retire — jusqu'à `SLUG_RETRY_MAX` tentatives.
 * Au-delà, c'est qu'il faut étoffer `slug_words`.
 */
export async function createDrop(input: CreateDropInput): Promise<Drop> {
  const metadata = extractDropMetadata(input.content)
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000)
  const hasAudio = input.inputKind === 'VOICE'
  const templateType = toPrismaTemplateType(input.content.template_type)

  let lastErr: unknown
  for (let attempt = 0; attempt < SLUG_RETRY_MAX; attempt++) {
    const slug = await generateSlugCandidate()
    try {
      return await prisma.drop.create({
        data: {
          slug,
          userId: input.userId,
          rawInput: input.rawInput,
          inputKind: input.inputKind,
          content: input.content as unknown as Prisma.InputJsonValue,
          imageUrl: input.imageUrl,
          ctaUrl: input.ctaUrl,
          templateType,
          hasAudio,
          hasInteraction: metadata.hasInteraction,
          interactionType: metadata.interactionType,
          sectionCount: metadata.sectionCount,
          modelUsed: AI_MODEL_MAP[input.modelUsed],
          expiresAt,
        },
      })
    } catch (err) {
      if (!isSlugCollision(err)) throw err
      lastErr = err
    }
  }
  throw new Error(
    `Slug collision after ${SLUG_RETRY_MAX} attempts — étoffer slug_words. last: ${String(lastErr)}`
  )
}

// ────────────────────────────────────────────────────────────
// Lecture publique : page `/d/[slug]`
// ────────────────────────────────────────────────────────────

const PUBLIC_DROP_SELECT = {
  id: true,
  slug: true,
  content: true,
  imageUrl: true,
  ctaUrl: true,
  templateType: true,
  expiresAt: true,
  createdAt: true,
  user: { select: { business: true, trade: true } },
} satisfies Prisma.DropSelect

export type PublicDrop = Prisma.DropGetPayload<{ select: typeof PUBLIC_DROP_SELECT }>

// ────────────────────────────────────────────────────────────
// Dashboard patron : queries sur les drops d'un user
// ────────────────────────────────────────────────────────────

const DASHBOARD_DROP_SELECT = {
  id: true,
  slug: true,
  content: true,
  imageUrl: true,
  templateType: true,
  viewCount: true,
  ctaCount: true,
  createdAt: true,
  expiresAt: true,
  isActive: true,
} satisfies Prisma.DropSelect

export type DashboardDrop = Prisma.DropGetPayload<{ select: typeof DASHBOARD_DROP_SELECT }>

/**
 * Liste les drops d'un user (les 50 derniers par défaut, ordre desc createdAt)
 * + agrégats globaux. Les 2 queries en parallèle. Index `(userId, createdAt DESC)`
 * du schema garantit que c'est O(limit), pas O(table).
 */
export async function getUserDrops(userId: string, limit = 50) {
  const [drops, totals] = await Promise.all([
    prisma.drop.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: DASHBOARD_DROP_SELECT,
    }),
    prisma.drop.aggregate({
      where: { userId },
      _sum: { viewCount: true, ctaCount: true },
      _count: { id: true },
    }),
  ])
  return { drops, totals }
}

/**
 * Détail d'un drop POUR son propriétaire (page dashboard détail).
 * Le `where: { id, userId }` est crucial : interdit l'access aux drops d'autres
 * users via ID guessing. Retourne `null` (→ notFound() côté page) plutôt que
 * de leak l'existence.
 */
export async function getUserDropById(userId: string, dropId: string) {
  return prisma.drop.findFirst({
    where: { id: dropId, userId },
    include: {
      events: { orderBy: { createdAt: 'desc' }, take: 200 },
    },
  })
}

export type DashboardDropDetail = NonNullable<
  Awaited<ReturnType<typeof getUserDropById>>
>

/**
 * Retourne le drop si actif (non soft-deleted ET non expiré), sinon `null`.
 * Sémantique stricte : un drop en DB avec `isActive = false` OU `expiresAt <= now()`
 * est traité comme inexistant — la page publique doit renvoyer 404.
 *
 * Inclut la relation `user` (business + trade) pour le rendu du template
 * (cf. Docs/03 §5). Pas d'inclusion des events — fetched séparément si besoin.
 */
export async function getActiveDropBySlug(slug: string): Promise<PublicDrop | null> {
  return prisma.drop.findFirst({
    where: {
      slug,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    select: PUBLIC_DROP_SELECT,
  })
}

// ────────────────────────────────────────────────────────────
// Cron d'expiration
// ────────────────────────────────────────────────────────────

/**
 * Soft-delete des drops dont `expiresAt` est dépassé.
 * Pas de DELETE physique : on garde la row pour analytics post-mortem
 * et pour pouvoir restaurer manuellement si nécessaire.
 *
 * Index `[expiresAt, isActive]` (cf. schema.prisma) → cette requête scanne
 * seulement les rows candidates, pas toute la table.
 *
 * @returns nombre de drops qui sont passés de `isActive: true` à `isActive: false`.
 */
export async function expireOldDrops(): Promise<number> {
  const result = await prisma.drop.updateMany({
    where: {
      expiresAt: { lt: new Date() },
      isActive: true,
    },
    data: { isActive: false },
  })
  return result.count
}

// ────────────────────────────────────────────────────────────
// Tracking d'events
// ────────────────────────────────────────────────────────────

export interface TrackEventInput {
  dropId: string
  kind: EventKind
  /** Calculé par `hashVisitor()` côté route (cf. src/lib/privacy/visitor.ts). */
  visitorHash: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

/**
 * Map event kind → champ compteur dénormalisé à incrémenter, ou `null` si pas de compteur.
 */
function counterFieldFor(kind: EventKind): 'viewCount' | 'ctaCount' | null {
  switch (kind) {
    case EventKind.VIEW:
      return 'viewCount'
    case EventKind.CTA_CLICK:
      return 'ctaCount'
    default:
      return null
  }
}

/**
 * Insère un `DropEvent` et, si l'event impacte un compteur dénormalisé du `Drop`
 * (`viewCount` ou `ctaCount`), incrémente atomiquement via `prisma.$transaction`.
 *
 * Pas de fire-and-forget : `await` propage les erreurs à la route appelante,
 * qui choisit comment les gérer (log, swallow, retry).
 */
export async function trackEvent(input: TrackEventInput): Promise<void> {
  const createOp = prisma.dropEvent.create({
    data: {
      dropId: input.dropId,
      kind: input.kind,
      visitorHash: input.visitorHash,
      userAgent: input.userAgent?.slice(0, 200),
      metadata: (input.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
  })

  const counterField = counterFieldFor(input.kind)
  if (counterField === null) {
    await createOp
    return
  }

  const updateOp = prisma.drop.update({
    where: { id: input.dropId },
    data: { [counterField]: { increment: 1 } },
  })

  await prisma.$transaction([createOp, updateOp])
}

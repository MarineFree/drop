import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { EventKind } from '@prisma/client'
import { prisma } from '@/lib/db'
import { trackEvent } from '@/lib/db/drops'
import { hashVisitor, parseClientIp } from '@/lib/privacy/visitor'
import { getEventsRateLimit } from '@/lib/ratelimit'

export const runtime = 'nodejs'
// Pas de cache — chaque event doit toucher la DB pour incrémenter les compteurs
// dénormalisés et alimenter la timeline du dashboard.
export const dynamic = 'force-dynamic'

// Subset de EventKind autorisé depuis le client public. VIEW est tracké côté
// serveur sur /d/[slug]/page.tsx, CTA_CLICK sur /api/d/[slug]/cta. LEAD_SUBMITTED
// pas exposé (pas de form lead capture en place).
const ALLOWED_KINDS = ['SCROLL_50', 'SCROLL_COMPLETE', 'INTERACTION_START', 'INTERACTION_DONE'] as const

const BodySchema = z.object({
  dropSlug: z.string().min(1).max(120),
  kind: z.enum(ALLOWED_KINDS),
})

export async function POST(req: NextRequest) {
  // 1. Rate limit IP avant tout — pas la peine de parser le body si on rejette.
  const ip = parseClientIp(req.headers)
  const rl = await getEventsRateLimit().limit(ip)
  if (!rl.success) {
    return new Response(null, { status: 429 })
  }

  // 2. Parse body. sendBeacon peut envoyer en text/plain : `req.json()` marche
  // tant que le body est du JSON valide, peu importe le Content-Type.
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return new Response(null, { status: 400 })
  }

  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return new Response(null, { status: 400 })
  }
  const { dropSlug, kind } = parsed.data

  // 3. Résoudre le drop par slug. On veut juste l'id pour `trackEvent`, donc
  // un select minimal — pas besoin de passer par `getActiveDropBySlug` qui
  // charge tout le content JSON. On accepte aussi les drops EXPIRÉS pour ne
  // pas perdre les events de queue (un visiteur peut interagir 1s après
  // l'expiration), tant que la row existe.
  const drop = await prisma.drop.findUnique({
    where: { slug: dropSlug },
    select: { id: true, isActive: true },
  })
  if (!drop || !drop.isActive) {
    return new Response(null, { status: 404 })
  }

  // 4. Hash visiteur anonyme + tracking. Swallow les erreurs DB en log côté
  // serveur — l'event est best-effort côté client, autant le rester côté serveur.
  const visitorHash = hashVisitor(req.headers, drop.id)
  const userAgent = req.headers.get('user-agent') ?? undefined

  try {
    await trackEvent({
      dropId: drop.id,
      kind: kind as EventKind,
      visitorHash,
      userAgent,
    })
  } catch (err) {
    console.error(`[api/events] trackEvent failed kind=${kind} drop=${drop.id}`, err)
    return new Response(null, { status: 500 })
  }

  return new Response(null, { status: 204 })
}

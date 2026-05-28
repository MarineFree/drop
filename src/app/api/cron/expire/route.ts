import type { NextRequest } from 'next/server'
import { expireOldDrops } from '@/lib/db/drops'

export const runtime = 'nodejs'
// Pas de cache — chaque tick cron doit toucher la DB. Sinon les drops
// expirés resteraient visibles pendant la TTL du cache.
export const dynamic = 'force-dynamic'

// Endpoint cron orchestrant le soft-delete (isActive = false) des drops dont
// expiresAt < now. Conçu pour être appelé HOURLY par :
//   - Dokploy Schedules (cf. DEPLOY.md, recommandé)
//   - crontab système du VPS
//   - n'importe quel scheduler externe avec le bon bearer
//
// Auth : Bearer ${CRON_SECRET}. Si la var d'env n'est pas définie, on REFUSE
// systématiquement plutôt que d'accepter un secret vide (qui collisionnerait
// trivialement avec un header bidouillé).
//
// Idempotent : un drop déjà `isActive: false` n'est pas re-touché grâce au
// filtre `isActive: true` du updateMany. Lancer 10 fois = 1 fois.
//
// Méthode POST volontairement (pas GET) pour bloquer les preview links de chat
// (Slack/iMessage) qui font des GET de prévisualisation et déclencheraient
// involontairement le job.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[api/cron/expire] CRON_SECRET not configured — refusing request')
    return new Response('Cron not configured', { status: 503 })
  }

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const expired = await expireOldDrops()
    console.log(`[api/cron/expire] soft-deleted ${expired} drops`)
    return Response.json({
      ok: true,
      expired,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[api/cron/expire] expireOldDrops failed', err)
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

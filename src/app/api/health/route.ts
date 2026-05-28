import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
// Pas de cache — un check de santé doit refléter l'instant T, pas un snapshot.
export const dynamic = 'force-dynamic'

// Endpoint public utilisé par les uptime checkers (UptimeRobot, Better Stack, etc.)
// + le healthcheck Dokploy / Traefik. Doit rester ultra léger : un seul SELECT 1.
// Pas d'auth — exposer l'état de santé est explicitement le but.
//
// Format de réponse stable : tout consommateur tiers s'appuie sur la présence
// de `ok` (boolean) au top-level. Les autres champs peuvent évoluer.
export async function GET() {
  const startedAt = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json(
      {
        ok: true,
        db: 'ok',
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[api/health] DB check failed', err)
    return Response.json(
      {
        ok: false,
        db: 'fail',
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

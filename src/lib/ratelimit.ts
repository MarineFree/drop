import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Instanciation paresseuse : si UPSTASH_* ne sont pas set en dev,
// l'import du module ne plante pas — seules les routes qui appellent
// `getGenerateRateLimit()` échoueront.

let _redis: Redis | null = null
function getRedis(): Redis {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN sont requis')
  }
  _redis = new Redis({ url, token })
  return _redis
}

let _generateLimit: Ratelimit | null = null

/**
 * 10 générations / heure / IP. Ajustable.
 * `slidingWindow` plutôt que `fixedWindow` pour éviter les bursts à la frontière.
 */
export function getGenerateRateLimit(): Ratelimit {
  if (_generateLimit) return _generateLimit
  _generateLimit = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    analytics: true,
    prefix: 'drop:generate',
  })
  return _generateLimit
}

/** Identifiant client pour le rate limit. Reproduit la logique IP-derrière-proxy. */
export function getClientIdentifier(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip') ?? 'anonymous'
}

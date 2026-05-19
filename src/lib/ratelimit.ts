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

let _transcribeLimit: Ratelimit | null = null

/**
 * 30 transcriptions / heure / IP. Plus généreux que generate parce qu'une
 * transcription peut être ratée (silence, abandon) et que le user doit pouvoir
 * réessayer. Prefix distinct → n'érode pas le quota generate.
 */
export function getTranscribeRateLimit(): Ratelimit {
  if (_transcribeLimit) return _transcribeLimit
  _transcribeLimit = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(30, '1 h'),
    analytics: true,
    prefix: 'drop:transcribe',
  })
  return _transcribeLimit
}

let _eventsLimit: Ratelimit | null = null

/**
 * 60 events / heure / IP. Volume légitime : un visiteur émet ~4-5 events par
 * drop view (SCROLL_50, SCROLL_COMPLETE, INTERACTION_START, INTERACTION_DONE).
 * Multi-onglets compris, 60/h couvre confortablement. Prefix distinct des autres.
 */
export function getEventsRateLimit(): Ratelimit {
  if (_eventsLimit) return _eventsLimit
  _eventsLimit = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(60, '1 h'),
    analytics: true,
    prefix: 'drop:events',
  })
  return _eventsLimit
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

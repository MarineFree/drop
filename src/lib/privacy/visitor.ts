import { createHash, createHmac } from 'node:crypto'

/**
 * Hash visiteur **anonyme** (au sens RGPD, doctrine CNIL actuelle) :
 *
 *   hash = SHA-256( IP | UA | dropId | DAILY_SALT )
 *
 * DAILY_SALT est dérivé par HMAC( env.SALT_SEED, today_UTC_yyyy-mm-dd ).
 * Aucune persistance du sel — il se régénère naturellement chaque jour.
 *
 * Conséquence : impossible de corréler un visiteur d'un jour à l'autre.
 * Les métriques perdues : "uniques sur 7 jours". Conservé : tout ce qui est intra-day.
 */

/**
 * Next 15 App Router ne fournit plus `request.ip`. Il faut lire les headers proxy.
 *
 * Ordre :
 *   1. `x-forwarded-for` : "client, proxy1, proxy2" → on prend la première (IP cliente).
 *   2. `x-real-ip` : fallback (certains reverse proxies).
 *   3. `'unknown'` : sentinelle hashable. Pas chaîne vide — on veut pouvoir tracer
 *      les requêtes sans header (peut arriver en serverless ou en dev local).
 *
 * Exporté car la même logique sera utile pour le rate limit per-IP côté `ratelimit.ts`.
 */
export function parseClientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first
  }
  const real = headers.get('x-real-ip')
  if (real) return real

  if (process.env.NODE_ENV !== 'production') {
    // En prod, un header manquant peut être légitime (serverless cold start, route interne, etc.)
    // — on ne spamme pas les logs. En dev, ça signale presque toujours un setup incomplet.
    console.warn('[hashVisitor] no client IP in headers')
  }
  return 'unknown'
}

function getDailySalt(): string {
  const seed = process.env.SALT_SEED
  if (!seed) throw new Error('SALT_SEED env var is required for visitor hashing')
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD en UTC
  return createHmac('sha256', seed).update(today).digest('hex')
}

/**
 * Accepte un `Headers` directement (interface Web standard) plutôt qu'un `NextRequest`.
 * Compatible à la fois avec :
 *  - les API routes : `hashVisitor(req.headers, dropId)`
 *  - les Server Components : `hashVisitor(await headers(), dropId)` (next/headers)
 */
export function hashVisitor(headers: Headers, dropId: string): string {
  const ip = parseClientIp(headers)
  const ua = headers.get('user-agent') ?? ''
  const dailySalt = getDailySalt()
  return createHash('sha256').update(`${ip}|${ua}|${dropId}|${dailySalt}`).digest('hex')
}

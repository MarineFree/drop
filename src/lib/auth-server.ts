import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './auth'

/**
 * Retourne le user de la session courante, ou `null` si non authentifié.
 * À utiliser dans les Server Components, Server Actions, ou API routes (App Router).
 */
export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

/**
 * Garantit qu'un user est authentifié. Si non, redirige vers `/signin` avec un
 * `redirect` param pour revenir après login. Ne JAMAIS faire confiance au seul
 * middleware (CVE-2025-29927 : header `x-middleware-subrequest` peut bypass).
 */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect('/signin')
  return user
}

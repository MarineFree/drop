import { createAuthClient } from 'better-auth/react'
import { magicLinkClient } from 'better-auth/client/plugins'

// baseURL : en browser, on est toujours sur le même origin que les routes
// `/api/auth/*` → `window.location.origin` est la valeur canonique, jamais
// stale (vs `process.env.NEXT_PUBLIC_BASE_URL` inliné au build qui peut être
// la mauvaise valeur si le build a tourné sans la bonne env var).
//
// SSR (typeof window === 'undefined') : on tombe sur NEXT_PUBLIC_BASE_URL,
// puis sur localhost en dernier recours (dev local).
function resolveBaseURL(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
}

export const authClient = createAuthClient({
  baseURL: resolveBaseURL(),
  plugins: [magicLinkClient()],
})

export const { signIn, signOut, useSession } = authClient

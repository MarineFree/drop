import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/lib/auth'

// API current Better Auth : passer l'instance `auth` directement, pas `auth.handler`.
// (Docs/05 et certaines refs antérieures montrent `auth.handler` — outdated.)
export const { GET, POST } = toNextJsHandler(auth)

import { NextResponse, type NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

// Défense en profondeur :
// - Le middleware fait un check rapide pour la redirection UX (pas de session → /signin)
// - La VRAIE vérification se fait côté Server Component via `requireUser()` —
//   le middleware seul est bypassable (CVE-2025-29927, header x-middleware-subrequest).
//   `getSessionCookie` ne valide rien, vérifie juste la présence du cookie.
export function middleware(req: NextRequest) {
  const sessionCookie = getSessionCookie(req)
  if (!sessionCookie) {
    const url = new URL('/signin', req.url)
    url.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/new/:path*', '/dashboard/:path*'],
}

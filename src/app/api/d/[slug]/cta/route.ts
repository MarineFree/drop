import { NextResponse, type NextRequest } from 'next/server'
import { EventKind } from '@prisma/client'
import { prisma } from '@/lib/db'
import { trackEvent } from '@/lib/db/drops'
import { hashVisitor } from '@/lib/privacy/visitor'

export const runtime = 'nodejs'
// Pas de cache — chaque clic doit logger un event et résoudre l'URL à jour.
export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ slug: string }>
}

// Validation defense-in-depth : on a déjà validé `.url()` + `^https?:` à la
// création, mais une row peut avoir été éditée hors form. On re-vérifie ici
// pour empêcher un open-redirect (`javascript:...`, `data:...`, etc.).
function isSafeHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params

  // Lecture stricte : drop actif ET non expiré. Si le drop est expiré, le bouton
  // ne devrait jamais avoir été rendu côté template — mais le lien peut survivre
  // dans un email/screenshot, donc on renvoie 404 propre.
  const drop = await prisma.drop.findFirst({
    where: {
      slug,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, ctaUrl: true },
  })

  if (!drop || !drop.ctaUrl || !isSafeHttpUrl(drop.ctaUrl)) {
    // Même comportement 404 pour drop inconnu / sans CTA / URL toxique — pas de
    // leak d'info sur la cause exacte au visiteur.
    return new NextResponse('Not found', { status: 404 })
  }

  // Tracking CTA_CLICK — `await` pour propager les erreurs, mais on swallow :
  // un tracking raté ne doit pas casser la redirection (UX > analytics).
  const visitorHash = hashVisitor(req.headers, drop.id)
  const userAgent = req.headers.get('user-agent') ?? undefined
  try {
    await trackEvent({
      dropId: drop.id,
      kind: EventKind.CTA_CLICK,
      visitorHash,
      userAgent,
    })
  } catch (err) {
    console.error('[api/d/[slug]/cta] CTA_CLICK tracking failed', err)
  }

  // 302 (not 301) : on ne veut pas que les caches HTTP figent la cible — l'URL
  // pourrait changer si le drop est édité (pas encore implémenté mais design open).
  return NextResponse.redirect(drop.ctaUrl, 302)
}

import type { ComponentType } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { EventKind, type TemplateType } from '@prisma/client'
import { getActiveDropBySlug, trackEvent, type PublicDrop } from '@/lib/db/drops'
import { hashVisitor } from '@/lib/privacy/visitor'
import { ScrollTracker } from '@/components/d/ScrollTracker'
import { Announcement } from '@/components/templates/Announcement'
import { CaseStudy } from '@/components/templates/CaseStudy'
import { HowTo } from '@/components/templates/HowTo'
import { Manifesto } from '@/components/templates/Manifesto'
import { MinimalRender } from '@/components/templates/MinimalRender'
import { Quiz } from '@/components/templates/Quiz'

// Pas de cache statique : on lit les headers pour le tracking visiteur, donc
// chaque hit doit toucher le serveur. ISR sera réintroduit plus tard si besoin,
// avec un découplage du tracking (côté client via sendBeacon par ex).
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

interface TemplateProps {
  drop: PublicDrop
}

// Registre des 5 templates. `MinimalRender` reste le filet de sécurité si un
// nouveau TemplateType est ajouté au schema Prisma sans son template dédié.
const TEMPLATES: Partial<Record<TemplateType, ComponentType<TemplateProps>>> = {
  HOW_TO: HowTo,
  MANIFESTO: Manifesto,
  QUIZ: Quiz,
  CASE_STUDY: CaseStudy,
  ANNOUNCEMENT: Announcement,
}

export default async function DropPage({ params }: Props) {
  const { slug } = await params

  const drop = await getActiveDropBySlug(slug)
  if (!drop) notFound()

  // Tracking VIEW côté serveur. `await` pour pouvoir attraper l'erreur DB,
  // mais on swallow : un tracking raté ne doit jamais casser le render.
  const headersList = await headers()
  const visitorHash = hashVisitor(headersList, drop.id)
  try {
    await trackEvent({
      dropId: drop.id,
      kind: EventKind.VIEW,
      visitorHash,
    })
  } catch (err) {
    console.error('[d/[slug]] view tracking failed', err)
  }

  const Template = TEMPLATES[drop.templateType] ?? MinimalRender
  return (
    <>
      {/* ScrollTracker : émet SCROLL_50 / SCROLL_COMPLETE via sendBeacon vers
          /api/events. Ne rend rien visuellement, ne casse pas la composition. */}
      <ScrollTracker dropSlug={drop.slug} />
      <Template drop={drop} />
    </>
  )
}

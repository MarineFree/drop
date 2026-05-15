import type { ComponentType } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { EventKind, type AiModel, type TemplateType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getActiveDropBySlug, trackEvent, type PublicDrop } from '@/lib/db/drops'
import { hashVisitor } from '@/lib/privacy/visitor'
import { HowTo } from '@/components/templates/HowTo'
import { Manifesto } from '@/components/templates/Manifesto'
import { MinimalRender } from '@/components/templates/MinimalRender'

// Pas de cache statique : on lit les headers pour le tracking visiteur, donc
// chaque hit doit toucher le serveur. ISR sera réintroduit plus tard si besoin,
// avec un découplage du tracking (côté client via sendBeacon par ex).
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

interface TemplateProps {
  drop: PublicDrop
  viewCount: number
  modelUsed: AiModel
}

// Registre des templates implémentés. Tout templateType absent du map tombe
// sur MinimalRender (cf. ?? plus bas) — pattern extensible : pour ajouter
// CASE_STUDY / QUIZ / ANNOUNCEMENT, il suffit d'importer et de référencer ici.
const TEMPLATES: Partial<Record<TemplateType, ComponentType<TemplateProps>>> = {
  HOW_TO: HowTo,
  MANIFESTO: Manifesto,
}

export default async function DropPage({ params }: Props) {
  const { slug } = await params

  const drop = await getActiveDropBySlug(slug)
  if (!drop) notFound()

  // `getActiveDropBySlug` retourne le PublicDrop (cf. PUBLIC_DROP_SELECT) qui
  // n'inclut pas viewCount / modelUsed. 2e point-lookup sur PK indexée pour
  // ces champs — coût négligeable et on ne touche pas au helper.
  const extras = await prisma.drop.findUniqueOrThrow({
    where: { id: drop.id },
    select: { viewCount: true, modelUsed: true },
  })

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
    <Template drop={drop} viewCount={extras.viewCount} modelUsed={extras.modelUsed} />
  )
}

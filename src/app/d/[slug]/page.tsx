import { notFound } from 'next/navigation'

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

// TODO Docs/03-generation-pipeline.md §5
// - getActiveDropBySlug(slug) — 404 si expiré ou inexistant (410 Gone si on veut être précis)
// - render via <TemplateRenderer /> (à créer dans src/components/templates/renderer.tsx)
// - generateMetadata() OG-friendly
export default async function DropPage({ params }: Props) {
  const { slug } = await params
  void slug // évite le warning unused tant que la lecture DB n'est pas câblée
  notFound()
}

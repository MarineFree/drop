import { getStorage } from '@/lib/storage'

export const runtime = 'nodejs'
// `force-dynamic` parce que la résolution se fait à la requête, mais on
// applique un Cache-Control immutable côté Response → le navigateur et le
// CDN cachent agressivement. Les keys uploads sont uniques (timestamp), donc
// jamais réécrites sous le même chemin → cache immutable safe.
export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ path: string[] }>
}

// Sert les fichiers uploadés via l'abstraction Storage.
//
// En filesystem dev : équivalent au serving direct par `public/uploads/`,
// remplacé par cette route pour homogénéité avec les backends futurs (S3).
// En filesystem prod : indispensable, le volume est mounté hors de `public/`.
//
// Sécurité : aucune lookup DB, aucune auth — les URLs uploads sont publiques
// par design (elles sont rendues dans les drops publics `/d/<slug>`). Si on
// veut un jour des uploads privés, ajouter une couche d'auth ici (vérifier
// que le viewer a accès au drop qui référence cette image).
export async function GET(_req: Request, { params }: Params) {
  const { path: segments } = await params
  if (!segments || segments.length === 0) {
    return new Response('Not found', { status: 404 })
  }

  // Joindre les segments comme reçus — `getStorage().get()` re-valide qu'on
  // ne sort pas du baseDir (anti path traversal). Decode URI pour récupérer
  // les caractères encodés à l'upload.
  const key = segments.map(s => decodeURIComponent(s)).join('/')

  const storage = getStorage()
  const file = await storage.get(key)
  if (!file) {
    return new Response('Not found', { status: 404 })
  }

  return new Response(new Uint8Array(file.data), {
    headers: {
      'Content-Type': file.contentType,
      'Content-Length': String(file.data.length),
      // Les keys d'upload contiennent un timestamp unique → safe d'être
      // immutable. Un an de cache navigateur + CDN.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

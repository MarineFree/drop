import { randomBytes } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { getStorage } from '@/lib/storage'

export const runtime = 'nodejs'

// 4 MB max — confortable pour une photo téléphone bien compressée, et reste
// sous les limites par défaut Next/Traefik. Vercel Hobby plafonnait à 4.5 MB,
// on garde la même borne pour cohérence.
const MAX_SIZE = 4 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(req: NextRequest) {
  // Auth obligatoire : on ne laisse pas d'inconnus remplir le volume.
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return Response.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size === 0) {
    return Response.json({ error: 'Empty file' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return Response.json(
      { error: 'Fichier trop volumineux (max 4 Mo)' },
      { status: 413 }
    )
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      { error: 'Format non supporté (JPEG, PNG, WebP uniquement)' },
      { status: 415 }
    )
  }

  // Path namespacé par user.id (traçable / purgeable). Timestamp + 4 bytes
  // random : couvre le cas où deux uploads concurrents tombent sur la même
  // milliseconde (très improbable mais zéro risque pour le storage).
  const ext = EXT_BY_TYPE[file.type] ?? 'bin'
  const suffix = randomBytes(4).toString('hex')
  const key = `drops/${user.id}/${Date.now()}-${suffix}.${ext}`

  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const storage = getStorage()
    const { url } = await storage.put({
      key,
      data: buf,
      contentType: file.type,
    })
    return Response.json({ url })
  } catch (err) {
    console.error('[upload-image] storage.put failed:', err)
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}

import { put } from '@vercel/blob'
import type { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'

export const runtime = 'nodejs'

// Limite serveur : Vercel Hobby = 4.5 MB body. On serre à 4 MB pour
// laisser de la marge sur le multipart overhead.
const MAX_SIZE = 4 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(req: NextRequest) {
  // Auth obligatoire : on ne laisse pas d'inconnus remplir le bucket Blob.
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

  // Path namespacé par user.id pour pouvoir tracer/purger plus tard si besoin.
  // Timestamp évite les collisions sur uploads multiples consécutifs.
  const ext = EXT_BY_TYPE[file.type] ?? 'bin'
  const filename = `drops/${user.id}/${Date.now()}.${ext}`

  try {
    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type,
      // `addRandomSuffix: false` car notre path est déjà unique (timestamp)
      addRandomSuffix: false,
    })
    return Response.json({ url: blob.url })
  } catch (err) {
    console.error('[upload-image] Vercel Blob put() failed:', err)
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}

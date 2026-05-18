import type { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { transcribeAudio } from '@/lib/ai/whisper'
import { parseClientIp } from '@/lib/privacy/visitor'
import { getTranscribeRateLimit } from '@/lib/ratelimit'

export const runtime = 'nodejs'
// Whisper p95 ~3s pour 60s d'audio. 30s couvre les cas dégradés (cold start).
export const maxDuration = 30

// 4 MB : sous la limite body Vercel Hobby (4.5 MB). À 60s de webm/opus mono à
// ~24 kbps on est largement en-dessous (~180 KB). La marge couvre les MIME où
// le browser pousse vers du mp4/aac plus lourd.
const MAX_AUDIO_SIZE = 4 * 1024 * 1024

// Whitelist explicite : ce que MediaRecorder peut produire côté Chrome desktop.
// Whisper accepte la liste OpenAI standard (mp3, mp4, mpeg, mpga, m4a, wav, webm)
// — on intersecte avec ce que MediaRecorder peut générer.
const ALLOWED_MIME = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
])

export async function POST(req: NextRequest) {
  // 0. Auth obligatoire — la transcription consomme un quota OpenAI, jamais ouvert
  // à des anonymes (et la route /new est de toute façon derrière auth).
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Rate limit per-IP (cf. todo : convertir en per-user en même temps que /api/generate).
  const ip = parseClientIp(req.headers)
  const { success, limit, remaining, reset } = await getTranscribeRateLimit().limit(ip)
  if (!success) {
    const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    return Response.json(
      { error: 'Rate limit exceeded', limit, remaining, reset },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
        },
      }
    )
  }

  // 2. Parse multipart
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const audio = formData.get('audio')
  if (!(audio instanceof File)) {
    return Response.json({ error: 'Missing audio file' }, { status: 400 })
  }
  if (audio.size === 0) {
    return Response.json({ error: 'Empty audio' }, { status: 400 })
  }
  if (audio.size > MAX_AUDIO_SIZE) {
    return Response.json({ error: 'Audio too large (max 4 MB)' }, { status: 413 })
  }
  // Le MIME envoyé par MediaRecorder inclut souvent les codecs après `;`.
  // On normalise pour comparer la base avant le `;`.
  if (audio.type && !ALLOWED_MIME.has(audio.type) && !ALLOWED_MIME.has(audio.type.split(';')[0]!)) {
    return Response.json(
      { error: `Unsupported audio format: ${audio.type}` },
      { status: 415 }
    )
  }

  // 3. Whisper
  try {
    const text = await transcribeAudio(audio)
    return Response.json({ text })
  } catch (err) {
    // Log avec userId pour pouvoir diagnostiquer (quota OpenAI, audio corrompu, etc.)
    console.error(`[api/transcribe] failed for user=${user.id}`, err)
    return Response.json({ error: 'Transcription failed' }, { status: 500 })
  }
}

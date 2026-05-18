import { NextRequest } from 'next/server'
import { z } from 'zod'
import { InputKind } from '@prisma/client'
import { generateDrop } from '@/lib/ai/generate'
import { generateImage } from '@/lib/ai/image'
import { getCurrentUser } from '@/lib/auth-server'
import { createDrop } from '@/lib/db/drops'
import { getGenerateRateLimit } from '@/lib/ratelimit'
import { parseClientIp } from '@/lib/privacy/visitor'

export const runtime = 'nodejs'
export const maxDuration = 120 // 2 min — couvre Claude Opus dans le pire cas

const GenerateRequestSchema = z.object({
  rawInput: z.string().min(10).max(2000),
  // Photo uploadée optionnelle : si fournie, skip fal.ai et utilise cette URL.
  // Doit être une URL Vercel Blob (validation soft — on a déjà filtré côté /api/upload-image).
  imageUrl: z.string().url().optional(),
})

type GenerateRequest = z.infer<typeof GenerateRequestSchema>

// ─── SSE helper ────────────────────────────────────────────────────────────

const encoder = new TextEncoder()

function sseEvent(name: string, payload: unknown): Uint8Array {
  // Le double `\n\n` final est non négociable : c'est le séparateur d'events SSE.
  return encoder.encode(`event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`)
}

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 0. Auth — session requise depuis Better Auth (le middleware redirige déjà
  // les requêtes browser vers /signin, mais cette route accepte aussi des POST
  // hors browser : on protège côté serveur en plus, défense en profondeur.
  // cf. CVE-2025-29927 : le middleware Next seul est bypassable.
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Rate limit (per-IP pour l'instant — todo : convertir en per-user, cf. tasks/todo.md)
  const ip = parseClientIp(req.headers)
  const { success, limit, remaining, reset } = await getGenerateRateLimit().limit(ip)
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

  // 2. Parse + validate body (avant ouverture du stream — erreurs en JSON classique)
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = GenerateRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const body: GenerateRequest = parsed.data

  // 3. Stream SSE — orchestration generateDrop → generateImage → createDrop
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (name: string, payload: unknown) => controller.enqueue(sseEvent(name, payload))

      // `currentStep` est suivi pour pouvoir tagger une erreur avec l'étape qui a échoué.
      // Une seule outer try/catch — chaque `await` externe est dedans, et le client
      // sait toujours OÙ ça s'est cassé pour afficher un message utile.
      let currentStep: 'analyzing' | 'imaging' | 'saving' = 'analyzing'

      try {
        // ── Étape 1 : génération du contenu via Anthropic
        currentStep = 'analyzing'
        send('status', { step: 'analyzing', label: 'Analyse du sujet et choix du template…' })
        const { content, modelUsed } = await generateDrop(body.rawInput)
        send('status', {
          step: 'content_ready',
          label: 'Contenu généré.',
          modelUsed,
        })

        // ── Étape 2 : image — si une URL uploadée est fournie, on skip fal.ai
        currentStep = 'imaging'
        let imageUrl: string
        if (body.imageUrl) {
          send('status', { step: 'imaging', label: 'Utilisation de ta photo…' })
          imageUrl = body.imageUrl
          send('status', { step: 'imaged', label: 'Photo prête.' })
        } else {
          send('status', { step: 'imaging', label: "Génération de l'image…" })
          imageUrl = await generateImage(content.image_prompt)
          send('status', { step: 'imaged', label: 'Image prête.' })
        }

        // ── Étape 3 : persistance + slug unique (P2002 retry interne)
        currentStep = 'saving'
        send('status', { step: 'saving', label: 'Publication du Drop…' })
        const drop = await createDrop({
          userId: user.id,
          rawInput: body.rawInput,
          inputKind: InputKind.TEXT,
          content,
          imageUrl,
          modelUsed,
        })

        send('done', { slug: drop.slug, url: `/d/${drop.slug}` })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[api/generate] failed at step="${currentStep}":`, err)
        send('error', { step: currentStep, message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Empêche certains proxies/CDN de tamponner les chunks SSE.
      'X-Accel-Buffering': 'no',
    },
  })
}

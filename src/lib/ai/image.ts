import { fal } from '@fal-ai/client'

// Config paresseuse — `fal.config()` au module scope serait évalué pendant
// `next build` (collecte des page data), à un moment où FAL_KEY peut ne pas
// être présent (env Dokploy injecté au runtime). On config à la 1ère utilisation.
let _configured = false
function ensureFalConfigured(): void {
  if (_configured) return
  const credentials = process.env.FAL_KEY
  if (!credentials) {
    throw new Error('[fal] FAL_KEY is not set')
  }
  fal.config({ credentials })
  _configured = true
}

const IMAGE_SUFFIX =
  ', editorial photography, natural lighting, 35mm film aesthetic, shallow depth of field, no text, no watermark, no logos, no people faces visible'

interface FluxImageOutput {
  images: Array<{ url: string }>
}

export async function generateImage(prompt: string): Promise<string> {
  ensureFalConfigured()
  // @fal-ai/client 1.x : retour wrappé en `Result<Output>` (data + requestId).
  // L'ancien client (@fal-ai/serverless-client) retournait `Output` directement.
  const { data } = (await fal.run('fal-ai/flux/schnell', {
    input: {
      prompt: `${prompt}${IMAGE_SUFFIX}`,
      image_size: 'landscape_16_9',
      num_inference_steps: 4, // schnell : 2-3s
      enable_safety_checker: true,
    },
  })) as { data: FluxImageOutput; requestId: string }

  const first = data.images[0]
  if (!first?.url) throw new Error('fal.ai returned no image')
  return first.url
}

// Script one-off : génère les 3 images hero pour les drops démo via fal.ai
// (Flux Schnell, ~2-3s par image). Output : 3 URLs fal.media stables qu'on
// hardcode ensuite dans prisma/seed.ts → re-seed prod pour mettre à jour
// imageUrl sur les 3 drops démo existants.
//
// Lancement local : `corepack pnpm exec dotenv -e .env.local -- tsx scripts/seed-images.ts`

import { fal } from '@fal-ai/client'

fal.config({ credentials: process.env.FAL_KEY })

const PROMPTS: Array<{ name: string; prompt: string }> = [
  {
    name: 'plombier',
    prompt:
      'A close-up documentary photo of an old residential boiler in a French basement, warm winter morning light, shallow depth of field, neutral palette, no people',
  },
  {
    name: 'coach',
    prompt:
      'A minimalist documentary photo of an empty office desk in soft morning window light, single notebook and pen, muted indigo tones, shallow depth of field',
  },
  {
    name: 'resto',
    prompt:
      'A documentary photo of a French bistro plate, fresh produce arranged simply on linen tablecloth, warm afternoon light from the side, shallow depth of field',
  },
]

const IMAGE_SUFFIX =
  ', editorial photography, natural lighting, 35mm film aesthetic, shallow depth of field, no text, no watermark, no logos, no people faces visible'

interface FluxImageOutput {
  images: Array<{ url: string }>
}

async function run() {
  console.log(`Génération de ${PROMPTS.length} images via fal.ai Flux Schnell…\n`)
  const results: Array<{ name: string; url: string }> = []
  for (const { name, prompt } of PROMPTS) {
    process.stdout.write(`  → ${name}…`)
    const { data } = (await fal.run('fal-ai/flux/schnell', {
      input: {
        prompt: `${prompt}${IMAGE_SUFFIX}`,
        image_size: 'landscape_16_9',
        num_inference_steps: 4,
        enable_safety_checker: true,
      },
    })) as { data: FluxImageOutput; requestId: string }
    const url = data.images[0]?.url
    if (!url) throw new Error(`fal.ai returned no image for ${name}`)
    results.push({ name, url })
    console.log(' OK')
  }
  console.log('\n────────── URLs à copier dans prisma/seed.ts ──────────')
  for (const { name, url } of results) {
    console.log(`${name}: '${url}',`)
  }
  console.log('───────────────────────────────────────────────────────\n')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})

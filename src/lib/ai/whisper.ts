import { fal } from '@fal-ai/client'

// Transcription via fal.ai (Whisper). On réutilise FAL_KEY déjà en prod pour
// les images Flux — pas de nouveau secret à provisionner. Migration depuis
// OpenAI Whisper-1 (compte OpenAI banni en pleine évaluation jury 2026-05-30) :
// l'API fal.ai n'est PAS compatible OpenAI SDK, donc on passe par
// `fal.storage.upload(file) -> URL` puis `fal.run('fal-ai/whisper', ...)`.

// Config paresseuse — symétrique à src/lib/ai/image.ts. Évite que
// `fal.config()` parte au module scope pendant `next build` quand FAL_KEY
// n'est pas encore injecté côté Dokploy.
let _configured = false
function ensureFalConfigured(): void {
  if (_configured) return
  const credentials = process.env.FAL_KEY
  if (!credentials) {
    throw new Error('[whisper] FAL_KEY is not set')
  }
  fal.config({ credentials })
  _configured = true
}

interface WhisperOutput {
  text: string
}

/**
 * Transcrit un fichier audio en texte via fal-ai/whisper.
 *
 * Étapes :
 *  1. Upload du File vers fal.storage → URL temporaire
 *  2. Appel `fal.run('fal-ai/whisper', { audio_url, language: 'fr' })`
 *  3. Retour du `text` trimmé
 *
 * Le File arrive depuis FormData côté route — déjà filtré (MIME whitelist,
 * taille ≤ 4 MB) en amont dans /api/transcribe.
 */
export async function transcribeAudio(audio: File): Promise<string> {
  ensureFalConfigured()

  // Upload vers fal.storage. Retourne une URL signée que fal-ai/whisper peut
  // consommer directement, sans encoder l'audio en base64 inline.
  const audioUrl = await fal.storage.upload(audio)

  const { data } = (await fal.run('fal-ai/whisper', {
    input: {
      audio_url: audioUrl,
      task: 'transcribe',
      language: 'fr',
    },
  })) as { data: WhisperOutput; requestId: string }

  if (!data?.text) throw new Error('fal.ai/whisper returned empty text')
  return data.text.trim()
}

import OpenAI from 'openai'

// Lazy : `new OpenAI({apiKey: undefined})` throw — casse `next build` côté
// Dokploy où les env vars ne sont injectées qu'au runtime.
let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (_client) return _client
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('[whisper] OPENAI_API_KEY is not set')
  }
  _client = new OpenAI({ apiKey })
  return _client
}

/**
 * Transcrit un fichier audio en texte via Whisper.
 * Le File arrive depuis FormData côté route — pas besoin de conversion.
 */
export async function transcribeAudio(audio: File): Promise<string> {
  const result = await getClient().audio.transcriptions.create({
    file: audio,
    model: 'whisper-1',
    language: 'fr',
  })
  return result.text.trim()
}

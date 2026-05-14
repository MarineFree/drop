import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Transcrit un fichier audio en texte via Whisper.
 * Le File arrive depuis FormData côté route — pas besoin de conversion.
 */
export async function transcribeAudio(audio: File): Promise<string> {
  const result = await client.audio.transcriptions.create({
    file: audio,
    model: 'whisper-1',
    language: 'fr',
  })
  return result.text.trim()
}

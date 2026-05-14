import Anthropic from '@anthropic-ai/sdk'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { DropContentSchema, DropContentValidationError, type DropContent } from './schema'
import { SYSTEM_PROMPT } from './prompts'

const MAX_TOKENS = 2048

export type ModelTag = 'opus' | 'sonnet'

const MODEL_IDS: Record<ModelTag, string> = {
  opus: 'claude-opus-4-7',
  sonnet: 'claude-sonnet-4-6',
}

/**
 * Lit `DROP_GENERATION_MODEL` :
 *  - "opus" → claude-opus-4-7
 *  - sinon (vide / "sonnet" / autre) → claude-sonnet-4-6 (défaut)
 *
 * Sonnet en défaut : pour du JSON structuré contraint par Zod + system prompt clair,
 * Opus est probablement surpayé. À valider par A/B (cf. tasks/lessons.md).
 */
function getPrimaryModel(): ModelTag {
  const raw = process.env.DROP_GENERATION_MODEL?.trim().toLowerCase()
  if (raw === 'opus' || raw === MODEL_IDS.opus) return 'opus'
  return 'sonnet'
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// JSON Schema dérivé du Zod schema. Si Anthropic refuse à l'exécution, figer
// le résultat à la main (cf. Docs/01-ai-contract.md §4).
const dropContentJsonSchema = zodToJsonSchema(DropContentSchema, {
  target: 'openApi3',
  $refStrategy: 'none',
}) as Anthropic.Tool['input_schema']

const GENERATE_TOOL: Anthropic.Tool = {
  name: 'generate_drop',
  description:
    "Génère le contenu structuré complet d'un mini-site Drop à partir de l'input du patron.",
  input_schema: dropContentJsonSchema,
}

async function callAndValidate(userInput: string, model: ModelTag): Promise<DropContent> {
  const response = await client.messages.create({
    model: MODEL_IDS[model],
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    tools: [GENERATE_TOOL],
    tool_choice: { type: 'tool', name: 'generate_drop' },
    messages: [{ role: 'user', content: userInput }],
  })

  const toolUse = response.content.find(block => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error(`No tool_use block in Claude response (model=${model})`)
  }

  const parsed = DropContentSchema.safeParse(toolUse.input)
  if (!parsed.success) throw new DropContentValidationError(parsed.error)
  return parsed.data
}

export interface GenerateResult {
  content: DropContent
  /** Modèle effectivement utilisé. Permet de tracer en analytics quand le fallback se déclenche. */
  modelUsed: ModelTag
}

/**
 * Stratégie :
 *  1. Tente le modèle primaire (`DROP_GENERATION_MODEL`).
 *  2. S'il échoue ET qu'il n'est pas déjà Sonnet, fallback Sonnet (palier intermédiaire).
 *  3. Si Sonnet échoue aussi → throw l'erreur d'origine.
 *
 * Pas de troisième tentative. Pas de fallback Haiku — la dégradation qualité du contenu
 * serait silencieuse.
 */
export async function generateDrop(userInput: string): Promise<GenerateResult> {
  const primary = getPrimaryModel()
  try {
    const content = await callAndValidate(userInput, primary)
    return { content, modelUsed: primary }
  } catch (primaryErr) {
    if (primary === 'sonnet') throw primaryErr
    try {
      const content = await callAndValidate(userInput, 'sonnet')
      return { content, modelUsed: 'sonnet' }
    } catch {
      throw primaryErr
    }
  }
}

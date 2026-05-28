import Anthropic from '@anthropic-ai/sdk'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { DropContentSchema, DropContentValidationError, type DropContent } from './schema'
import { SYSTEM_PROMPT } from './prompts'

const MAX_TOKENS = 2048
const MAX_ATTEMPTS_PER_MODEL = 2 // 1 attempt + 1 retry max par modèle

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

// Lazy : `new Anthropic({apiKey: undefined})` throw au constructor — casse
// `next build` côté Dokploy (env injecté au runtime, pas au build).
let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('[ai/generate] ANTHROPIC_API_KEY is not set')
  }
  _client = new Anthropic({ apiKey })
  return _client
}

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

interface ZodFeedback {
  /** Chemins violés, ex. `["meta.tone", "hook.title"]`. */
  paths: string[]
  /** Détails concaténés "path: message | path: message" — informatif, pas un stack. */
  details: string
}

async function callAndValidate(
  userInput: string,
  model: ModelTag,
  zodFeedback?: ZodFeedback
): Promise<DropContent> {
  // Si on retry après un échec Zod, on injecte les paths violés dans le message user.
  // Pas de multi-turn (assistant turn synthétique) — un seul message user avec contexte.
  const userMessage = zodFeedback
    ? `${userInput}\n\n[SYSTÈME — TENTATIVE PRÉCÉDENTE INVALIDE]\nLe précédent appel à generate_drop a violé le schema sur : ${zodFeedback.paths.join(', ')}.\nDétails : ${zodFeedback.details}.\nRecommence en respectant strictement toutes les bornes min/max et max-length du schema. Sois particulièrement vigilant sur la concision des champs courts (titles, tone, labels).`
    : userInput

  const response = await getClient().messages.create({
    model: MODEL_IDS[model],
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    tools: [GENERATE_TOOL],
    tool_choice: { type: 'tool', name: 'generate_drop' },
    messages: [{ role: 'user', content: userMessage }],
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
 * Deux mécanismes ORTHOGONAUX :
 *
 *  1. **Zod-retry SAME model** : si le modèle produit un tool_use qui viole le schema,
 *     on retry UNE FOIS sur le même modèle avec les paths violés injectés dans le prompt.
 *     Adresse la variance qualité (un Sonnet qui rate ponctuellement la borne `meta.tone:80`).
 *
 *  2. **Fallback modèle** : si le modèle primaire échoue (API error OU 2 Zod fails),
 *     on bascule sur Sonnet (palier intermédiaire). Adresse les échecs API transitoires
 *     ET les modèles structurellement incapables de respecter le schema.
 *
 * Worst case en appels API : 2 modèles × 2 tentatives = 4 (primary=opus + sonnet).
 * Si primary est déjà sonnet → max 2 appels.
 *
 * Borne stricte. Pas de backoff exponentiel. Pas de 3e tentative.
 *
 * Throw : le dernier error encontré (Zod ou API). Les `console.warn` ci-dessous tracent
 * chaque attempt pour mesurer en prod la fréquence des retries.
 */
export async function generateDrop(userInput: string): Promise<GenerateResult> {
  const primary = getPrimaryModel()
  const models: ModelTag[] = primary === 'sonnet' ? ['sonnet'] : [primary, 'sonnet']

  let lastError: unknown

  for (const model of models) {
    let zodFeedback: ZodFeedback | undefined

    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const content = await callAndValidate(userInput, model, zodFeedback)
        return { content, modelUsed: model }
      } catch (err) {
        lastError = err

        if (err instanceof DropContentValidationError) {
          const paths = err.zodError.issues
            .map(i => i.path.join('.'))
            .filter(p => p !== '')
          console.warn(
            `[generateDrop] zod retry on ${model}, attempt ${attempt}, paths: [${paths.join(', ')}]`
          )
          if (attempt === MAX_ATTEMPTS_PER_MODEL) break // give up on this model → fallback
          zodFeedback = {
            paths,
            details: err.zodError.issues
              .map(i => `${i.path.join('.')}: ${i.message}`)
              .join(' | '),
          }
          continue // retry SAME model avec feedback
        }

        // API / network / unknown error : pas de retry sur ce modèle, on bascule.
        console.warn(
          `[generateDrop] api error on ${model}, attempt ${attempt}: ${err instanceof Error ? err.message : String(err)}`
        )
        break
      }
    }
  }

  if (lastError instanceof Error) throw lastError
  throw new Error('generateDrop failed without specific error')
}

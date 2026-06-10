/**
 * Sanity check pour la détection de refus dans src/lib/ai/generate.ts.
 *
 * Ce script ne lance PAS d'appel réel à Anthropic. Il extrait la logique de
 * détection (forme inline du `if` dans callAndValidate) et la teste sur 5 cas
 * synthétiques. Pas de runner test installé dans le projet, d'où ce script
 * standalone exécutable via `pnpm tsx scripts/test-refusal-detection.ts`.
 *
 * Cas attendus :
 *   1. Refus classique : stop_reason='end_turn' + bloc text                 → REFUSED
 *   2. tool_use présent (succès)                                            → OK
 *   3. Panne max_tokens (tronqué)                                           → API_ERROR
 *   4. Panne stop_reason='end_turn' mais SANS bloc text (rare)             → API_ERROR
 *   5. Panne stop_reason inconnu                                            → API_ERROR
 */

type Block =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; name: string; input: unknown }

interface MockResponse {
  content: Block[]
  stop_reason: string | null
}

type Verdict = 'REFUSED' | 'OK' | 'API_ERROR'

/**
 * Reproduit EXACTEMENT la logique de discrimination dans callAndValidate.
 * Si la logique source change, copier ici aussi (ou refactorer en helper partagé).
 */
function classifyResponse(response: MockResponse): Verdict {
  const toolUse = response.content.find(block => block.type === 'tool_use')
  if (toolUse && toolUse.type === 'tool_use') return 'OK'

  const textBlock = response.content.find(block => block.type === 'text')
  const stopReason = response.stop_reason ?? 'unknown'
  if (stopReason === 'end_turn' && textBlock && textBlock.type === 'text') {
    return 'REFUSED'
  }
  return 'API_ERROR'
}

const cases: Array<{ name: string; input: MockResponse; expected: Verdict }> = [
  {
    name: '1. Refus classique end_turn + text',
    input: {
      content: [{ type: 'text', text: 'I cannot help with that request.' }],
      stop_reason: 'end_turn',
    },
    expected: 'REFUSED',
  },
  {
    name: '2. Succès nominal : tool_use présent',
    input: {
      content: [{ type: 'tool_use', name: 'generate_drop', input: { foo: 'bar' } }],
      stop_reason: 'tool_use',
    },
    expected: 'OK',
  },
  {
    name: '3. Panne max_tokens (tronqué, pas de tool_use)',
    input: {
      content: [{ type: 'text', text: 'Looking at this input I think...' }],
      stop_reason: 'max_tokens',
    },
    expected: 'API_ERROR',
  },
  {
    name: '4. Edge case : end_turn mais aucun bloc text',
    input: {
      content: [],
      stop_reason: 'end_turn',
    },
    expected: 'API_ERROR',
  },
  {
    name: '5. Panne : stop_reason null/inconnu',
    input: {
      content: [],
      stop_reason: null,
    },
    expected: 'API_ERROR',
  },
]

let failed = 0
for (const c of cases) {
  const actual = classifyResponse(c.input)
  const ok = actual === c.expected
  console.log(`${ok ? '✓' : '✗'} ${c.name}  →  expected=${c.expected}, got=${actual}`)
  if (!ok) failed++
}

if (failed > 0) {
  console.error(`\n${failed} cas échoué(s).`)
  process.exit(1)
}
console.log(`\nTous les cas passent. (${cases.length}/${cases.length})`)

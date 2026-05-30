# 01 — Contrat IA & Prompts

Ce fichier définit comment Drop parle à Claude. **Le contrat de sortie est sacré** — toute l'app en dépend.

---

## 1. Choix d'implémentation : Tool Use, pas JSON mode

On utilise le **tool use** de l'API Anthropic, pas le mode "demande-lui du JSON dans le prompt". Raisons :

- Garantie de conformité au schema (Anthropic valide côté serveur)
- Pas besoin de parser/nettoyer la sortie
- Compatible avec le streaming (`input_json_delta` events)
- Retry automatique si le modèle dévie

Modèles : `claude-sonnet-4-6` par défaut, `claude-opus-4-7` opt-in via `DROP_GENERATION_MODEL=opus`. Pas de Haiku — fallback automatique Opus → Sonnet en cas d'échec API.

---

## 2. Le schema Zod (`src/lib/ai/schema.ts`)

```ts
import { z } from 'zod'

export const SectionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('text'),
    heading: z.string().min(3).max(80),
    body: z.string().min(20).max(400),
  }),
  z.object({
    kind: z.literal('stat'),
    value: z.string().min(1).max(20),   // "80%", "1 sur 3", "12 min"
    label: z.string().min(5).max(120),
  }),
  z.object({
    kind: z.literal('checklist'),
    items: z.array(z.string().min(3).max(120)).min(3).max(7),
  }),
  z.object({
    kind: z.literal('comparison'),
    before: z.string().min(10).max(200),
    after: z.string().min(10).max(200),
  }),
])

export const QuizSchema = z.object({
  kind: z.literal('quiz'),
  question: z.string(),
  options: z.array(z.object({
    label: z.string(),
    is_correct: z.boolean(),
    feedback: z.string(),
  })).min(2).max(4),
})

export const PollSchema = z.object({
  kind: z.literal('poll'),
  question: z.string(),
  options: z.array(z.string()).min(2).max(4),
})

export const InteractionSchema = z.discriminatedUnion('kind', [
  QuizSchema,
  PollSchema,
  z.object({ kind: z.literal('none') }),
])

export const DropContentSchema = z.object({
  template_type: z.enum(['how-to', 'manifesto', 'case-study', 'quiz', 'announcement']),
  hook: z.object({
    title: z.string().min(8).max(80),
    subtitle: z.string().min(15).max(180),
  }),
  image_prompt: z.string().min(20).max(500),
  sections: z.array(SectionSchema).min(2).max(4),
  interaction: InteractionSchema,
  cta: z.object({
    label: z.string().min(3).max(40),
    kind: z.enum(['contact', 'booking', 'devis', 'lead', 'newsletter']),
    placeholder: z.string().optional(),  // pour les champs lead capture
  }),
  meta: z.object({
    theme: z.enum(['cream', 'violet', 'dark']),
    tone: z.string().max(80),  // "factuel et chaleureux", "punchy", etc.
    estimated_read_time_sec: z.number().int().min(20).max(180),
  }),
})

export type DropContent = z.infer<typeof DropContentSchema>
```

**Pourquoi ces bornes** : forcer la concision. Sans `.max()`, Claude écrit des paragraphes de 600 mots qui cassent visuellement les templates. Avec les bornes, on est forcé à du contenu mobile-first.

---

## 3. Le prompt système (`src/lib/ai/prompts.ts`)

```ts
export const SYSTEM_PROMPT = `Tu es l'IA de Drop, un outil qui transforme une idée brute de patron de TPE/PME en mini-site web partageable.

Ton rôle : recevoir une phrase ou un vocal transcrit, et produire le contenu d'un mini-site complet qui sera affiché sur une page web unique.

CONTRAINTES NON-NÉGOCIABLES :

1. Tu écris pour un lecteur mobile qui scrolle 30 secondes. Phrases courtes, pas de jargon, zéro corporate-speak.
2. Tu choisis UN template_type adapté au sujet :
   - "how-to" : sujet pratique avec étapes ou checklist (ex: "comment éviter la panne de chaudière")
   - "manifesto" : prise de position, opinion forte (ex: "pourquoi je refuse certains clients")
   - "case-study" : histoire client transformée, structure problème → solution → résultat
   - "quiz" : auto-évaluation interactive (ex: "es-tu prêt à changer de job ?")
   - "announcement" : nouveauté, événement, info ponctuelle (ex: "le menu de cette semaine")
3. Le hook.title est UN titre qui claque, 8 mots max. Pas de point final. Pas de "Tout ce que vous devez savoir sur".
4. Chaque section apporte UNE info. Pas de remplissage. Si une section n'apporte rien, supprime-la.
5. Le CTA correspond au métier : un plombier a "devis", un coach a "booking", un restaurant a "booking", un consultant a "contact".
6. Le ton de meta.tone décrit en moins de 80 caractères comment le contenu sonne. Sera utilisé en signature visuelle.
7. image_prompt décrit en anglais une image photoréaliste, contextuelle au sujet, SANS texte intégré, SANS personnes identifiables. Style : "documentary photography, natural light, shallow depth of field".

INTERDITS :
- Aucune émoji dans hook.title ou hook.subtitle (cassent le rendu typographique).
- Aucune mention de "Drop", "IA", "généré par".
- Aucune promesse extravagante ("changez votre vie", "résultats garantis").
- Aucun lien hypertexte, aucun "cliquez ici".

PROCESS :
1. Lis l'input du patron.
2. Identifie le métier, le public cible implicite, l'angle émotionnel.
3. Choisis le template_type le plus adapté (pas par défaut, par pertinence).
4. Génère le contenu.
5. Appelle la fonction generate_drop avec ton output structuré.`
```

---

## 4. Le tool definition

```ts
import Anthropic from '@anthropic-ai/sdk'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { DropContentSchema } from './schema'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const GENERATE_TOOL: Anthropic.Tool = {
  name: 'generate_drop',
  description: 'Génère le contenu structuré complet d\'un mini-site Drop à partir de l\'input du patron.',
  input_schema: zodToJsonSchema(DropContentSchema, { target: 'openApi3' }) as Anthropic.Tool['input_schema'],
}
```

> Note : `zod-to-json-schema` peut produire des incompatibilités mineures avec le format attendu. Si Anthropic refuse, génère le JSON schema à la main une fois et fige-le. C'est ce que je recommande pour un hackathon — pas de magie au runtime.

---

## 5. L'appel principal (non-streaming)

Le pipeline réel choisit le modèle primaire via `DROP_GENERATION_MODEL`, fait l'appel `messages.create`, extrait le bloc `tool_use`, puis valide Zod :

```ts
const MODEL_IDS = {
  opus: 'claude-opus-4-7',
  sonnet: 'claude-sonnet-4-6',
} as const

async function callAndValidate(userInput: string, model: 'opus' | 'sonnet'): Promise<DropContent> {
  const response = await client.messages.create({
    model: MODEL_IDS[model],
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [GENERATE_TOOL],
    tool_choice: { type: 'tool', name: 'generate_drop' },
    messages: [{ role: 'user', content: userInput }],
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error(`No tool_use block (model=${model})`)
  }

  const parsed = DropContentSchema.safeParse(toolUse.input)
  if (!parsed.success) throw new DropContentValidationError(parsed.error)
  return parsed.data
}
```

L'API publique exposée par `src/lib/ai/generate.ts` est `generateDrop(userInput): Promise<{ content, modelUsed }>` — le `modelUsed` est persisté en DB pour mesurer la fréquence du fallback en analytics.

---

## 6. Retry & fallback (deux mécanismes orthogonaux)

Implémentés dans `generateDrop` (cf. `src/lib/ai/generate.ts`) :

1. **Zod-retry SAME model** — si le tool_use viole le schema, retry **une fois** sur le **même** modèle avec les `paths` violés injectés dans le message user. Adresse la variance qualité (Sonnet qui rate ponctuellement `meta.tone:80`).
2. **Fallback modèle** — si le modèle primaire échoue (erreur API OU 2 Zod fails), bascule sur **Sonnet** (palier intermédiaire). Adresse les échecs API transitoires et les modèles structurellement incapables de respecter le schema.

Worst case en appels API : 2 modèles × 2 tentatives = 4 (primary = `opus` + fallback `sonnet`). Si primary est déjà `sonnet` → max 2 appels. Pas de backoff exponentiel, pas de 3e tentative.

---

## 7. Prompt pour l'image (`src/lib/ai/image.ts`)

Le `image_prompt` retourné par Claude est déjà bon. On lui ajoute juste un suffixe technique pour fal.ai :

```ts
const IMAGE_SUFFIX = ', editorial photography, natural lighting, 35mm film aesthetic, shallow depth of field, no text, no watermark, no logos, no people faces visible'

export async function generateImage(prompt: string): Promise<string> {
  const result = await fal.run('fal-ai/flux/schnell', {
    input: {
      prompt: `${prompt}${IMAGE_SUFFIX}`,
      image_size: 'landscape_16_9',
      num_inference_steps: 4,  // schnell = rapide, 2-3s
      enable_safety_checker: true,
    },
  })
  return result.images[0].url
}
```

---

## 8. Tests à passer avant la démo

Crée `tests/prompts.test.ts` avec ces 5 inputs. Chacun doit retourner un `DropContent` valide ET un template_type cohérent.

| Input | Template attendu |
|---|---|
| "Pourquoi 80% des chaudières lâchent en novembre" | `how-to` |
| "Je refuse parfois des clients et voilà pourquoi" | `manifesto` |
| "Comment j'ai débloqué le SAV d'un client en 2h" | `case-study` |
| "Es-tu prêt à changer de boîte ? Les vraies questions à te poser" | `quiz` |
| "Nouveau menu cette semaine inspiré de la Sicile" | `announcement` |

Si l'un de ces inputs ne donne pas le template attendu, le prompt système est à ajuster — pas le schema.

---

## 9. Coûts estimés

- Claude Opus 4.7 : ~$0.015 par drop (input ~500 tokens + output ~1500 tokens)
- Flux Schnell : ~$0.003 par image
- Whisper (si vocal) : ~$0.006 par minute

**Total : ~$0.02 par drop.** Soutenable. Pas besoin de cache LLM pour le hackathon.

import { z } from 'zod'

// ────────────────────────────────────────────────
// Sections (discriminated union)
// ────────────────────────────────────────────────
export const SectionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('text'),
    heading: z.string().min(3).max(80),
    body: z.string().min(20).max(400),
  }),
  z.object({
    kind: z.literal('stat'),
    value: z.string().min(1).max(20), // "80%", "1 sur 3", "12 min"
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

export type Section = z.infer<typeof SectionSchema>

// ────────────────────────────────────────────────
// Interactions
// ────────────────────────────────────────────────
export const QuizSchema = z.object({
  kind: z.literal('quiz'),
  question: z.string().min(5).max(200),
  options: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        is_correct: z.boolean(),
        feedback: z.string().min(5).max(200),
      })
    )
    .min(2)
    .max(4),
})

export const PollSchema = z.object({
  kind: z.literal('poll'),
  question: z.string().min(5).max(200),
  options: z.array(z.string().min(1).max(120)).min(2).max(4),
})

export const InteractionSchema = z.discriminatedUnion('kind', [
  QuizSchema,
  PollSchema,
  z.object({ kind: z.literal('none') }),
])

export type Interaction = z.infer<typeof InteractionSchema>

// ────────────────────────────────────────────────
// DropContent — le contrat de sortie de Claude
// ────────────────────────────────────────────────
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
    placeholder: z.string().max(80).optional(),
  }),
  meta: z.object({
    theme: z.enum(['cream', 'violet', 'dark']),
    tone: z.string().max(80),
    estimated_read_time_sec: z.number().int().min(20).max(180),
  }),
})

export type DropContent = z.infer<typeof DropContentSchema>
export type TemplateType = DropContent['template_type']

// ────────────────────────────────────────────────
// Helpers de mapping vers l'enum Prisma
// ────────────────────────────────────────────────
const TEMPLATE_TYPE_MAP = {
  'how-to': 'HOW_TO',
  'manifesto': 'MANIFESTO',
  'case-study': 'CASE_STUDY',
  'quiz': 'QUIZ',
  'announcement': 'ANNOUNCEMENT',
} as const

export function toPrismaTemplateType(value: TemplateType): (typeof TEMPLATE_TYPE_MAP)[TemplateType] {
  return TEMPLATE_TYPE_MAP[value]
}

export class DropContentValidationError extends Error {
  constructor(public readonly zodError: z.ZodError) {
    super(`DropContent validation failed: ${zodError.message}`)
    this.name = 'DropContentValidationError'
  }
}

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { TRADE_VALUES } from '@/lib/trades'

// Zod enum exige un tuple `[A, ...rest]` plutôt qu'un array — cast nécessaire.
const tradeEnum = z.enum(TRADE_VALUES as unknown as [string, ...string[]])

const BodySchema = z.object({
  business: z.string().trim().min(2).max(100),
  trade: tradeEnum,
})

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { business: parsed.data.business, trade: parsed.data.trade },
  })

  return Response.json({ ok: true })
}

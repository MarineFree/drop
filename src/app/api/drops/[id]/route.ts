import { NextRequest } from 'next/server'

interface Ctx {
  params: Promise<{ id: string }>
}

// TODO :
// GET    → détail d'un drop (réservé propriétaire)
// DELETE → soft-delete (isActive = false)
export async function GET(_req: NextRequest, _ctx: Ctx) {
  return new Response('Not implemented yet', { status: 501 })
}

export async function DELETE(_req: NextRequest, _ctx: Ctx) {
  return new Response('Not implemented yet', { status: 501 })
}

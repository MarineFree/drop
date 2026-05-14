import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

// TODO Docs/03-generation-pipeline.md §8
// - vérifier Bearer ${CRON_SECRET}
// - prisma.drop.updateMany WHERE expiresAt < NOW() AND isActive → false
// - retour { expired: count }
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  return new Response('Not implemented yet', { status: 501 })
}

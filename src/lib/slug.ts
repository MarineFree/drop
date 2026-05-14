import { SlugKind } from '@prisma/client'
import { prisma } from './db'

interface SlugPools {
  adjectives: string[]
  nouns: string[]
  colors: string[]
}

// Cache module-level : un seul chargement par instance Node.
// Conscience de la limite : si on update `slug_words` à chaud, il faut redéployer
// pour invalider. Acceptable — les pools sont une liste statique en pratique.
let cachedPools: SlugPools | null = null

async function loadPools(): Promise<SlugPools> {
  const all = await prisma.slugWord.findMany({ select: { word: true, kind: true } })
  const pools: SlugPools = { adjectives: [], nouns: [], colors: [] }
  for (const { word, kind } of all) {
    if (kind === SlugKind.ADJECTIVE) pools.adjectives.push(word)
    else if (kind === SlugKind.NOUN) pools.nouns.push(word)
    else if (kind === SlugKind.COLOR) pools.colors.push(word)
  }
  if (!pools.adjectives.length || !pools.nouns.length || !pools.colors.length) {
    throw new Error('slug_words pools incomplets — lance `pnpm db:seed`')
  }
  return pools
}

async function ensurePools(): Promise<SlugPools> {
  if (!cachedPools) cachedPools = await loadPools()
  return cachedPools
}

const pick = <T>(arr: readonly T[]): T => {
  const item = arr[Math.floor(Math.random() * arr.length)]
  if (item === undefined) throw new Error('Pool unexpectedly empty')
  return item
}

/**
 * Retourne un slug candidat (`adjectif-nom-couleur`) sans garantie d'unicité.
 * La garantie d'unicité est faite à l'insertion DB via try/catch P2002 (cf. `createDrop`).
 *
 * Coût : 0 requête DB après le premier appel.
 */
export async function generateSlugCandidate(): Promise<string> {
  const pools = await ensurePools()
  return `${pick(pools.adjectives)}-${pick(pools.nouns)}-${pick(pools.colors)}`
}

/** Force le rechargement du cache (utile pour les tests). */
export function _resetSlugPoolsCache(): void {
  cachedPools = null
}

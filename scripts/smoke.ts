import { EventKind } from '@prisma/client'
import { prisma } from '../src/lib/db'
import { generateSlugCandidate } from '../src/lib/slug'
import {
  createDrop,
  expireOldDrops,
  getActiveDropBySlug,
  trackEvent,
} from '../src/lib/db/drops'
import type { DropContent } from '../src/lib/ai/schema'

async function main() {
  console.log('=== Drop : smoke test ===\n')

  // 1. DB connectivity + comptage
  const slugCount = await prisma.slugWord.count()
  const byKind = await prisma.slugWord.groupBy({
    by: ['kind'],
    _count: { _all: true },
    orderBy: { kind: 'asc' },
  })
  const userCount = await prisma.user.count()
  const dropCount = await prisma.drop.count()

  console.log('1. Comptage DB')
  console.log(`   SlugWord  total : ${slugCount}`)
  for (const row of byKind) {
    console.log(`             - ${row.kind.padEnd(10)} : ${row._count._all}`)
  }
  console.log(`   User      total : ${userCount}`)
  console.log(`   Drop      total : ${dropCount}\n`)

  // 2. Génération de slugs (utilise le cache module-level)
  console.log('2. generateSlugCandidate() × 5')
  for (let i = 0; i < 5; i++) {
    console.log('   - ' + (await generateSlugCandidate()))
  }
  console.log()

  // 3. Assertions sur le seed
  console.log('3. Assertions seed')
  const expectedKind = { ADJECTIVE: 150, NOUN: 150, COLOR: 40 }
  const got = Object.fromEntries(byKind.map(r => [r.kind, r._count._all]))
  let failures = 0
  for (const [k, v] of Object.entries(expectedKind)) {
    const actual = got[k] ?? 0
    const ok = actual === v
    console.log(`   ${ok ? '✓' : '✗'} ${k.padEnd(10)} : ${actual} (attendu ${v})`)
    if (!ok) failures++
  }
  const totalOk = slugCount === 340
  console.log(`   ${totalOk ? '✓' : '✗'} total      : ${slugCount} (attendu 340)`)
  if (!totalOk) failures++

  const usersOk = userCount === 3
  console.log(`   ${usersOk ? '✓' : '✗'} users      : ${userCount} (attendu 3)\n`)
  if (!usersOk) failures++

  // 4. Helpers DB end-to-end (createDrop / getActiveDropBySlug / trackEvent / expireOldDrops)
  console.log('4. Helpers DB end-to-end')
  const user = await prisma.user.findFirstOrThrow({ where: { email: 'plombier@demo.fr' } })

  // DropContent minimal qui passe DropContentSchema (toutes les bornes respectées).
  const fakeContent: DropContent = {
    template_type: 'how-to',
    hook: {
      title: 'Smoke test drop title',
      subtitle: 'Smoke test subtitle — sufficient length for the min(15) bound',
    },
    image_prompt:
      'editorial documentary photograph of an empty workshop, natural light, smoke test sample',
    sections: [
      {
        kind: 'text',
        heading: 'Section A',
        body: 'Body of section A — long enough to satisfy the min(20) length bound on text body.',
      },
      {
        kind: 'checklist',
        items: ['Item un de la checklist', 'Item deux de la checklist', 'Item trois de la checklist'],
      },
    ],
    interaction: { kind: 'none' },
    cta: { label: 'Contact', kind: 'contact' },
    meta: { theme: 'cream', tone: 'sobre et tactile', estimated_read_time_sec: 60 },
  }

  let testDropId: string | null = null
  try {
    // createDrop
    const drop = await createDrop({
      userId: user.id,
      rawInput: '[smoke test]',
      inputKind: 'TEXT',
      content: fakeContent,
      imageUrl: null,
      modelUsed: 'sonnet',
    })
    testDropId = drop.id
    console.log(`   ✓ createDrop          → slug=${drop.slug}`)

    // getActiveDropBySlug : drop frais doit être trouvé
    const fetched = await getActiveDropBySlug(drop.slug)
    if (!fetched || fetched.id !== drop.id) {
      throw new Error(`getActiveDropBySlug n'a pas retourné le drop attendu (got=${fetched?.id})`)
    }
    console.log(`   ✓ getActiveDropBySlug → drop actif retrouvé`)

    // trackEvent VIEW : crée l'event ET incrémente viewCount (transaction)
    await trackEvent({
      dropId: drop.id,
      kind: EventKind.VIEW,
      visitorHash: 'smoke-test-visitor-hash',
    })
    const afterView = await prisma.drop.findUniqueOrThrow({
      where: { id: drop.id },
      select: { viewCount: true, ctaCount: true },
    })
    if (afterView.viewCount !== 1) {
      throw new Error(`viewCount attendu 1, trouvé ${afterView.viewCount}`)
    }
    if (afterView.ctaCount !== 0) {
      throw new Error(`ctaCount attendu 0 (pas impacté par VIEW), trouvé ${afterView.ctaCount}`)
    }
    const viewEvents = await prisma.dropEvent.count({
      where: { dropId: drop.id, kind: EventKind.VIEW },
    })
    if (viewEvents !== 1) {
      throw new Error(`DropEvent VIEW count attendu 1, trouvé ${viewEvents}`)
    }
    console.log(`   ✓ trackEvent VIEW     → viewCount=1, DropEvent créé (transaction)`)

    // trackEvent SCROLL_50 : crée l'event seulement (pas de compteur)
    await trackEvent({
      dropId: drop.id,
      kind: EventKind.SCROLL_50,
      visitorHash: 'smoke-test-visitor-hash',
    })
    const afterScroll = await prisma.drop.findUniqueOrThrow({
      where: { id: drop.id },
      select: { viewCount: true, ctaCount: true },
    })
    if (afterScroll.viewCount !== 1 || afterScroll.ctaCount !== 0) {
      throw new Error(
        `SCROLL_50 ne doit pas toucher les compteurs (view=${afterScroll.viewCount}, cta=${afterScroll.ctaCount})`
      )
    }
    console.log(`   ✓ trackEvent SCROLL_50 → DropEvent créé, compteurs intacts`)

    // expireOldDrops : on force expiresAt au passé puis on vérifie le soft-delete
    await prisma.drop.update({
      where: { id: drop.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })
    const expiredCount = await expireOldDrops()
    if (expiredCount < 1) {
      throw new Error(`expireOldDrops devait affecter ≥ 1 drop, retour=${expiredCount}`)
    }
    const afterExpire = await prisma.drop.findUniqueOrThrow({
      where: { id: drop.id },
      select: { isActive: true },
    })
    if (afterExpire.isActive !== false) {
      throw new Error(`isActive attendu false après expireOldDrops, trouvé ${afterExpire.isActive}`)
    }
    console.log(
      `   ✓ expireOldDrops       → ${expiredCount} drop(s) soft-deleted, test drop isActive=false`
    )

    // getActiveDropBySlug : drop expiré doit retourner null (sémantique stricte)
    const fetchedAfterExpire = await getActiveDropBySlug(drop.slug)
    if (fetchedAfterExpire !== null) {
      throw new Error(`getActiveDropBySlug devait retourner null après expiration`)
    }
    console.log(`   ✓ getActiveDropBySlug → null après expiration (sémantique stricte OK)\n`)
  } catch (err) {
    failures++
    console.error('   ✗ helpers DB :', err instanceof Error ? err.message : err, '\n')
  } finally {
    if (testDropId !== null) {
      // Cascade supprime les DropEvents associés.
      await prisma.drop.delete({ where: { id: testDropId } })
      console.log(`   ⌫ cleanup : test drop + events supprimés\n`)
    }
  }

  console.log(failures === 0 ? '✅ Smoke test OK' : `❌ ${failures} échec(s)`)
  if (failures > 0) process.exit(1)
}

main()
  .catch(err => {
    console.error('Smoke test FAILED :', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

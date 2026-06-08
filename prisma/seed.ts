import { AiModel, InteractionType, PrismaClient, SlugKind, TemplateType } from '@prisma/client'

// Type minimal inline — duplique la forme de `DropContent` du Zod schema (cf.
// src/lib/ai/schema.ts) MAIS sans importer depuis `src/` qui n'est pas présent
// au runtime du conteneur Docker (Next standalone n'embarque que `.next/`).
// Le contenu hardcodé plus bas est typé au build, donc cette duplication ne
// crée pas de risque de drift silencieux : un Zod schema modifié casse aussi
// les templates publics qui consomment la même shape.
type DropContent = {
  template_type: 'how-to' | 'manifesto' | 'case-study' | 'quiz' | 'announcement'
  hook: { title: string; subtitle: string }
  image_prompt: string
  sections: Array<
    | { kind: 'text'; heading: string; body: string }
    | { kind: 'stat'; value: string; label: string }
    | { kind: 'checklist'; items: string[] }
    | { kind: 'comparison'; before: string; after: string }
  >
  interaction:
    | { kind: 'none' }
    | {
        kind: 'quiz'
        question: string
        options: Array<{ label: string; is_correct: boolean; feedback: string }>
      }
    | { kind: 'poll'; question: string; options: string[] }
  cta: {
    label: string
    kind: 'contact' | 'booking' | 'devis' | 'lead' | 'newsletter'
    placeholder?: string
  }
  meta: { theme: 'cream' | 'violet' | 'dark'; tone: string; estimated_read_time_sec: number }
}

const prisma = new PrismaClient()

// Pool de mots — à compléter (cible : ~150 / 150 / 40).
// Combinatoire actuelle déjà suffisante pour la démo (150 × 150 × 40 = 900 000).
const ADJECTIVES = [
  // Originaux (12)
  'lent', 'vif', 'calme', 'brut', 'clair', 'dense',
  'fin', 'frais', 'net', 'ample', 'sobre', 'vibrant',
  // Sensoriels ajoutés (138) — registre tactile/qualitatif, sans émotion
  'abrupt', 'acide', 'agile', 'agreste', 'aigu', 'alerte',
  'amer', 'ancien', 'aride', 'atypique', 'bas', 'bref',
  'brillant', 'brumeux', 'bruyant', 'charnu', 'chaud', 'cireux',
  'clos', 'compact', 'complexe', 'cossu', 'courant', 'courbe',
  'court', 'couvert', 'creux', 'discret', 'distant', 'distinct',
  'divers', 'doux', 'droit', 'dru', 'dur', 'duveteux',
  'enfoui', 'entier', 'exact', 'fade', 'ferme', 'fini',
  'fixe', 'flou', 'fluide', 'fragile', 'franc', 'froid',
  'gazeux', 'glacial', 'gracile', 'grand', 'gros', 'haut',
  'humide', 'inerte', 'infime', 'intact', 'jeune', 'large',
  'leste', 'limpide', 'liquide', 'lisse', 'lointain', 'long',
  'lourd', 'lumineux', 'maigre', 'majeur', 'massif', 'mat',
  'mature', 'mince', 'mineur', 'minime', 'mobile', 'moelleux',
  'moite', 'mou', 'moyen', 'muet', 'multiple', 'naissant',
  'neuf', 'nouveau', 'opaque', 'ouvert', 'ovale', 'paisible',
  'patent', 'petit', 'piquant', 'plat', 'plein', 'pointu',
  'poli', 'poreux', 'preste', 'proche', 'prompt', 'propre',
  'pulpeux', 'raide', 'rapide', 'rare', 'replet', 'robuste',
  'rond', 'rude', 'rugueux', 'rustique', 'salin', 'sec',
  'serein', 'simple', 'solide', 'sombre', 'sonore', 'soutenu',
  'soyeux', 'souple', 'stable', 'svelte', 'tardif', 'tendre',
  'terne', 'trapu', 'typique', 'unique', 'usuel', 'vague',
  'vaste', 'velu', 'vide', 'vieux', 'visible', 'voisin',
]

const NOUNS = [
  // Originaux (12)
  'papillon', 'phare', 'atelier', 'sentier', 'horizon', 'rivage',
  'colline', 'silex', 'glycine', 'ardoise', 'onyx', 'lagon',
  // Ajoutés (138) — nature, paysage, minéral, artisanat, botanique
  'abeille', 'abri', 'agate', 'aigle', 'alouette', 'ambre',
  'arche', 'argile', 'atoll', 'aube', 'aurore', 'automne',
  'baie', 'baleine', 'bambou', 'basalte', 'belette', 'biche',
  'bleuet', 'bobine', 'bouleau', 'bourdon', 'brise', 'brume',
  'buis', 'cabane', 'calcaire', 'canyon', 'cascade', 'castor',
  'cerf', 'chalet', 'chamois', 'chanvre', 'chapelle', 'chouette',
  'cigale', 'ciseau', 'citerne', 'coque', 'corail', 'corbeau',
  'coton', 'coteau', 'coucou', 'crabe', 'craie', 'crique',
  'cristal', 'cygne', 'dauphin', 'delta', 'donjon', 'dune',
  'enclume', 'estuaire', 'falaise', 'faucon', 'fleuve', 'forge',
  'foudre', 'fuseau', 'givre', 'granite', 'grenier', 'hermine',
  'hibou', 'hiver', 'houx', 'huppe', 'hutte', 'iris',
  'jade', 'jardin', 'jasmin', 'lac', 'laine', 'lavande',
  'lierre', 'lotus', 'loutre', 'lynx', 'mante', 'marbre',
  'mare', 'merle', 'mica', 'midi', 'mimosa', 'moineau',
  'moule', 'moulin', 'mousse', 'nacre', 'neige', 'noyer',
  'opale', 'otarie', 'pavillon', 'pavot', 'perle', 'peuplier',
  'phoque', 'pin', 'pinceau', 'pinson', 'pivoine', 'plage',
  'plaine', 'planche', 'platane', 'pont', 'portail', 'portique',
  'poutre', 'prairie', 'quartz', 'raphia', 'ravin', 'renard',
  'roseau', 'ruisseau', 'sapin', 'saule', 'schiste', 'soie',
  'soir', 'sommet', 'sorbier', 'tamis', 'temple', 'tilleul',
  'toile', 'topaze', 'torrent', 'tulipe', 'vallon', 'vigne',
]

const COLORS = [
  // Originaux (9) — `ardoise` retiré : conflit unicité avec NOUNS (word @unique global)
  'ocre', 'indigo', 'mauve', 'ivoire', 'prune',
  'sienne', 'olive', 'rouille', 'encre',
  // Pigments ajoutés (31) — palette mate / naturelle / historique
  'abricot', 'amande', 'azur', 'bistre', 'bronze',
  'brique', 'caramel', 'carmin', 'cerise', 'cobalt',
  'cuivre', 'fauve', 'garance', 'jais', 'lilas',
  'menthe', 'miel', 'minuit', 'moutarde', 'noisette',
  'paille', 'parme', 'pistache', 'plomb', 'pourpre',
  'rose', 'roux', 'saumon', 'souris', 'tabac',
  'taupe',
]

async function seedSlugWords() {
  const entries: Array<{ word: string; kind: SlugKind }> = [
    ...ADJECTIVES.map(word => ({ word, kind: SlugKind.ADJECTIVE })),
    ...NOUNS.map(word => ({ word, kind: SlugKind.NOUN })),
    ...COLORS.map(word => ({ word, kind: SlugKind.COLOR })),
  ]
  for (const entry of entries) {
    await prisma.slugWord.upsert({
      where: { word: entry.word },
      update: {},
      create: entry,
    })
  }
  console.log(`✓ slug_words : ${entries.length} mots`)
}

interface DemoUserSeed {
  email: string
  name: string
  business: string
  trade: string
  ctaUrl: string
}

const DEMO_USERS = {
  plombier: {
    email: 'plombier@demo.fr',
    name: 'Marc Dubois',
    business: 'Plomberie Lyon Centre',
    trade: 'plombier',
    ctaUrl: 'https://plomberie-lyon-centre.fr/devis',
  },
  coach: {
    email: 'coach@demo.fr',
    name: 'Aïcha Martin',
    business: 'Cap Transition',
    trade: 'coach',
    ctaUrl: 'https://cap-transition.fr/rdv',
  },
  resto: {
    email: 'resto@demo.fr',
    name: 'Théo Lehmann',
    business: "Table d'Adèle",
    trade: 'restaurateur',
    ctaUrl: 'https://tabledadele.fr/reserver',
  },
} satisfies Record<string, DemoUserSeed>

type DemoUserKey = keyof typeof DEMO_USERS

async function seedDemoUsers(): Promise<Record<DemoUserKey, string>> {
  const seeded: Partial<Record<DemoUserKey, string>> = {}
  for (const [key, u] of Object.entries(DEMO_USERS) as [DemoUserKey, DemoUserSeed][]) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        // Re-aligne les meta sur le seed source si elles ont été modifiées
        // par mégarde via /onboarding pendant des tests précédents.
        business: u.business,
        trade: u.trade,
        ctaUrl: u.ctaUrl,
      },
      create: {
        email: u.email,
        name: u.name,
        business: u.business,
        trade: u.trade,
        ctaUrl: u.ctaUrl,
      },
    })
    seeded[key] = user.id
  }
  console.log('✓ users démo :', seeded)
  // Cast safe : on a itéré sur TOUTES les keys de DEMO_USERS et écrit l'id à
  // chaque tour → l'objet est complet, même si TS ne le voit pas (Partial).
  return seeded as Record<DemoUserKey, string>
}

// ────────────────────────────────────────────────
// 3 drops démo — contenu hardcodé conforme DropContentSchema
// ────────────────────────────────────────────────

// Slugs FIXES (pas tirés du pool) — réservés à la démo. Évite la collision avec
// les slugs combinatoires (qui font 3 mots, pas 4) ET évite que les seeds
// changent à chaque re-run de la seed.
const SEED_SLUGS = {
  plombier: 'demo-plombier-chaudiere-novembre',
  coach: 'demo-coach-changement-boite',
  resto: 'demo-resto-menu-semaine',
}

// Images hero pré-générées via fal.ai (cf. scripts/seed-images.ts qu'on a lancé
// une fois localement). Hardcodées pour rester reproductibles offline.
// Si tu veux régénérer (ex : nouveau prompt) : relance `scripts/seed-images.ts`
// avec un FAL_KEY valide, copie les nouvelles URLs ici, re-seed.
const SEED_IMAGES: Record<'plombier' | 'coach' | 'resto', string> = {
  plombier: 'https://v3b.fal.media/files/b/0a9c4cce/JtUxNIfz22GsLzc4I8yPo.jpg',
  coach: 'https://v3b.fal.media/files/b/0a9c4cce/qaWa8q1SkHUzS6LYcZlei.jpg',
  resto: 'https://v3b.fal.media/files/b/0a9c4cce/ZNa8PHDtvSbVW-Xb7G1ZE.jpg',
}

const PLOMBIER_CONTENT: DropContent = {
  template_type: 'how-to',
  hook: {
    title: "Pourquoi 80% des chaudières lâchent en novembre",
    subtitle:
      "Trois vérifications simples à faire avant les premiers froids — vous évitez 90% des dépannages d'urgence.",
  },
  image_prompt:
    'A close-up documentary photo of an old residential boiler in a French basement, warm winter morning light, shallow depth of field, neutral palette, no people',
  sections: [
    {
      kind: 'text',
      heading: 'Le piège saisonnier',
      body:
        "Chaque automne, la chaudière redémarre après cinq mois d'arrêt. C'est là que les pannes apparaissent : circulateur grippé, sonde encrassée, pression chutée. La quasi-totalité de ces pannes étaient évitables avec quinze minutes de vérification fin octobre.",
    },
    {
      kind: 'stat',
      value: '80%',
      label: "des dépannages chaudière en novembre étaient évitables avant l'hiver",
    },
    {
      kind: 'checklist',
      items: [
        "Vidange et rinçage du circuit si pas fait depuis 18 mois",
        'Pression du circuit entre 1 et 1,5 bar (jamais au-delà)',
        "Sortie de cheminée propre, sans nid d'oiseau ni feuilles",
        "Test du circulateur : il doit démarrer sans bruit anormal",
      ],
    },
  ],
  interaction: { kind: 'none' },
  cta: { label: 'Demander un devis', kind: 'devis' },
  meta: { theme: 'cream', tone: 'sobre direct', estimated_read_time_sec: 45 },
}

const COACH_CONTENT: DropContent = {
  template_type: 'quiz',
  hook: {
    title: 'Tu changes de boîte ?',
    subtitle:
      "Trois questions courtes pour situer où tu en es vraiment. Sans jugement, juste pour clarifier.",
  },
  image_prompt:
    'A minimalist documentary photo of an empty office desk in soft morning window light, single notebook and pen, muted indigo tones, shallow depth of field',
  sections: [
    {
      kind: 'text',
      heading: 'Avant de décider',
      body:
        "Changer de boîte n'est ni courageux ni lâche. C'est une décision pratique. Avant de la prendre, il faut nommer ce qui pousse vraiment : un job qui s'est vidé, une équipe qui dérape, un projet qui appelle ailleurs. Le quiz ci-dessous t'aide à mettre des mots.",
    },
    {
      kind: 'comparison',
      before: "Je sais que ça ne va plus, mais je ne sais pas si c'est le moment.",
      after:
        "Je sais ce qui me retient (peur, confort, loyauté) et ce qui m'appelle (sens, équipe, rythme).",
    },
  ],
  interaction: {
    kind: 'poll',
    question: 'Où en es-tu, vraiment ?',
    options: [
      'Je signe demain, ma décision est prise',
      "J'ai commencé à chercher, mais je doute encore",
      "Je n'y pense pas activement, juste vaguement",
      'Pas sûr·e — je veux justement clarifier',
    ],
  },
  cta: { label: 'Prendre un RDV', kind: 'booking' },
  meta: { theme: 'violet', tone: 'sobre chaleureux', estimated_read_time_sec: 60 },
}

const RESTO_CONTENT: DropContent = {
  template_type: 'announcement',
  hook: {
    title: 'Le menu de cette semaine',
    subtitle:
      'Trois plats, produits du jour, à partager. Service de mercredi à samedi, midi et soir, sur réservation.',
  },
  image_prompt:
    'A documentary photo of a French bistro plate, fresh produce arranged simply on linen tablecloth, warm afternoon light from the side, shallow depth of field',
  sections: [
    {
      kind: 'text',
      heading: 'Entrée',
      body:
        'Tartare de bonite, citron noir, huile à la coriandre. Bonite pêchée jeudi à Concarneau, taillée minute. La saveur reste franche, presque iodée, tempérée par le citron.',
    },
    {
      kind: 'text',
      heading: 'Plat',
      body:
        "Lieu jaune juste saisi, fenouil grillé, beurre noisette au combava. Lieu jaune de ligne, ferme et nacré. Le fenouil apporte la longueur, le combava la fraîcheur de fin de bouche.",
    },
    {
      kind: 'text',
      heading: 'Dessert',
      body:
        "Tarte fine rhubarbe, crème crue de Normandie, sablé sarrasin. La rhubarbe est juste pochée, garde son fil acide. La crème crue, posée tiède, fait le reste.",
    },
  ],
  interaction: { kind: 'none' },
  cta: { label: 'Réserver une table', kind: 'booking' },
  meta: { theme: 'cream', tone: 'précis chaleureux', estimated_read_time_sec: 50 },
}

interface DropSeedSpec {
  userId: string
  slug: string
  rawInput: string
  content: DropContent
  templateType: TemplateType
  interactionType: InteractionType | null
  imageUrl: string
  /** URL cible du bouton CTA (sinon CtaButton ne rend rien — bug visible v2 templates) */
  ctaUrl: string
}

async function upsertSeedDrop(spec: DropSeedSpec): Promise<void> {
  // Pas de Zod validation ici : le type `DropContent` ci-dessus contraint déjà
  // la shape côté `tsc`, et les templates publics rejecteraient à l'affichage
  // une row mal formée. Validation Zod runtime gardée sur le pipeline IA réel
  // (cf. /api/generate), pas sur le seed hardcodé.
  const validated = spec.content
  const hasInteraction = validated.interaction.kind !== 'none'
  const sectionCount = validated.sections.length

  // 90 jours de validité — couvre la durée du hackathon + une marge confortable,
  // sans rendre les seeds "éternels". Re-runner le seed prolonge la TTL.
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000
  const expiresAt = new Date(Date.now() + NINETY_DAYS_MS)

  await prisma.drop.upsert({
    where: { slug: spec.slug },
    update: {
      // Re-aligne le contenu sur la source seed si on a édité ce fichier.
      content: validated as unknown as object,
      imageUrl: spec.imageUrl,
      templateType: spec.templateType,
      interactionType: spec.interactionType,
      hasInteraction,
      sectionCount,
      expiresAt,
      isActive: true,
      ctaUrl: spec.ctaUrl,
    },
    create: {
      slug: spec.slug,
      userId: spec.userId,
      rawInput: spec.rawInput,
      content: validated as unknown as object,
      imageUrl: spec.imageUrl,
      templateType: spec.templateType,
      hasAudio: false,
      hasInteraction,
      interactionType: spec.interactionType,
      sectionCount,
      modelUsed: AiModel.SONNET,
      expiresAt,
      isActive: true,
      ctaUrl: spec.ctaUrl,
    },
  })
}

async function seedDemoDrops(userIds: Record<DemoUserKey, string>): Promise<void> {
  const specs: DropSeedSpec[] = [
    {
      userId: userIds.plombier,
      slug: SEED_SLUGS.plombier,
      rawInput:
        "explique pourquoi 80% des chaudières tombent en panne en novembre et la routine de vérification d'octobre",
      content: PLOMBIER_CONTENT,
      templateType: TemplateType.HOW_TO,
      interactionType: null,
      imageUrl: SEED_IMAGES.plombier,
      ctaUrl: DEMO_USERS.plombier.ctaUrl,
    },
    {
      userId: userIds.coach,
      slug: SEED_SLUGS.coach,
      rawInput:
        "aide mes clients à clarifier s'ils sont prêts à changer de boîte, sans jugement, format auto-évaluation",
      content: COACH_CONTENT,
      templateType: TemplateType.QUIZ,
      interactionType: InteractionType.POLL,
      imageUrl: SEED_IMAGES.coach,
      ctaUrl: DEMO_USERS.coach.ctaUrl,
    },
    {
      userId: userIds.resto,
      slug: SEED_SLUGS.resto,
      rawInput:
        'menu de la semaine en trois plats : bonite, lieu jaune, tarte rhubarbe — réservations mercredi à samedi',
      content: RESTO_CONTENT,
      templateType: TemplateType.ANNOUNCEMENT,
      interactionType: null,
      imageUrl: SEED_IMAGES.resto,
      ctaUrl: DEMO_USERS.resto.ctaUrl,
    },
  ]

  for (const spec of specs) {
    await upsertSeedDrop(spec)
  }
  console.log(
    `✓ drops démo : ${specs.length} drops (slugs ${Object.values(SEED_SLUGS).join(', ')})`
  )
}

async function main() {
  await seedSlugWords()
  const users = await seedDemoUsers()
  await seedDemoDrops(users)
  console.log('\n→ Re-runner ce seed est sûr : tout est en upsert sur clé unique.')
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

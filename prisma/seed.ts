import { PrismaClient, SlugKind } from '@prisma/client'

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

async function seedDemoUsers() {
  const plombier = await prisma.user.upsert({
    where: { email: 'plombier@demo.fr' },
    update: {},
    create: {
      email: 'plombier@demo.fr',
      name: 'Marc Dubois',
      business: 'Plomberie Lyon Centre',
      trade: 'plombier',
    },
  })
  const coach = await prisma.user.upsert({
    where: { email: 'coach@demo.fr' },
    update: {},
    create: {
      email: 'coach@demo.fr',
      name: 'Aïcha Martin',
      business: 'Cap Transition',
      trade: 'coach',
    },
  })
  const resto = await prisma.user.upsert({
    where: { email: 'resto@demo.fr' },
    update: {},
    create: {
      email: 'resto@demo.fr',
      name: 'Théo Lehmann',
      business: "Table d'Adèle",
      trade: 'restaurateur',
    },
  })
  console.log('✓ users démo :', { plombier: plombier.id, coach: coach.id, resto: resto.id })
}

async function main() {
  await seedSlugWords()
  await seedDemoUsers()
  console.log('\nLes 3 drops de démo sont générés à part :')
  console.log('  pnpm tsx scripts/seed-drops.ts  (à créer)')
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

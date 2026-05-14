# Drop

Un patron de TPE/PME tape une phrase ou envoie un vocal de 20 secondes. En moins de 90 secondes, l'app génère un **mini-site web partageable** (hook visuel, contenu structuré, interaction, CTA, tracking) servi sous `/d/[slug]`. Le site s'auto-détruit après 7 jours.

Hackathon **Académie IApreneurs × Hostinger** — thème 02 (création de contenu).

---

## Stack

- **Framework** : Next.js 15 (App Router), TypeScript strict, Node 20+
- **UI** : Tailwind v4, shadcn/ui, framer-motion
- **DB** : PostgreSQL via Prisma
- **IA texte** : Anthropic SDK (`@anthropic-ai/sdk`), modèle `claude-opus-4-7`
- **IA image** : fal.ai (Flux Schnell pour la vitesse, ~2s par image)
- **IA voice → text** : OpenAI Whisper API (ou `@anthropic-ai/sdk` si dispo en speech)
- **Tracking** : table `drop_events` custom (pas de Plausible : on garde le contrôle pour la démo)
- **Cron** : route `/api/cron/expire` appelée par cron Hostinger toutes les heures
- **Déploiement** : Hostinger Cloud Hosting / VPS, build Next standalone

---

## Commands

```bash
pnpm dev              # dev local sur :3000
pnpm build            # build prod
pnpm typecheck        # tsc --noEmit, à lancer avant commit
pnpm lint             # eslint, à lancer avant commit
pnpm db:push          # push schema sans migration (hackathon mode)
pnpm db:migrate       # migration propre
pnpm db:studio        # ouvrir prisma studio
pnpm db:seed          # 3 drops de demo pour la présentation
```

---

## Architecture

```
src/
├── app/
│   ├── (creator)/            # Espace patron PME (auth requise)
│   │   ├── dashboard/        # Liste des drops + stats
│   │   └── new/              # Form de création (texte ou vocal)
│   ├── d/[slug]/             # PAGES PUBLIQUES des drops — SSR avec cache
│   │   └── page.tsx          # Sélectionne le template, hydrate avec les data
│   └── api/
│       ├── drops/route.ts    # POST: créer un drop, GET: lister
│       ├── drops/[id]/route.ts
│       ├── generate/route.ts # Endpoint streaming pour la génération
│       └── cron/expire/route.ts
├── lib/
│   ├── ai/
│   │   ├── generate.ts       # Pipeline principal de génération
│   │   ├── prompts.ts        # Tous les prompts système
│   │   ├── schema.ts         # Zod schema du DropContent (cf. plus bas)
│   │   └── image.ts          # Wrapper fal.ai
│   ├── db.ts                 # Prisma client singleton
│   └── slug.ts               # Génération de slugs lisibles
├── components/
│   ├── templates/            # UN composant par variante (template_type)
│   │   ├── how-to.tsx
│   │   ├── manifesto.tsx
│   │   ├── case-study.tsx
│   │   ├── quiz.tsx
│   │   └── announcement.tsx
│   └── creator/              # UI du dashboard
└── prisma/schema.prisma
```

### Flow de création (le truc à ne pas casser)

1. Patron envoie input (texte ou audio) → `POST /api/generate`
2. Si audio → Whisper → texte
3. **Un seul appel Claude** avec output structuré (tool use ou JSON mode) qui renvoie un `DropContent` complet (cf. schema)
4. **En parallèle**, fal.ai génère l'image hero à partir du `image_prompt` retourné par Claude
5. Insertion en DB → slug généré → redirection `/d/{slug}`
6. La page `/d/[slug]` lit la row, sélectionne `templates/${template_type}.tsx`, rend.

**Streaming optionnel** : si le temps le permet, stream les sections au fur et à mesure pour donner l'effet "ça se construit en live" — fort impact démo.

---

## Le contrat IA (le plus important)

Claude doit **toujours** renvoyer un objet conforme à ce schema Zod (`lib/ai/schema.ts`). Tout le reste de l'app en dépend. Ne jamais générer du contenu en texte libre.

```ts
{
  template_type: 'how-to' | 'manifesto' | 'case-study' | 'quiz' | 'announcement',
  hook: { title: string, subtitle: string },          // page d'accueil
  image_prompt: string,                                // pour fal.ai
  sections: Array<                                     // 2 à 4 sections
    | { kind: 'text', heading: string, body: string }
    | { kind: 'stat', value: string, label: string }
    | { kind: 'checklist', items: string[] }
    | { kind: 'comparison', before: string, after: string }
  >,
  interaction: { kind: 'quiz' | 'poll' | 'none', payload?: any },
  cta: { label: string, kind: 'contact' | 'booking' | 'devis' | 'lead' },
  meta: { theme: 'cream' | 'violet' | 'dark', tone: string }
}
```

C'est Claude qui choisit le `template_type` en fonction du sujet — c'est ce qui rend chaque Drop visuellement différent sans qu'on ait à choisir un template manuellement.

---

## Conventions importantes

- **Toujours générer en streaming côté serveur** quand l'utilisateur regarde — pas de loading spinner pendant 60s, sinon le wahou démo meurt.
- **Toujours valider avec Zod** la sortie de Claude avant insertion DB. Si parse échoue, retry une fois avec un message d'erreur explicite injecté dans le prompt.
- **Toujours générer l'image en parallèle du texte**, pas après. Promise.all obligatoire.
- **Les templates ne doivent jamais fetch eux-mêmes** — ils reçoivent toute la data en props depuis la page serveur.
- **Pas de migrations Prisma pendant le hackathon** — utiliser `db:push`. On fera propre après si le projet survit.
- **Le slug doit être human-readable** : `lent-papillon-mauve`, pas un UUID. Slugs garantis uniques via une table de mots.
- **TTL = `expires_at` en DB**, jamais une suppression manuelle. Le cron lit cette colonne et soft-delete (`is_active = false`). La page `/d/[slug]` renvoie 410 Gone si expiré, avec une animation propre.

---

## Variables d'env (`.env.local`)

```
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
FAL_KEY=...
OPENAI_API_KEY=...                # uniquement pour Whisper
CRON_SECRET=...                   # header bearer pour /api/cron/expire
NEXT_PUBLIC_BASE_URL=https://drop.tld
```

---

## Toujours / Jamais

- **Toujours** lancer `pnpm typecheck` et `pnpm lint` avant un commit.
- **Toujours** tester la génération avec un vrai input réel (pas "lorem ipsum") quand on touche aux prompts. Les prompts cassent silencieusement.
- **Toujours** garder les 3 drops de seed à jour — ce sont eux qu'on présente au jury.
- **Jamais** push des secrets. `.env.local` est dans `.gitignore`.
- **Jamais** changer le schema `DropContent` sans mettre à jour les 5 templates en même temps. Le template attend exactement ces clés.
- **Jamais** déployer un drop sans `expires_at` set. Sinon il reste vivant pour toujours, contradiction avec la promesse produit.

---

## Cible démo

Trois drops seed dans `db:seed` qui doivent claquer au jury :

1. **Plombier Lyon** — "Pourquoi 80% des chaudières lâchent en novembre" (template `how-to`, checklist + CTA devis)
2. **Coach pro Bordeaux** — "Tu changes de boîte ?" (template `quiz`, lead capture)
3. **Restaurant Lille** — "Le menu de cette semaine en 3 plats" (template `announcement`, CTA réservation)

Si ces trois rendent bien, le projet est démontrable. Le reste est bonus.

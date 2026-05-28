# 08 — Livraison de l'Outil au Jury

Fournir Drop au jury, ce n'est pas juste donner une URL. C'est s'assurer que **n'importe quel membre du jury, sans contexte, peut tester en 60 secondes et obtenir un wahou**. Avec un plan B si quelque chose plante.

---

## 1. Stack de déploiement

Conformément à l'angle Hostinger du pitch, **Drop doit être déployé chez Hostinger**. C'est cohérent avec ton positionnement. Deux options chez eux :

| Option | Pour qui | Coût | Limite |
|---|---|---|---|
| **VPS Hostinger** | Tu maîtrises Linux/Docker | ~10€/mois | Tout faire à la main |
| **Cloud Hosting Hostinger** | Tu veux un Node.js managé | ~12€/mois | Limites de RAM selon plan |

Si tu connais bien le déploiement Node : VPS. Sinon : Cloud Hosting avec Node.js. Pour un hackathon, le Cloud Hosting est plus sûr — moins de surprises de config réseau.

**Note** : ne pas déployer sur Vercel pour la démo finale. C'est tentant (Vercel = Next.js facile), mais ça contredit ton pitch « hébergé chez Hostinger ». Le jury vérifiera l'URL et le DNS. Sois cohérent.

---

## 2. Le domaine

Idéalement un domaine custom court. Trois options par ordre de préférence :

1. **Domaine acheté** : `drop.fr`, `drop.app`, `getdrop.fr` (~15€/an chez Hostinger). C'est le plus pro.
2. **Sous-domaine Hostinger gratuit** : `drop.hostingersite.com` ou équivalent. Acceptable.
3. **`ngrok` ou tunnel** : à éviter pour la démo finale. Ok pour les tests internes.

Vérifier dès J-7 :
- DNS configuré (A record vers IP, CNAME pour www)
- SSL/HTTPS automatique (Let's Encrypt via Hostinger)
- Test depuis un téléphone en 4G : le domaine résout

---

## 3. Comptes démo pré-créés pour le jury

Le jury ne doit pas créer un compte. Pourquoi :
- L'inscription par magic link prend 1-2 min (envoi email, attente, clic). Sur 5 membres de jury, tu perds 10 min de leur attention.
- Les emails du jury peuvent atterrir en spam.
- Le jury teste rarement à 100 %. Beaucoup vont juste regarder. Si tu mets une barrière auth, ils ne testent rien.

**Donc** : crée 3 comptes démo pré-prêts, chacun avec ses propres seeds Drops, et donne au jury **un accès direct sans login**.

### Le système d'accès direct

Au lieu d'auth, génère un token de session démo invité qui contourne le magic link :

```ts
// src/app/jury/[token]/page.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'

export default async function JuryEntryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const demoEmail = DEMO_TOKENS[token]    // mapping token → email démo
  if (!demoEmail) redirect('/')

  // Crée une session sans passer par le magic link
  const session = await auth.api.createSession({
    body: { userId: getUserIdByEmail(demoEmail) },
  })

  const cookieStore = await cookies()
  cookieStore.set('better-auth.session_token', session.token, {
    httpOnly: true, secure: true, sameSite: 'lax',
    expires: session.expiresAt,
  })

  redirect('/dashboard')
}

const DEMO_TOKENS: Record<string, string> = {
  'jury-plombier-h4k7': 'plombier@demo.fr',
  'jury-coach-m9p2': 'coach@demo.fr',
  'jury-restaurant-x3q8': 'resto@demo.fr',
}
```

URLs à donner au jury :
- `https://getdrop.cloud/jury/jury-plombier-h4k7`
- `https://getdrop.cloud/jury/jury-coach-m9p2`
- `https://getdrop.cloud/jury/jury-restaurant-x3q8`

Chaque lien connecte directement à un compte démo prêt, avec ses 3-5 drops déjà générés et leurs statistiques peuplées.

**Important** : ne diffuse PAS ces URLs publiquement avant la soumission. Elles donnent un accès admin aux comptes démo. Désactive-les après le hackathon.

---

## 4. Rate limiting pour éviter l'explosion des coûts

Si un membre du jury (ou un curieux) génère 100 Drops avec un compte démo, tu prends $2 d'API Claude + $0.30 d'images. Pas la fin du monde, mais à 1000 utilisateurs c'est $20. À surveiller.

Implémente un rate limit simple par compte :

```ts
// src/lib/rate-limit.ts
import { prisma } from './db'

export async function checkRateLimit(userId: string, limit = 10, windowHours = 24) {
  const since = new Date(Date.now() - windowHours * 3600 * 1000)
  const count = await prisma.drop.count({
    where: { userId, createdAt: { gte: since } },
  })
  if (count >= limit) {
    throw new Error(`Limite atteinte : ${limit} Drops par ${windowHours}h. Réessaie demain.`)
  }
}
```

À appeler en haut de `/api/generate` avant tout appel coûteux. Pour les comptes démo, mets une limite raisonnable (genre 20 Drops sur 48h). Pour un compte normal, 10/jour suffit.

---

## 5. Page d'accueil dédiée au jury

Crée une URL `/jury` (publique, sans auth) qui explique tout en une page :

```tsx
// src/app/jury/page.tsx
export default function JuryHomePage() {
  return (
    <div className="min-h-screen bg-cream-grain text-ink px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet mb-6">
          Hackathon · Académie IApreneurs × Hostinger
        </p>
        <h1 className="font-display text-6xl leading-[0.95] mb-8">
          Drop, pour le jury.
        </h1>
        <p className="font-editorial italic text-2xl leading-relaxed opacity-90 mb-12">
          Le pop-up store du contenu web. Une phrase devient un mini-site éphémère, hébergé chez Hostinger, qui s'auto-détruit en sept jours.
        </p>

        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-60 mb-4">
          Trois manières de tester
        </h2>

        <ol className="space-y-6 mb-16">
          <DemoLink
            number="01"
            label="Voir des Drops déjà générés"
            description="Trois mini-sites publiés, dans trois styles différents."
            links={[
              { label: 'Plombier — Guide pratique', href: '/d/lent-papillon-mauve' },
              { label: 'Coach — Quiz d\'auto-évaluation', href: '/d/calme-sentier-indigo' },
              { label: 'Restaurant — Annonce de menu', href: '/d/vif-horizon-rouille' },
            ]}
          />

          <DemoLink
            number="02"
            label="Entrer dans le dashboard d'un patron"
            description="Accès direct, sans inscription. Liste des Drops, statistiques, événements."
            links={[
              { label: 'Compte plombier', href: '/jury/jury-plombier-h4k7' },
              { label: 'Compte coach', href: '/jury/jury-coach-m9p2' },
              { label: 'Compte restaurant', href: '/jury/jury-restaurant-x3q8' },
            ]}
          />

          <DemoLink
            number="03"
            label="Générer un Drop par vous-même"
            description="Connectez-vous à n'importe quel compte démo ci-dessus, cliquez sur Nouveau Drop, tapez une phrase. Comptez 60 à 90 secondes."
            links={[]}
          />
        </ol>

        <hr className="border-ink/20 mb-12" />

        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-60 mb-4">
          Ressources
        </h2>
        <ul className="space-y-3 font-mono text-sm">
          <li>→ <a href="https://github.com/…" className="underline underline-offset-4">Code source GitHub</a></li>
          <li>→ <a href="/Drop_Pitch_Hackathon.pdf" className="underline underline-offset-4">Deck PDF (9 pages)</a></li>
          <li>→ <a href="mailto:contact@getdrop.cloud" className="underline underline-offset-4">Contact équipe</a></li>
        </ul>
      </div>
    </div>
  )
}

function DemoLink({ number, label, description, links }: {
  number: string
  label: string
  description: string
  links: { label: string; href: string }[]
}) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-6">
      <span className="font-mono text-xs text-violet pt-1">{number}</span>
      <div>
        <p className="font-display text-2xl leading-tight">{label}</p>
        <p className="opacity-80 mt-2 mb-4">{description}</p>
        <div className="flex flex-wrap gap-3">
          {links.map(l => (
            <a key={l.href} href={l.href} className="px-4 py-2 border border-ink/30 hover:border-ink font-mono text-[11px] uppercase tracking-[0.15em] transition">
              {l.label} ↗
            </a>
          ))}
        </div>
      </div>
    </li>
  )
}
```

C'est cette page que tu mets en description de ta vidéo. URL courte : `getdrop.cloud/jury`.

---

## 6. README du repo GitHub

Si le hackathon demande le code, le repo doit être lisible en 3 minutes. Structure minimale :

```markdown
# Drop

Le pop-up store du contenu web. Une phrase devient un mini-site éphémère.

→ **Démo live** : https://getdrop.cloud/jury
→ **Vidéo de pitch** : https://youtu.be/…
→ **PDF du deck** : [Drop_Pitch_Hackathon.pdf](./Drop_Pitch_Hackathon.pdf)

## Stack

Next.js 15 · TypeScript · Tailwind v4 · Prisma + PostgreSQL · Better Auth · Anthropic Claude · fal.ai (Flux) · Resend · Hébergé sur Hostinger.

## Run locally

\`\`\`bash
pnpm install
cp .env.example .env.local    # remplir les clés API
pnpm db:push
pnpm db:seed
pnpm dev
\`\`\`

## Architecture

Voir [docs/](./docs/) pour la documentation complète :

- `01-ai-contract.md` — le schema Zod et les prompts Claude
- `02-database.md` — modèle Prisma
- `03-generation-pipeline.md` — flow de génération avec streaming
- `04-templates.md` — les 5 templates React
- `05-auth.md` — magic link via Better Auth
- `06-dashboard.md` — espace patron

## Équipe

[Liste des membres]

## Hackathon

Académie IApreneurs × Hostinger — mai 2026 — Thème 02 (Création de contenu).
```

Le README ne doit pas vendre Drop (la vidéo le fait). Il doit prouver que **le projet est techniquement sérieux**. C'est l'inverse du pitch émotionnel : factuel, structuré, court.

---

## 7. Monitoring de base

Le jury va tester sur 24-48h. Tu dois savoir si ça tombe en panne. Trois choses minimum :

**1. Uptime check externe.** Configure un check toutes les 5 min sur `getdrop.cloud/api/health` :
- Service gratuit : UptimeRobot, Better Stack, Hyperping
- Si down : notification SMS / Slack / Telegram
- Le endpoint `/api/health` retourne juste `{ ok: true, db: 'ok', ai: 'ok' }`

```ts
// src/app/api/health/route.ts
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({ ok: true, db: 'ok', timestamp: Date.now() })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
```

**2. Logs de génération.** Chaque appel à `/api/generate` log :
- userId (anonymisé)
- input length
- durée totale
- succès / erreur
- coût estimé

Dans une table `generation_log` ou simplement console.log si tu n'as pas le temps. Tu sauras au moins si quelque chose part en vrille.

**3. Alerte coûts.** Configure une alerte sur ta console Anthropic et fal.ai à $5 et $20. Si tu reçois la première à 3h du matin pendant l'évaluation, tu sais que quelque chose tourne mal (un bot, un test automatisé qui boucle).

---

## 8. Plan B si quelque chose plante

Préparer trois scénarios.

### Scénario 1 — Génération en panne (Claude ou fal.ai down)

**Symptôme** : l'utilisateur tape une phrase, attend, et obtient une erreur.

**Plan B** : afficher un message clair *« Génération temporairement indisponible. Voici trois Drops qu'on a déjà créés. »* avec des liens vers les seeds. Le jury peut quand même évaluer le rendu.

```tsx
// En cas d'erreur dans generate-client.tsx
{error && (
  <div className="mt-6">
    <p className="text-rouille">Génération indisponible. Voilà ce que ça donne en exemple :</p>
    <Link href="/d/lent-papillon-mauve">→ Voir un Drop déjà créé</Link>
  </div>
)}
```

### Scénario 2 — Base de données down

**Symptôme** : l'app entière ne charge pas.

**Plan B** : avoir une page statique de secours à `/backup.html` (HTML pur, pas Next.js) qui affiche les 3 drops seeds en screenshots + un lien vers la vidéo. Si le serveur web tient mais que la DB est down, tu redirected vers cette page.

### Scénario 3 — Hostinger lui-même down

**Symptôme** : `getdrop.cloud` ne résout pas.

**Plan B** : un domaine de secours sur Vercel ou Netlify (gratuit) qui héberge la vidéo + un message *« On a un incident, voici la vidéo et le PDF. »*. URL : par exemple `drop-backup.vercel.app`. Activé seulement si nécessaire.

Précise dans la description vidéo : *« En cas d'incident sur le site principal, mirror disponible sur [URL backup]. »*

---

## 9. Stress test J-2

Deux jours avant la soumission, fais ces tests :

- [ ] Ouvre `getdrop.cloud/jury` depuis 3 appareils différents (Chrome Mac, Safari iPhone, Firefox Linux).
- [ ] Clique sur chaque CTA, génère un Drop frais sur chaque compte démo.
- [ ] Mesure le temps de génération (doit être < 90 s).
- [ ] Ouvre 5 onglets en même temps qui génèrent simultanément. Vérifie que ça tient (concurrent requests).
- [ ] Demande à 1 personne extérieure (ami, conjoint) de tester sans aucune explication. Si ça lui prend plus de 2 min à comprendre, ta page `/jury` est mal foutue.
- [ ] Test depuis une connexion 4G mobile, pas wifi rapide.
- [ ] Vérifier que les liens dans la description vidéo fonctionnent depuis YouTube en mobile.

---

## 10. Récap des livrables au moment de la soumission

Liste à fournir au hackathon :

| Livrable | Format | Où |
|---|---|---|
| Vidéo de pitch | MP4 1080p ≤ 200 Mo | Plateforme hackathon + YouTube en non-listé |
| URL de la démo | `getdrop.cloud/jury` | Lien direct dans le formulaire |
| Code source | Repo GitHub public | URL dans la soumission |
| Deck PDF | 9 pages, sous-fichier | Joint à la soumission |
| Description | Texte court | Champ "description" du formulaire |
| Mirror de secours | URL alternative | Mentionné dans la description vidéo |

**Description courte type pour le formulaire (max 500 caractères) :**

> *Drop transforme une phrase en mini-site web éphémère, hébergé chez Hostinger, qui s'auto-détruit en 7 jours. Le pop-up store du contenu web pour les TPE et PME. Aucun savoir-faire technique requis : input léger en entrée, expérience web complète en sortie, avec tracking et capture de lead intégrés. Démo en accès direct sans inscription sur getdrop.cloud/jury.*

---

## 11. Erreurs à ne pas faire

- **Ne pas demander au jury de s'inscrire.** Aucun jury ne s'inscrit. Tous abandonnent à la 1ère friction.
- **Ne pas livrer un repo GitHub privé.** Si le jury ne peut pas voir le code, il considère qu'il n'y en a pas.
- **Ne pas attendre J-1 pour tester.** Les bugs se révèlent sous charge légère, pas en dev local.
- **Ne pas oublier de désactiver les Stripe / API keys live** dans le repo public. `git secrets` ou un audit manuel avant de pousser.
- **Ne pas laisser les comptes démo accessibles après le hackathon.** Une fois noté, désactive `/jury/*`. Sinon n'importe qui en internet peut se connecter à tes données.

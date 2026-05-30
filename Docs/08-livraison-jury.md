# 08 — Livraison Hackathon

Procédure de livraison et garde-fous opérationnels pour rendre Drop accessible pendant la phase d'évaluation : accès direct sans signin, monitoring, rate-limit, plans B en cas de panne.

---

## 1. Stack de déploiement

Drop est hébergé sur **VPS Hostinger + Dokploy** (Dockerfile multi-stage Node 20-alpine, Traefik + Let's Encrypt, Postgres interne, volume persistant pour les uploads). Cf. `DEPLOY.md` pour la procédure complète et les pièges rencontrés au premier déploiement.

Le déploiement Vercel a été écarté volontairement : il contredirait le positionnement produit (« hébergé chez Hostinger »).

---

## 2. Domaine

Domaine actuel : **`getdrop.cloud`** (acheté chez Hostinger, ~15 €/an).

Vérifications à effectuer J-7 minimum :

- DNS configuré (A record vers IP du VPS, CNAME pour `www`)
- HTTPS automatique via Let's Encrypt (géré par Traefik)
- Test de résolution depuis un téléphone en 4G

---

## 3. Accès direct sans signin

Le parcours par magic link impose un aller-retour email peu compatible avec une évaluation rapide. Pour les démos publiques, prévoir un mécanisme d'**accès direct sans login** via tokens hardcodés.

### Principe

Une route `/jury/[token]` mappe chaque token vers un compte démo pré-créé. Elle ouvre une session sans passer par le magic link.

```ts
// src/app/jury/[token]/page.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'

export default async function JuryEntryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const demoEmail = DEMO_TOKENS[token]
  if (!demoEmail) redirect('/')

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

URLs à communiquer :

- `https://getdrop.cloud/jury/jury-plombier-h4k7`
- `https://getdrop.cloud/jury/jury-coach-m9p2`
- `https://getdrop.cloud/jury/jury-restaurant-x3q8`

Chaque URL ouvre un dashboard pré-peuplé (3-5 drops démo avec stats).

**Sécurité** : ces URLs donnent un accès admin aux comptes démo. Ne pas les diffuser publiquement avant la soumission. Les désactiver après la fin de l'évaluation.

> **Statut implémentation** : à faire. Hors scope de la première passe de déploiement, à traiter avant la soumission.

---

## 4. Rate limiting (protection coûts)

Un compte démo accessible publiquement peut générer un volume important de Drops si une personne enchaîne les requêtes. Coût d'ordre de grandeur : ~$0.02 par Drop (Claude + Flux Schnell). 100 Drops = $2 ; 1000 Drops = $20.

Limite simple par compte :

```ts
// src/lib/rate-limit.ts
import { prisma } from './db'

export async function checkRateLimit(userId: string, limit = 10, windowHours = 24) {
  const since = new Date(Date.now() - windowHours * 3600 * 1000)
  const count = await prisma.drop.count({
    where: { userId, createdAt: { gte: since } },
  })
  if (count >= limit) {
    throw new Error(`Limite atteinte : ${limit} Drops par ${windowHours}h. Réessayer demain.`)
  }
}
```

À appeler en haut de `/api/generate` avant les appels API coûteux.

> **Note** : un rate-limit per-IP via Upstash est déjà en place sur `/api/generate` (`drop:generate`, 10/h). La limite per-account ci-dessus est complémentaire pour les comptes démo.

Paramètres recommandés :
- **Comptes démo** : 20 Drops / 48h.
- **Comptes normaux** : 10 Drops / 24h.

---

## 5. Page d'accueil dédiée (`/jury`)

URL publique sans auth qui regroupe les trois manières d'accéder à la démo. Sert d'entrée unique communiquée dans la description de la vidéo.

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
          Drop, accès démo.
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
            label="Générer un Drop"
            description="Se connecter à n'importe quel compte démo ci-dessus, cliquer sur Nouveau Drop, taper une phrase. Compter 60 à 90 secondes."
            links={[]}
          />
        </ol>

        <hr className="border-ink/20 mb-12" />

        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-60 mb-4">
          Ressources
        </h2>
        <ul className="space-y-3 font-mono text-sm">
          <li>→ <a href="https://github.com/…" className="underline underline-offset-4">Code source GitHub</a></li>
          <li>→ <a href="/Drop_Pitch_Jury.pdf" className="underline underline-offset-4">Deck PDF</a></li>
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

URL courte communiquée : `getdrop.cloud/jury`.

---

## 6. README du repo GitHub

Le README doit être lisible en 3 minutes et prouver que le projet est techniquement sérieux. Cf. `README.md` à la racine — structure minimale : démo live, vidéo, PDF, stack, instructions de run, lien vers `Docs/`.

Voir aussi `CLAUDE.md` qui résume les conventions et l'architecture en une page.

---

## 7. Monitoring de base

Pendant la phase d'évaluation (24-48 h typiques), il faut un signal de panne. Trois éléments minimum :

**1. Uptime check externe.** Check toutes les 5 min sur `getdrop.cloud/api/health` via UptimeRobot, Better Stack ou Hyperping. Notification SMS / Slack / Telegram en cas de down.

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

Status uptime public : <https://stats.uptimerobot.com/Rd3dJ0eSNG>.

**2. Logs de génération.** Chaque appel à `/api/generate` log :
- userId (anonymisé)
- input length
- durée totale
- succès / erreur
- coût estimé

Stocker dans une table dédiée ou simplement `console.log`. Permet de détecter une dérive en lecture rapide.

**3. Alertes coût.** Configurer une alerte sur la console Anthropic et fal.ai à $5 et $20. Une alerte à 3 h du matin pendant l'évaluation signale en général un bot ou un test automatisé qui boucle.

---

## 8. Plans B

Trois scénarios anticipés.

### Scénario 1 — Génération en panne (Claude ou fal.ai indisponible)

**Symptôme** : l'utilisateur tape une phrase, attend, obtient une erreur.

**Mitigation** : afficher un message clair *« Génération temporairement indisponible. Voici trois Drops déjà créés. »* avec liens vers les seeds. L'évaluation visuelle reste possible.

```tsx
// En cas d'erreur dans generate-client.tsx
{error && (
  <div className="mt-6">
    <p className="text-rouille">Génération indisponible. Exemple de rendu :</p>
    <Link href="/d/lent-papillon-mauve">→ Voir un Drop déjà créé</Link>
  </div>
)}
```

### Scénario 2 — Base de données down

**Symptôme** : l'app entière ne charge pas.

**Mitigation** : page statique de secours `/backup.html` (HTML pur, hors Next.js) avec les 3 drops seeds en screenshots + lien vers la vidéo. Si Next sert encore mais que la DB est down, redirection vers cette page.

### Scénario 3 — Hostinger indisponible

**Symptôme** : `getdrop.cloud` ne résout pas.

**Mitigation** : un domaine de secours sur Vercel ou Netlify (gratuit) qui héberge la vidéo + un message *« Incident en cours, voici la vidéo et le PDF. »*. Activé uniquement en cas d'incident réel.

Description vidéo à compléter : *« En cas d'incident sur le site principal, mirror disponible sur [URL backup]. »*

---

## 9. Tests de charge J-2

Deux jours avant la soumission, série de tests à réaliser :

- [ ] Ouvrir `getdrop.cloud/jury` depuis 3 appareils différents (Chrome Mac, Safari iPhone, Firefox Linux).
- [ ] Cliquer sur chaque CTA, générer un Drop frais sur chaque compte démo.
- [ ] Mesurer le temps de génération (cible < 90 s).
- [ ] Ouvrir 5 onglets en parallèle qui génèrent simultanément. Vérifier la tenue.
- [ ] Faire tester 1 personne extérieure sans aucune explication. Si la prise en main dépasse 2 min, la page `/jury` est à revoir.
- [ ] Test depuis une connexion 4G mobile, pas wifi rapide.
- [ ] Vérifier que les liens dans la description vidéo fonctionnent depuis YouTube en mobile.

---

## 10. Livrables au moment de la soumission

| Livrable | Format | Où |
|---|---|---|
| Vidéo de pitch | MP4 1080p ≤ 200 Mo | Plateforme hackathon + YouTube non-listé |
| URL de la démo | `getdrop.cloud/jury` | Lien direct dans le formulaire |
| Code source | Repo GitHub public | URL dans la soumission |
| Deck PDF | Sous-fichier joint | Joint à la soumission |
| Description | Texte court | Champ "description" du formulaire |
| Mirror de secours | URL alternative | Mentionné dans la description vidéo |

**Description courte type pour le formulaire (≤ 500 caractères) :**

> *Drop transforme une phrase en mini-site web éphémère, hébergé chez Hostinger, qui s'auto-détruit en 7 jours. Le pop-up store du contenu web pour les TPE et PME. Aucun savoir-faire technique requis : input léger en entrée, expérience web complète en sortie, avec tracking et capture de lead intégrés. Démo en accès direct sans inscription sur getdrop.cloud/jury.*

---

## 11. À ne pas oublier

- **Ne pas demander d'inscription pour la démo.** Une étape de magic link décourage l'essai.
- **Garder le repo GitHub public** pour permettre la lecture du code.
- **Tester sous charge légère avant la deadline**, pas la veille.
- **Désactiver les clés API live exposées dans le repo.** Audit manuel ou `git secrets` avant chaque push public.
- **Désactiver `/jury/*` après la fin de l'évaluation.** Sinon n'importe qui sur internet a un accès admin aux comptes démo.

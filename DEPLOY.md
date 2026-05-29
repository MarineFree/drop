# Déploiement Drop sur VPS Hostinger via Dokploy

Cette doc est la **checklist humaine** pour passer Drop de zéro à prod sur un VPS Hostinger géré par Dokploy. Aucune commande n'est lancée par l'IA — tout passe par la GUI Dokploy + ton terminal SSH.

> Toutes les manipulations DB (push, seed) se font après le premier déploiement, depuis le terminal du conteneur app dans Dokploy.

---

## 0. Pré-requis

- **VPS Hostinger** (KVM 2 ou plus, 4 GB RAM minimum, 8 GB confortable pour le build Next).
- **Dokploy installé** sur le VPS, accessible sur `http://<IP-VPS>:3000` (port à fermer après passage au domaine).
- **Repo GitHub** `drop` à jour (branche `main`), accessible en lecture par Dokploy.
- **Domaine** géré chez Hostinger (ex: `getdrop.cloud`).
- **Comptes API** créés et clés en main :
  - Anthropic (`sk-ant-…`)
  - fal.ai (`FAL_KEY`)
  - OpenAI (Whisper — `sk-…`)
  - Resend (`re_…`) + domaine email vérifié si tu sors du sandbox
  - Upstash Redis (URL REST + token)

---

## 1. DNS Hostinger (à faire avant tout le reste)

Routing **path-based** uniquement, pas de sous-domaines applicatifs (`/d/[slug]` reste sous le domaine apex).

Dans le panel Hostinger → **DNS / nameservers** du domaine, créer :

| Type  | Hôte | Valeur (pointe vers) | TTL |
|-------|------|----------------------|-----|
| `A`   | `@`  | `<IP-VPS>`           | 1h  |
| `A`   | `www`| `<IP-VPS>`           | 1h  |

Pas de wildcard, pas de CNAME nécessaire. Vérifier la propagation après ~15 min avec `nslookup getdrop.cloud` ou https://dnschecker.org.

---

## 2. Créer le service PostgreSQL dans Dokploy

1. Dokploy → **Projects** → **Create Project** → nom : `drop`.
2. Dans le projet, **Create Service** → **PostgreSQL**.
   - Name : `drop-db`
   - Database name : `drop`
   - Username : `drop`
   - Password : choisir un mot de passe fort (à garder, on en a besoin pour DATABASE_URL).
3. **Deploy** → attendre que le service tourne (icône verte).
4. Récupérer le **hostname interne** du conteneur Postgres :
   - Onglet **Advanced** ou **Network** du service → champ `Host` (typiquement `drop-db.drop-{projectref}` ou similaire selon ta version Dokploy).
   - Si pas trouvé en GUI : SSH sur le VPS et lancer `docker network inspect <network-dokploy> | grep drop-db` pour récupérer le nom DNS interne.

Construire l'URL DATABASE_URL :

```
postgresql://drop:<password>@<hostname-interne>:5432/drop?schema=public
```

> Pas de `?pgbouncer=true` — Dokploy ne provisionne pas Supavisor, c'est du Postgres natif.

---

## 3. Créer le service Application dans Dokploy

1. Dans le projet `drop`, **Create Service** → **Application**.
2. **Source** :
   - Provider : **GitHub**
   - Repo : `MarineFree/drop`
   - Branch : `main`
   - Build path : `/` (racine du repo)
3. **Build** :
   - Build type : **Dockerfile** (auto-détecté, le `Dockerfile` à la racine prend le relais)
   - Si on te propose Nixpacks par défaut, basculer explicitement sur Dockerfile.
4. **Environment** → coller toutes les variables (voir section 4 ci-dessous).
5. **Domains** :
   - Ajouter `getdrop.cloud` (host principal)
   - Ajouter `www.getdrop.cloud` (alias)
   - Cocher **HTTPS** + **Let's Encrypt** (Traefik gère le renouvellement auto)
   - Path : `/`
   - Port interne : `3000` (le `EXPOSE 3000` du Dockerfile)
6. **Volumes** (CRITIQUE — sinon les photos patron disparaissent à chaque redeploy) :
   - Ajouter un **Volume Mount** :
     - Type : **Volume** (pas Bind Mount — un volume Docker nommé est persistant et géré par Dokploy)
     - Volume name : `drop-uploads`
     - Mount path (dans le conteneur) : `/data/uploads`
   - Ce volume survit aux rebuilds, restarts, et redéploiements de l'image.
7. **Deploy** → attendre le premier build. Suivre les logs.

> Premier build : compter 3-5 min (deps + Prisma generate + Next build). Les builds suivants sont incrémentaux (~1-2 min) grâce au cache Docker.

---

## 4. Variables d'environnement (Dokploy → Application → Environment)

Cf. `.env.example` à la racine du repo pour la liste canonique. À coller dans Dokploy :

```
# Database (hostname interne du conteneur Postgres)
DATABASE_URL=postgresql://drop:<password>@<hostname-interne>:5432/drop?schema=public

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
DROP_GENERATION_MODEL=sonnet

# fal.ai
FAL_KEY=...

# OpenAI (Whisper)
OPENAI_API_KEY=sk-...

# Resend (magic link auth)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=auth@getdrop.cloud

# Better Auth — DOIT matcher exactement le domaine résolu
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://getdrop.cloud

# Cron secret
CRON_SECRET=<openssl rand -hex 32>

# Visitor hashing
SALT_SEED=<openssl rand -hex 32>

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://....upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# URL publique
NEXT_PUBLIC_BASE_URL=https://getdrop.cloud

# Storage uploads — DOIT pointer sur le mount du volume Dokploy
UPLOAD_DIR=/data/uploads
```

**Pièges fréquents** :
- `BETTER_AUTH_URL` et `NEXT_PUBLIC_BASE_URL` **doivent** être identiques au domaine résolu côté Traefik. Sinon les magic links cliqués depuis l'email te jettent en `INVALID_TOKEN` à l'arrivée.
- `RESEND_FROM_EMAIL` doit utiliser un domaine **vérifié** dans le dashboard Resend, sinon les emails sont rejetés. Pour démarrer rapidement, `onboarding@resend.dev` est utilisable mais ne livrera qu'à l'email du compte Resend (sandbox).
- `UPLOAD_DIR` **doit** matcher exactement le mount path du volume Dokploy (`/data/uploads`).

---

## 5. Bootstrap de la base après le premier déploiement

Une fois le service app **Running** (vert) et la DB Postgres up :

1. Dokploy → service `drop-app` → onglet **General** → bouton **Open Terminal** (sur v0.29.x ça ouvre une modale "Docker Terminal").
2. Choisir l'onglet **/bin/sh** (PAS Bash — alpine n'embarque pas bash).
3. Le shell ouvre dans `/` et non `/app` (le `WORKDIR /app` du Dockerfile n'est pas respecté côté exec). **Faire `cd /app` AVANT toute commande**.
4. Lancer dans l'ordre :

```sh
cd /app

# Pousser le schema Prisma (création des tables)
node_modules/.bin/prisma db push --schema=prisma/schema.prisma --accept-data-loss

# Peupler slug_words + 3 users démo + 3 drops démo idempotents
node node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

> Le conteneur runtime contient le `node_modules` complet copié depuis le builder (Dockerfile §runner). `pnpm` n'est PAS installé en runtime — d'où les commandes via le chemin direct des binaires.

Sortie attendue :
```
✓ slug_words : 340 mots
✓ users démo : { plombier: 'cmp...', coach: 'cmp...', resto: 'cmp...' }
✓ drops démo : 3 drops (slugs demo-plombier-chaudiere-novembre, demo-coach-changement-boite, demo-resto-menu-semaine)
→ Re-runner ce seed est sûr : tout est en upsert sur clé unique.
```

Pour re-seed plus tard (idempotent — met à jour content/expiresAt sans dupliquer) :
```sh
cd /app && node node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

---

## 6. Brancher le cron horaire `/api/cron/expire`

La route soft-delete les drops dont `expiresAt < now()` (`isActive: false`). Sans ce job, les drops expirés restent visibles indéfiniment.

### Option A — Dokploy Schedules

**Disponible à partir de Dokploy v0.30**. Sur les versions plus anciennes (v0.29.x), l'onglet Schedules n'existe pas — utiliser l'option B.

1. Dokploy → projet `drop` → service `drop-app` → onglet **Schedules**.
2. **Create Schedule** :
   - Name : `expire-drops`
   - Cron expression : `0 * * * *` (toutes les heures, minute 0)
   - Command :
     ```sh
     curl -fsS -X POST https://getdrop.cloud/api/cron/expire \
       -H "Authorization: Bearer $CRON_SECRET"
     ```
   - **Run inside container** : `false` (l'appel passe par le réseau public Traefik, plus simple).
3. Tester en cliquant **Run Now** → réponse JSON `{"ok":true,"expired":0,"timestamp":"…"}`.

### Option B — crontab système du VPS (recommandé si Dokploy < v0.30)

```bash
ssh root@<IP-VPS>
crontab -e
# Ajouter cette ligne (UN seul espace entre chaque champ cron, espaces NORMAUX, pas de tab) :
0 * * * * curl -fsS -X POST https://getdrop.cloud/api/cron/expire -H "Authorization: Bearer <CRON_SECRET>" >/dev/null 2>&1
```

Sécurité — le secret est inline dans crontab donc le fichier doit être root-only :
```bash
chmod 600 /var/spool/cron/crontabs/root
```

Vérifier que ça tourne après la 1ère heure de minute 0 passée :
```bash
grep CRON /var/log/syslog | tail
```

Si rien dans syslog → vérifier que le service cron est up : `systemctl status cron`.

---

## 7. Volume persistant uploads

Le service `/api/upload-image` écrit dans `UPLOAD_DIR` via l'abstraction `src/lib/storage/`. La route publique `/uploads/[...path]` re-lit ces fichiers. Sans volume persistant, ces uploads disparaissent à chaque redeploy.

**Le volume Dokploy déclaré en section 3 (`drop-uploads` → `/data/uploads`) est OBLIGATOIRE.** Vérifications :

1. Après le 1er déploiement, dans le terminal Dokploy du conteneur app :
   ```bash
   ls -la /data/uploads
   stat /data/uploads
   ```
   Le dossier doit exister, owner `nextjs:nodejs` (uid 1001).

2. Upload de test : signe-toi sur la prod, va sur `/new`, attache une photo (JPEG < 4 Mo), génère un drop, ouvre le drop public et vérifie que l'image s'affiche.

3. Re-deploy (Dokploy → bouton **Redeploy**) → ré-ouvrir le même drop. L'image doit toujours s'afficher → preuve que le volume persiste.

**Migration future vers S3 / Hostinger Object Storage** : zéro touche aux routes. Ajouter une `S3Storage` implémentant l'interface `Storage` dans `src/lib/storage/`, modifier `getStorage()` pour la sélectionner via env var `STORAGE_BACKEND=s3`, set les credentials. Aucun consommateur (`/api/upload-image`, `/uploads/[...path]`) n'a besoin d'être modifié.

---

## 8. Vérifications post-deploy

À cocher après chaque déploiement majeur, avant de passer au cron / monitoring :

- [ ] `curl -fsS https://getdrop.cloud/api/health` → `{"ok":true,"db":"ok",…}`
- [ ] `GET https://getdrop.cloud/d/demo-plombier-chaudiere-novembre` → drop seed plombier rendu, sans erreur 500
- [ ] `GET https://getdrop.cloud/d/demo-coach-changement-boite` → drop quiz coach rendu
- [ ] `GET https://getdrop.cloud/d/demo-resto-menu-semaine` → drop annonce restaurant rendu
- [ ] Signin : sur `/signin`, entre un email Resend valide → clic du magic link → arrivée sur `/dashboard` sans erreur INVALID_TOKEN
- [ ] `/new` : génère un drop test avec photo upload → le drop s'ouvre et l'image s'affiche depuis `/uploads/…`
- [ ] CTA : clique le bouton sur un drop → 302 vers la cible + `ctaCount` du drop s'incrémente côté dashboard
- [ ] Cron : `curl -fsS -X POST https://getdrop.cloud/api/cron/expire -H "Authorization: Bearer <CRON_SECRET>"` → `{"ok":true,"expired":N}` avec N ≥ 0

---

## 9. Configuration VPS (section optionnelle — uniquement avec accès SSH root)

Cette section regroupe les commandes manuelles côté VPS si tu me donnes l'accès SSH.

### Firewall

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22       # SSH
ufw allow 80       # HTTP (Let's Encrypt + redirect Traefik)
ufw allow 443      # HTTPS
ufw allow 3000     # Dokploy GUI — À FERMER après config terminée
ufw enable
ufw status
```

Une fois la GUI Dokploy plus nécessaire au quotidien (ou exposable via le domaine), fermer le 3000 :

```bash
ufw deny 3000
```

### Swap (4 GB — assurance OOM au build Next sur VPS 4 GB RAM)

```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
swapon --show
free -h
```

Sans swap, un build Next 15 sous Node 20 peut OOM-killer sur 4 GB RAM (Webpack heap + Prisma generate concurrents).

### Lancer `db push` + `seed` contre la prod depuis SSH (alternative au terminal Dokploy)

Si le terminal GUI Dokploy n'est pas pratique :

```bash
# Trouver le container app
docker ps | grep drop-app

# Entrer dedans
docker exec -it <container-id> sh

# IMPORTANT : le shell s'ouvre dans `/`, pas dans `/app`
cd /app

# Push schema + seed
node_modules/.bin/prisma db push --schema=prisma/schema.prisma --accept-data-loss
node node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

---

## 10. Hors scope de cette passe (TODO follow-up)

Ces items sont décrits dans `Docs/08-livraison-jury.md` mais **pas implémentés** ici. À traiter avant la soumission jury :

- **Accès direct jury sans signin** : routes `/jury` (landing) + `/jury/<token>` (cookie session sans magic link) + DEMO_TOKENS hardcodés en env. Cf. Docs/08 §3 et §5.
- **Page `/jury`** publique avec les 3 liens drops démo + liens dashboards démo.
- **Monitoring uptime externe** : UptimeRobot / Better Stack pointant sur `/api/health`.
- **Page `/backup.html` statique** de fallback si la DB tombe (Docs/08 §8 Scénario 2).
- **Engagement score** dans EventsTimeline (Docs/06).

---

## Récap commandes locales utiles

```bash
# Stack local
pnpm install
cp .env.example .env.local       # remplir les clés
pnpm db:push                     # apply le schema
pnpm db:seed                     # peuple slug_words + 3 users + 3 drops
pnpm dev                         # localhost:3000

# Sanity avant push
pnpm typecheck && pnpm lint

# Build local (sait que le standalone échoue sur Windows — c'est OK)
pnpm build
```

---

## Annexe — Pièges rencontrés au premier déploiement (résolus)

Les bugs / friction réels rencontrés en live sur le 1er deploy Hostinger/Dokploy, déjà corrigés dans le repo mais documentés pour ne pas être perdus :

1. **Dokploy v0.29.5 — Postgres pas en accès direct dans Create Service.** Cliquer **Create Service → Database** puis sélectionner PostgreSQL dans la modale qui suit. La version v0.30+ propose Postgres en raccourci.

2. **Build path mal configuré.** Dokploy a deux champs côté Build : `Docker File` (chemin vers le Dockerfile, défaut OK = vide) et `Docker Context Path` (le contexte, à mettre `.`). Mettre `Dockerfile` dans Context Path donne `cd: can't cd to .../code/Dockerfile`. Solution : laisser Docker File vide + Context Path = `.`.

3. **SDK clients eager au top-level cassent `next build`.** Dokploy n'injecte pas les env vars au build (contrairement à Vercel). `new Resend(undefined)`, `new Anthropic(undefined)`, etc. throw au constructor pendant la collecte des page data. Tous les clients (`src/lib/emails/magic-link.ts`, `src/lib/ai/{whisper,generate,image}.ts`) ont été passés en **lazy** (fonction `getClient()`) — instanciation au runtime, pas au module load.

4. **Prisma `libssl.so.1.1: not found`.** Alpine 3.18+ ship OpenSSL 3, pas 1.1. Fix : `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` dans `prisma/schema.prisma` + `apk add openssl` dans les stages builder et runner du Dockerfile.

5. **`COPY /app/node_modules/.prisma` et `/app/node_modules/@prisma` échouent en pnpm.** Le hoist pnpm ne crée pas ces chemins au top-level (tout est dans `.pnpm/.../node_modules/`). Solution : `COPY --from=builder /app/node_modules ./node_modules` en entier. Image plus grosse (~250 MB de plus) mais permet aussi de lancer `prisma db push` + `tsx seed.ts` depuis le runtime.

6. **`COPY /app/public` échoue — le repo n'a pas de dossier `public/`.** Tout est inline (data: URIs dans globals.css, fonts via `next/font`). Ligne supprimée du Dockerfile.

7. **Terminal Docker Dokploy : `bash: executable file not found`.** Alpine n'embarque pas bash. Toujours choisir **/bin/sh** dans le sélecteur de shell.

8. **Terminal ouvre dans `/`, pas dans `/app`.** Le `WORKDIR /app` du Dockerfile n'est pas respecté côté exec. **Toujours `cd /app` AVANT toute commande** (prisma, tsx, etc.).

9. **`prisma/seed.ts` importait `../src/lib/ai/schema` au runtime.** `src/` n'est pas dans le standalone Next. Solution : inliner un type `DropContent` minimal directement dans `seed.ts` + supprimer la validation Zod runtime (le contenu est typé TS au build, validation Zod gardée sur le pipeline IA réel).

10. **DATABASE_URL : caractères spéciaux du mot de passe à URL-encoder.** Le `?` du password Postgres devient `%3F` dans la connection string (sinon parsé comme début du query string).

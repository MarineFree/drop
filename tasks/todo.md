# TODO — Drop

## État actuel
Bootstrap + 7 corrections architecturales appliquées (fallback IA, modèle par défaut, slug cache, dénormalisation, visitor hash, rate limit, décisions documentées). Aucune logique métier branchée sur les routes API — toutes en 501 (sauf le rate limit qui mord déjà sur `/api/generate`).

---

## Fait — Bootstrap initial
- [x] Lecture `CLAUDE.md` + `Docs/01-ai-contract.md` + `Docs/02-database.md`
- [x] Squelette Next.js 15 (App Router, TS strict, Tailwind v4)
- [x] Schema Prisma de base (User, Drop, DropEvent, SlugWord) + seed.ts
- [x] Contrat IA Zod (`src/lib/ai/schema.ts`) + prompt système
- [x] Wrappers `image.ts` (fal.ai) et `whisper.ts` (OpenAI)
- [x] Lib utilitaire : `db.ts`, `utils.ts`
- [x] Structure App Router : routes API stub + pages stub

## Fait — Corrections architecturales (cette passe)
- [x] **1. Fallback IA** — Opus → Sonnet 4.6 (pas Haiku). Throw si Sonnet fail. `GenerateResult.modelUsed` exposé.
- [x] **2. Modèle par défaut** — `DROP_GENERATION_MODEL` env, défaut `sonnet`. Opus opt-in. Trade-off documenté dans `lessons.md`.
- [x] **3. Slug uniqueness** — `@unique` confirmé sur `Drop.slug`. Cache module-level des pools. `generateSlugCandidate()` pur. Unicité via P2002 retry × 5 dans `createDrop`.
- [x] **4. Dénormalisation drop** — ajout `hasAudio`, `hasInteraction`, `interactionType` (enum), `sectionCount` sur Drop. `templateType` confirmé en colonne enum. Helper `extractDropMetadata` dans `src/lib/db/drops.ts`.
- [x] **5. Visitor hashing** — `src/lib/privacy/visitor.ts` avec SHA-256 + DAILY_SALT par HMAC. `SALT_SEED` ajouté à `.env.local.example`. Justification anonyme/pseudonyme dans `lessons.md`.
- [x] **6. Rate limiting** — `@upstash/ratelimit` + `@upstash/redis` ajoutés aux deps. `src/lib/ratelimit.ts` avec sliding window 10/h/IP. Branché dans `/api/generate` (mord avant le 501).
- [x] **7. Décisions actées** — modèle IA, hash visiteur, auth, tests dans `lessons.md`.

---

## Validations post-bootstrap env
À lancer **après** un `pnpm install` réussi et le provisioning Postgres. Aucune n'a été exécutée pendant cette passe (décision : lecture statique uniquement).

- [ ] `pnpm install` (Node ≥ 20 + pnpm)
- [ ] Provisionner Postgres (Docker local ou Neon) + remplir `.env.local`
- [ ] `pnpm prisma validate` — sanity check du schema
- [ ] `pnpm typecheck` — doit passer après l'install
- [ ] `pnpm db:push` — applique le schema (incluant les 4 champs dénormalisés Drop, `Drop.modelUsed`, enum `InteractionType`, enum `AiModel`)
- [ ] `pnpm db:seed` — peuple slug_words + 3 users démo
- [ ] **Plus tard** (quand schema stable) : régénérer une vraie migration initiale propre. Décision actée d'utiliser `db:push` en phase hackathon (cf. `CLAUDE.md`).

## Validations différées
Obligations actées dans `lessons.md` à exécuter avant ouverture publique du produit. Pas urgent en phase 1.

- [ ] **A/B Sonnet 4.6 vs Opus 4.7** sur 50 drops réels (10 par template_type). Comparer :
  - qualité subjective du contenu généré
  - taux de validation Zod en première passe (pas de retry / fallback)
  - latence p50 / p95
  - coût total cumulé
  Décider de l'issue : on garde Sonnet par défaut, on bascule Opus, ou on route par `template_type`. À faire **avant ouverture publique**, pas urgent en phase 1.

## À faire ensuite (priorité descendante)
- [x] Étoffer le pool de slug_words à 150 adjectifs / 150 noms / 40 couleurs (900 000 combos)
- [x] Implémenter `getActiveDropBySlug`, `expireOldDrops`, `trackEvent` dans `src/lib/db/drops.ts`
- [x] Brancher `/api/generate` : parse JSON body → `generateDrop` → `generateImage` → `createDrop` → SSE (auth déléguée à phase 2)
- [ ] Brancher `/api/cron/expire` (vérif bearer + appel `expireOldDrops`)
- [ ] Implémenter les 5 templates dans `src/components/templates/`
- [ ] Implémenter le renderer `src/components/templates/renderer.tsx`
- [ ] Page de création `(creator)/new` + client SSE (Docs/03 §4)
- [ ] Dashboard `(creator)/dashboard` (Docs/06)
- [ ] Scripts : `scripts/seed-drops.ts` pour les 3 drops démo (appels réels Anthropic + fal.ai)
- [ ] **Validation prompts** : script qui lance les 5 inputs de référence (Docs/01 §8) × 10 sur Sonnet vs Opus pour décider du modèle par défaut.

## Phase 2 — Auth
- [ ] Implémenter l'auth (**Better Auth** retenu — cf. `lessons.md`. Plan B = Clerk si blocage, supply chain indépendante).
- [ ] **Retirer le stand-in `userId` de `/api/generate`** quand la session sera disponible :
  - Supprimer le champ `userId` du `GenerateRequestSchema` Zod dans `src/app/api/generate/route.ts`
  - Supprimer la constante `DEFAULT_DEMO_USER_EMAIL` et la résolution top-level await `DEFAULT_USER_ID`
  - Remplacer `body.userId ?? DEFAULT_USER_ID` par `session.user.id` (ou équivalent Better Auth)
  - Renvoyer 401 si pas de session (pas de fallback démo)
- [ ] Basculer le rate-limit `/api/generate` de per-IP à **per-user** (cf. note dans `lessons.md` rate limiting). Garder IP-based en couche complémentaire à seuil plus permissif pour les requêtes non-authentifiées résiduelles.

## Risques connus
- `zod-to-json-schema` peut produire un JSON Schema qu'Anthropic refuse. Plan B : figer le JSON schema à la main (cf. doc 01 §4).
- SSE peut être bloqué par certains proxies Hostinger → tester en prod avant la démo.
- Le rate limit utilise Upstash Redis (free tier OK). Si jamais on dépasse les quotas, basculer sur une LRU mémoire process-locale (suffisant pour un seul nœud).
- Cache slug pools en mémoire = invalidation manuelle (redéploiement) si `slug_words` change.

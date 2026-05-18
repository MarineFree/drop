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

## Voice input (Whisper) — fait
- [x] `/api/transcribe` route + rate-limit (`drop:transcribe`, 30/h/IP) + auth + MIME whitelist
- [x] `VoiceRecorder.tsx` Client Component, 4 phases (idle / recording / transcribing / error+permission_denied), MediaRecorder API, cap 60s + auto-stop
- [x] Intégration dans `GenerateClient.tsx` sous textarea, focus + hint "À partir d'un enregistrement vocal · éditable"
- [ ] **Support Safari/iOS** — MediaRecorder API marche en Chrome desktop ; Safari produit du `audio/mp4`, à valider. Hors scope MVP hackathon.
- [ ] **Rate-limit per-user sur /api/transcribe** — actuellement per-IP comme /api/generate. À convertir en même temps que generate (cf. plus bas).

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

## Phase 2 — Auth (FAIT)
- [x] Implémenter l'auth (**Better Auth** retenu — cf. `lessons.md`). Magic link via Resend, sessions DB Prisma, self-service ouvert.
- [x] **Stand-in `userId` retiré de `/api/generate`** — `getCurrentUser()` depuis Better Auth, 401 si pas de session, `DEFAULT_DEMO_USER_EMAIL` supprimé.
- [x] Wipe complet des demo data (plombier/coach/resto + 2 drops préservés). Repartie vierge avec self-service ouvert.
- [x] `/new` protégé par `requireUser()` + middleware (défense en profondeur, CVE-2025-29927).
- [ ] **Rate limit `/api/generate` — convertir de per-IP à per-user** maintenant que l'auth existe. Garder IP-based en couche complémentaire avec seuil plus permissif pour les non-authentifiés résiduels.
- [ ] **Page `/signin` polish** — UX magic link, gestion erreurs réseau, message clair si Resend down.
- [x] **Onboarding post-signup** — `/onboarding` collecte `business` + `trade` (liste des 9 trades depuis `src/lib/trades.ts`). `/new` redirige vers `/onboarding` si l'un des deux est null. Anti-double-onboarding : si déjà rempli, `/onboarding` redirige vers `/dashboard`. Note : les templates avaient déjà un fallback `?? 'Anonyme'` — pas de "null" littéral observé, mon hypothèse précédente sur le crash visuel était incorrecte.
- [x] **Dashboard patron** — `/dashboard` (liste drops + 4 KPIs globaux) et `/dashboard/d/[id]` (détail + timeline events + ShareBar). Routes protégées via middleware + `requireUser`. Redirect post-signin et post-onboarding pointent désormais vers `/dashboard`. Pas de `(creator)/layout.tsx` (route group rejeté), DashboardHeader importé directement dans chaque page.
- [ ] **Page /settings ou /dashboard/profile** — permettre à un user de modifier `business` et `trade` après l'onboarding initial. Pour l'instant pas d'UI : seul l'API `POST /api/user/profile` permet la modif.
- [ ] **Trade → system prompt IA** — passer `user.trade` (artisans / coaching / restauration / etc.) dans le prompt à Sonnet pour calibrer le ton et le format. Actuellement le champ est stocké mais non utilisé côté génération.
- [ ] **Tracker SCROLL_50, SCROLL_COMPLETE** côté `/d/[slug]` (Client Component "ScrollTracker" qui envoie via `navigator.sendBeacon` aux `/api/events`). Sans ça, `EventsTimeline` montre uniquement des VIEW events — appauvrit la démo.
- [ ] **Tracker CTA_CLICK** côté composant CTA (Client Component qui POST `/api/events` avant le href). Pareil, important pour la démo + utile pour mesurer la conversion réelle.

## Phase 2 — Tracking interactions

- [ ] **Tracker les réponses Quiz/Poll côté serveur**. Actuellement local-state seulement dans `src/components/templates/interactions/{QuizWidget,Poll}.tsx`. À faire :
  - POST `/api/events` (à créer) avec `{ dropId, kind: 'INTERACTION_DONE', metadata: { interactionKind, selectedIdx, correct? } }`
  - Côté `Poll.tsx` : remplacer les `FAKE_PERCENTAGES` prédéterminées par une vraie agrégation depuis `drop_events` (`groupBy` sur `metadata.selectedIdx`)
  - Côté `QuizWidget.tsx` : tracker `correct: boolean` pour mesurer la perf des distracteurs côté patron
  - Anti-spam : utiliser le `visitorHash` (cf. `src/lib/privacy/visitor.ts`) pour dédupliquer les réponses du même visiteur sur 24h

## Polish templates

- [ ] **SectionStat — rendre theme-aware**. Actuellement `text-violet` sur la value, ce qui rend la stat illisible sur les templates à thème violet (QUIZ). Adopter le pattern de `Poll.tsx` qui reçoit un prop `theme` du parent. Idéalement, élargir à tous les section atoms pour permettre une cohérence visuelle automatique.
- [ ] **ANNOUNCEMENT image crop** — fal.ai génère en landscape 16:9 mais le template affiche en portrait aspect-[2/3] md:aspect-[3/4]. Sujets décentrés horizontalement seront amputés. Solutions possibles : (a) image_size adaptatif côté pipeline (portrait_3_4 spécifique pour ANNOUNCEMENT), (b) ajustement du image_prompt généré par Sonnet pour demander "subject centered, vertical composition" sur ce templateType.
- [ ] **Image fal.ai biais culturel** — Flux Schnell n'a pas une bonne banque visuelle pour les sujets culturels spécifiquement français (kebab, charcuterie artisanale, fromages régionaux, etc.). Solutions possibles : (a) enrichir l'image_prompt côté system prompt avec des spécificateurs stylistiques contextuels, (b) upgrade vers Flux Pro pour les sujets food/cultural-specific, (c) pré-générer une banque d'images génériques par templateType en fallback si le prompt rate. Pas urgent, classifié polish démo.

## Phase 2 — Démo

- [ ] **Multi-business demo users** — actuellement tous les drops portent "Plomberie Lyon Centre" via DEFAULT_USER_ID, ce qui rend la démo jury peu crédible pour un ANNOUNCEMENT restaurant ou un QUIZ coaching. Options : (a) seed de 3-4 demo users (plomberie, coaching, restauration, autre), (b) field `business` editable dans le body POST /api/generate qui override le user default.

## Cleanups (non urgents)

- [ ] Retirer `getClientIdentifier` de `src/lib/ratelimit.ts` (exporté mais inutilisé — la route `/api/generate` consomme `parseClientIp` directement). Vérifier qu'aucun autre fichier ne l'importe avant suppression.

## Risques connus
- `zod-to-json-schema` peut produire un JSON Schema qu'Anthropic refuse. Plan B : figer le JSON schema à la main (cf. doc 01 §4).
- SSE peut être bloqué par certains proxies Hostinger → tester en prod avant la démo.
- Le rate limit utilise Upstash Redis (free tier OK). Si jamais on dépasse les quotas, basculer sur une LRU mémoire process-locale (suffisant pour un seul nœud).
- Cache slug pools en mémoire = invalidation manuelle (redéploiement) si `slug_words` change.

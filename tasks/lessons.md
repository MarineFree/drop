# Lessons — Drop

Format : `[YYYY-MM-DD] | ce qui a mal tourné OU décision actée | règle pour l'éviter / la justifier`

---

## Décisions architecturales actées

### [2026-05-14] | Modèle IA par défaut : Sonnet 4.6, pas Opus 4.7

**Décision** : `DROP_GENERATION_MODEL=sonnet` en défaut. Opus 4.7 disponible en opt-in via la même variable.
**Pourquoi** : pour du JSON structuré contraint par Zod + system prompt clair, Sonnet est probablement suffisant et 3-5× moins cher / plus rapide. La doc initiale partait sur Opus par habitude, pas par mesure.
**Règle** : à valider par A/B sur **~50 générations réelles** (les 5 inputs des tests `Docs/01 §8` × 10 runs chacun) avant de figer. Si Sonnet sort un template inadapté ou casse les bornes Zod sur > 5% des runs, on bascule Opus en défaut.
**Trace** : `src/lib/ai/generate.ts` — fallback Sonnet uniquement (pas Haiku, qui dégraderait silencieusement la qualité). Champ `modelUsed` retourné pour tracer l'incidence du fallback.

---

### [2026-05-14] | Hash visiteur : anonyme (pas pseudonyme)

**Décision** : `hashVisitor()` utilise SHA-256(IP | UA | dropId | DAILY_SALT), avec `DAILY_SALT = HMAC(SALT_SEED, today_UTC)`. Rotation quotidienne automatique sans persistance.
**Pourquoi** : selon la doctrine CNIL actuelle, un identifiant dont la corrélation cross-day est impossible peut être considéré comme **anonyme** au sens RGPD — donc pas d'obligation de bandeau de consentement pour ce tracking. C'est ce qui sépare cette implémentation d'un cookie classique (pseudonyme).
**Ce qu'on perd** :
- Impossible de dire « X visiteurs uniques sur 7 jours » — seulement « X uniques aujourd'hui ».
- Impossible de mesurer le retention intra-drop (un visiteur qui revient demain est compté comme nouveau).
- Pas de funnel multi-session.
**Ce qu'on garde** : tout l'intra-day : VIEW, SCROLL_50, SCROLL_COMPLETE, INTERACTION, CTA_CLICK avec déduplication par visiteur dans la journée.
**Règle** : si un jour on veut mesurer le retention, il faudra explicitement passer en pseudonyme (cookie ou hash persistant) → obligation consentement.
**Trace** : `src/lib/privacy/visitor.ts`, var `SALT_SEED` à set en prod (rotation manuelle si compromis).

---

### [2026-05-14] | Auth : reportée à la phase 2 — **Better Auth** retenu

**Décision actée** : pas d'auth pendant le bootstrap. Les routes `(creator)/*` et `/api/generate` sont **temporairement publiques** côté code (rate limit IP-based fait la garde-fou minimal en attendant). **Lib retenue pour la phase 2 : Better Auth**.

**Pourquoi Better Auth** :
- Héritier de facto côté écosystème TS depuis la dépréciation de Lucia v3 (mars 2025).
- Intégration Prisma propre via adapter officiel.
- Sessions DB-backed → cohérent avec notre architecture Postgres + Prisma.
- Plugins idiomatiques pour passkeys, MFA, OAuth providers, organisations — utile si on veut étendre vite.
- API plus moderne, moins de magie implicite que Auth.js v5.

**Risque assumé** : communauté plus jeune que Auth.js v5 → potentielles breaking changes en cours de hackathon. **Plan B en cas de blocage** : bascule **Clerk** (managed, sortie rapide en cas d'urgence, sessions gérées côté provider). Plan B délibérément placé dans un écosystème différent de Better Auth pour éviter le risque de défaillance corrélée — Better Auth et Auth.js v5 partagent désormais la même équipe de maintainers et donc la même supply chain, ce qui les invaliderait simultanément en cas de problème amont.

**Exclusions définitives** :
- ❌ **Lucia v3** — déprécié officiellement en mars 2025 par pilcrowonpaper. Le package npm n'est plus maintenu ; désormais positionné comme ressource pédagogique pour apprendre à implémenter l'auth from scratch, pas comme lib à intégrer.
- ❌ **Build-your-own** — pas le temps en hackathon. Sécurité de l'auth = risque non-trivial qu'on n'absorbe pas en 2 semaines.
- ❌ **Auth.js v5 en Plan B** — partage la même équipe de maintainers que Better Auth → même supply chain, défaillance corrélée. Inutile comme filet de sécurité.

(NB : Clerk était initialement exclu en phase 1 pour coût récurrent. Réintégré comme **Plan B uniquement** car son indépendance de supply chain est précisément la qualité recherchée.)

**Quand** : avant la démo. Acceptable de présenter avec un user pré-seed si l'auth n'est pas prête.
**Trace** : `Docs/05-auth.md` à consulter / produire ; aujourd'hui aucune lecture de session côté routes.

---

### [2026-05-14] | Rate limiting : Upstash sliding window 10/h par IP

**Décision** : `src/lib/ratelimit.ts` — `Ratelimit.slidingWindow(10, '1 h')` sur `/api/generate`, instanciation paresseuse de Redis pour ne pas casser l'import en l'absence des env vars Upstash.
**Pourquoi** : `/api/generate` enchaîne Anthropic + fal.ai → coût ~$0.02/drop. Exposé sans auth pour l'instant, il faut une barrière minimale avant exposition publique.

> **Limite actuelle :** sliding window 10/h par IP. Bloque les utilisateurs derrière NAT/VPN/IPs partagées, et inefficace contre attaquants qui rotatent les IPs. **À basculer en per-user dès que l'auth est en place**, en gardant l'IP-based comme couche complémentaire avec un seuil plus permissif (ex: 30/h) pour les requêtes non-authentifiées.

**Trace** : `src/lib/ratelimit.ts`, branché dans `src/app/api/generate/route.ts` (mord avant le 501 actuel).

---

### [2026-05-14] | Tests : pas de Vitest/Playwright en phase 1

**Décision** : aucun framework de test installé pendant le bootstrap. Vérification = `pnpm typecheck` + tests manuels.
**Pourquoi** : surface fonctionnelle minimale, itération rapide sur le prompt système et les templates. Un test runner ajoute du setup et de la friction sans payoff visible avant que le pipeline ne tourne.
**Dette assumée** :
- Pas de garantie automatique que les 5 inputs de référence (`Docs/01 §8`) produisent le bon `template_type`.
- Pas de regression test sur les bornes Zod.
- Pas de e2e sur le flow création → page publique.
**Quand on revient** : dès que les 5 templates sont stables. Cible minimale = **Vitest** pour les helpers purs (`extractDropMetadata`, `hashVisitor`, `generateSlugCandidate`) + **un script `scripts/test-prompts.ts`** qui appelle l'API Anthropic en CI manuelle sur les 5 inputs de référence.
**Règle** : à chaque PR qui touche `src/lib/ai/prompts.ts`, lancer ce script avant merge.

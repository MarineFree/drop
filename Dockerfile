# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# Drop — image Docker prod, optimisée Dokploy / Hostinger.
#
# Trois étages :
#   1. deps     → installation dépendances pnpm (cacheable)
#   2. builder  → prisma generate + next build (standalone)
#   3. runner   → image runtime minimale (~150 MB) avec user non-root
#
# Hypothèses :
# - `next.config.ts` a `output: 'standalone'` (chemin standard /app/.next/standalone)
# - Le seul runtime fichier persistant attendu = `UPLOAD_DIR` (volume Dokploy).
# ─────────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=20-alpine

# ── 1. deps ─────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# libc6-compat : nécessaire pour les natifs (lightningcss, etc.)
# openssl : Prisma 5 link contre libssl runtime → alpine 3.18+ ship openssl 3
#   et le binary engine `linux-musl-openssl-3.0.x` (cf. binaryTargets de
#   prisma/schema.prisma) en dépend.
RUN apk add --no-cache libc6-compat openssl

# corepack pour respecter `packageManager` du package.json. `enable` est sûr,
# `prepare --activate` télécharge la version exacte requise sans prompt.
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# pnpm n'a besoin que de ces fichiers pour résoudre les deps. Cache layer.
COPY package.json pnpm-lock.yaml ./
# Le `postinstall` (= prisma generate) a besoin du schema. On le copie avant.
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

# ── 2. builder ──────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Récupération node_modules (déjà compilés) + sources.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Le build Next 15 sous Node 20 alloue beaucoup à Webpack/Turbopack. 2 GB heap
# suffit ; on l'explicite pour éviter les OOM silencieux sur VPS 4 GB RAM.
ENV NODE_OPTIONS=--max-old-space-size=2048
ENV NEXT_TELEMETRY_DISABLED=1

# Next inline les `NEXT_PUBLIC_*` au build → la valeur ici finit baked dans le
# JS client. Si Dokploy ne passe pas de build arg explicite, on tombe sur la
# valeur prod par défaut (getdrop.cloud). Le côté client lit en fait
# `window.location.origin` au runtime (cf. src/lib/auth-client.ts), donc cette
# valeur de fallback n'est plus critique — mais on garde une URL valide pour
# éviter les bugs annexes (Chrome bloque `.local`, casse les fetch).
ARG NEXT_PUBLIC_BASE_URL=https://getdrop.cloud
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}

RUN pnpm build

# ── 3. runner ───────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Volume persistant Dokploy. Doit matcher le mount déclaré dans la GUI.
ENV UPLOAD_DIR=/data/uploads

# openssl runtime : requis par le binary engine Prisma `linux-musl-openssl-3.0.x`.
# Sans ça : `libssl.so.3: cannot open shared object file` au premier query.
RUN apk add --no-cache openssl

# User non-root — bonne pratique sécurité + alignement avec mounts Dokploy.
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

# Standalone : Next embarque tout ce qui est traçable au runtime dans
# `.next/standalone/` (server.js + node_modules traced incluant Prisma client
# et binary engines). On copie en plus `.next/static` (assets servis par Next)
# et `public/`. Le schema Prisma est utile pour `prisma db push` / `seed` lancés
# manuellement depuis le conteneur (cf. DEPLOY.md §5).
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Pas de dossier `public/` dans ce repo (zéro asset statique externe, tout est
# inline dans `src/app/globals.css` ou en data: URI). Ne pas tenter de COPY.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Le bin prisma CLI + tsx sont utiles pour exécuter `prisma db push` et
# `tsx prisma/seed.ts` depuis le terminal Dokploy (bootstrap initial).
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Volume mount target — créé en avance avec les bonnes permissions pour que
# Dokploy puisse monter dessus sans erreur EACCES.
RUN mkdir -p /data/uploads && chown -R nextjs:nodejs /data

USER nextjs

EXPOSE 3000

# Le serveur standalone Next écrit sur PORT + HOSTNAME du process.env.
CMD ["node", "server.js"]

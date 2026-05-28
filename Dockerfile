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

# Pour compiler natifs (lightningcss, etc.) côté alpine.
RUN apk add --no-cache libc6-compat

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

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Récupération node_modules (déjà compilés) + sources.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Le build Next 15 sous Node 20 alloue beaucoup à Webpack/Turbopack. 2 GB heap
# suffit ; on l'explicite pour éviter les OOM silencieux sur VPS 4 GB RAM.
ENV NODE_OPTIONS=--max-old-space-size=2048
ENV NEXT_TELEMETRY_DISABLED=1

# Variables MOCK pour le build. Aucune n'est lue au build par notre code (toutes
# les routes lisent process.env au runtime), mais Next inline les valeurs
# `NEXT_PUBLIC_*` au build → on doit avoir au minimum une URL valide qui sera
# remplacée par le runtime via env Dokploy.
ARG NEXT_PUBLIC_BASE_URL=https://drop.local
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

# User non-root — bonne pratique sécurité + alignement avec mounts Dokploy.
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

# Standalone : Next embarque uniquement les deps nécessaires au runtime dans
# `.next/standalone/`. On copie aussi `.next/static` (servi par Next), `public`,
# et le prisma client générique généré dans node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Prisma : le runtime Next a besoin du client généré ET du schema pour les
# requêtes raw / les introspections éventuelles.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Volume mount target — créé en avance avec les bonnes permissions pour que
# Dokploy puisse monter dessus sans erreur EACCES.
RUN mkdir -p /data/uploads && chown -R nextjs:nodejs /data

USER nextjs

EXPOSE 3000

# Le serveur standalone Next écrit sur PORT + HOSTNAME du process.env.
CMD ["node", "server.js"]

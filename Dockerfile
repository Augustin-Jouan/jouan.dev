# syntax=docker/dockerfile:1
#
# Image de production du site (apps/web), en trois étapes :
#   deps    installe les dépendances du workspace (cache tant que le lockfile ne bouge pas)
#   build   compile le site en mode standalone
#   runner  ne garde que le serveur et les fichiers qu'il sert
#
# Construction locale, depuis la racine du dépôt :
#   docker build -t jouan-dev .
#   docker run --rm -p 3000:3000 --env-file apps/web/.env.local jouan-dev

ARG NODE_VERSION=22
ARG PNPM_VERSION=10.34.6

FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
# Lue au build par data/site.ts : elle est figée dans les pages statiques
# (canonical, sitemap, JSON-LD). Un build avec une URL locale échoue exprès.
ARG SITE_URL=https://jouan.dev
ENV SITE_URL=${SITE_URL}
# Idem pour la mesure d'audience : le layout est statique, l'identifiant doit
# être connu au build. Vide, le script n'est simplement pas injecté.
ARG UMAMI_WEBSITE_ID=
ENV UMAMI_WEBSITE_ID=${UMAMI_WEBSITE_ID}
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web build

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Le serveur tourne sans privilèges : un compte dédié, sans shell.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

# En monorepo, le standalone range le serveur sous le chemin de l'app
# (apps/web/server.js) et ne copie ni `public` ni `.next/static` : on les
# ajoute à côté, comme le demande la doc Next.
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "apps/web/server.js"]

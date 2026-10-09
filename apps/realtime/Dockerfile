# syntax=docker/dockerfile:1
#
# Image du service temps réel (apps/realtime), en deux étapes :
#   build   installe les dépendances du service et produit un seul fichier (esbuild)
#   runner  ne garde que ce fichier : ni pnpm ni node_modules
#
# Construction locale, depuis la racine du dépôt :
#   docker build -f apps/realtime/Dockerfile -t jouan-dev-realtime .
#   docker run --rm -p 3001:3001 -e ORIGINES_AUTORISEES=http://localhost:3000 jouan-dev-realtime

ARG NODE_VERSION=22
ARG PNPM_VERSION=10.34.6

FROM node:${NODE_VERSION}-alpine AS build
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
# Tous les package.json du workspace : le lockfile les référence tous.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/demo-marches/package.json apps/demo-marches/
COPY apps/realtime/package.json apps/realtime/
RUN pnpm install --frozen-lockfile --filter realtime
COPY apps/realtime apps/realtime
RUN pnpm --filter realtime build

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOTE=0.0.0.0

# Le service tourne sans privilèges : un compte dédié, sans shell.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs direct

COPY --from=build --chown=direct:nodejs /app/apps/realtime/dist ./dist

USER direct
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3001/sante || exit 1

CMD ["node", "dist/index.cjs"]

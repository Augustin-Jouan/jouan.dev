# syntax=docker/dockerfile:1
#
# Image de production du site, en trois étapes :
#   deps    installe les dépendances (mise en cache tant que le lockfile ne bouge pas)
#   build   compile le site en mode standalone
#   runner  ne garde que le serveur et les fichiers qu'il sert
#
# Construction locale :
#   docker build -t site-vitrine .
#   docker run --rm -p 3000:3000 --env-file .env.local site-vitrine

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Lue au build par data/site.ts : elle est figée dans les pages statiques
# (canonical, sitemap, JSON-LD). Un build avec une URL locale échoue exprès.
ARG SITE_URL=https://www.exemple.fr
ENV SITE_URL=${SITE_URL}
# Idem pour la mesure d'audience : le layout est statique, l'identifiant doit
# être connu au build. Vide, le script n'est simplement pas injecté.
ARG UMAMI_WEBSITE_ID=
ENV UMAMI_WEBSITE_ID=${UMAMI_WEBSITE_ID}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Le serveur tourne sans privilèges : un compte dédié, sans shell.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

# Le serveur standalone ne copie ni `public` ni `.next/static` : on les
# ajoute à la main, comme le demande la doc Next.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]

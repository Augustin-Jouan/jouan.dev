#!/bin/sh
# Démarrage du conteneur : applique les migrations Prisma si une base est
# configurée, puis lance le serveur Next. Une migration en échec arrête le
# conteneur (Coolify le signale) plutôt que de servir un schéma incohérent.
set -e
if [ -n "$DATABASE_URL" ]; then
  (cd /app/migrateur && ./node_modules/.bin/prisma migrate deploy)
fi
exec node apps/web/server.js

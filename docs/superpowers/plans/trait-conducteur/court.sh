#!/usr/bin/env bash
# Fiches du plan « trait-conducteur » : lance une commande avec l'environnement des tests
# (base locale de développement, adresse du service temps réel), garde le journal
# complet dans un fichier et n'affiche que sa fin et le code de sortie.
#
# Usage, depuis la racine du dépôt :
#   ./docs/superpowers/plans/trait-conducteur/court.sh pnpm test
#   ./docs/superpowers/plans/trait-conducteur/court.sh bash -c 'pnpm build && pnpm --filter web verifier-taille-defilement'
# LIGNES=60 ./docs/superpowers/plans/trait-conducteur/court.sh … pour voir plus de lignes.
#
# Les valeurs de .env.local ne sont jamais affichées.
principal="$(git worktree list --porcelain | sed -n '1s/^worktree //p')"
if [ -f "$principal/apps/web/.env.local" ]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^DATABASE_URL(_TEST)?=' "$principal/apps/web/.env.local")
  set +a
fi
export NEXT_PUBLIC_DIRECT_URL="${NEXT_PUBLIC_DIRECT_URL:-ws://127.0.0.1:3201/direct}"
# Navigateurs de Playwright : ceux de l'utilisateur, même si le bac à sable de
# l'éditeur pointe ailleurs (sinon « Executable doesn't exist »).
if [ -d "$HOME/.cache/ms-playwright" ]; then
  export PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"
fi

journal="$(mktemp "${TMPDIR:-/tmp}/trait-XXXXXX.log")"
"$@" > "$journal" 2>&1
code=$?
tail -n "${LIGNES:-30}" "$journal"
echo "→ code de sortie $code (journal complet : $journal)"
exit "$code"

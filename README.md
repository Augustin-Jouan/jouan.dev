# jouan.dev

Portfolio d'Augustin Jouan, développeur full stack indépendant. Le site
lui-même sert de démonstration : page d'accueil « Atelier clair », intro
WebGL « goutte d'encre » écrite à la main, budgets de performance vérifiés
en CI.

Conception : `docs/superpowers/specs/` · Plans : `docs/superpowers/plans/`.

## Structure

Monorepo pnpm :

- `apps/web` — le site (Next.js 16, React 19, TypeScript, Tailwind 4).
  - `data/` — tout le contenu (accueil, études de cas, identité, mentions
    légales).
  - `lib/encre/` — l'intro : décision et chronologie (pures, testées),
    shader et moteur WebGL2.
  - `e2e/` — tests Playwright.
- `apps/demo-marches` — la démo « Suivi de marchés » des études de cas (Vite, React,
  Tailwind) : règles de calcul pures dans `src/domaine/`, chantier fictif dans
  `src/donnees/`. Construite dans `apps/web/public/demo/suivi-de-marches/` par
  `pnpm build` ; `pnpm dev:demo` pour la développer seule.

## Commandes

Depuis la racine (Node 22, pnpm 10 — `npm install -g pnpm@10.34.6`) :

```bash
pnpm install
pnpm dev                              # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm e2e                # tests de bout en bout (serveur de production)
pnpm --filter web lighthouse          # budgets de performance
pnpm --filter web verifier-taille-encre
pnpm --filter web verifier-taille-demo
pnpm --filter web capturer-apercu-demo   # après un changement visible de la démo
```

Pour voir la démo dans la page des études de cas avec `pnpm dev`, construire d'abord la démo : `pnpm --filter demo-marches build` (sinon l'iframe affiche une 404).

Les tests de bout en bout démarrent un faux serveur SMTP local (port 2525).

## Base de données

Les liens personnalisés et leurs visites sont dans Postgres (Prisma 7).

```bash
docker compose -f compose.dev.yml up -d              # Postgres sur le port 5433 (bases jouan et jouan_test)
cp apps/web/.env.example apps/web/.env.local         # puis renseigner ADMIN_EMPREINTE et ADMIN_SECRET
pnpm --filter web migrer                             # applique les migrations (DATABASE_URL)
DATABASE_URL_TEST=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm --filter web exec vitest run lib/liens/depot.integration.test.ts
```

Les tests d'intégration sont ignorés sans `DATABASE_URL_TEST` ; la base de test doit être migrée (`DATABASE_URL=…/jouan_test pnpm --filter web migrer`). Le client est généré par `pnpm --filter web generer-client` (lancé automatiquement par `dev`, `build`, `typecheck` et `test`, sans base).

En production : ressource Postgres Coolify, `DATABASE_URL`, migrations appliquées au démarrage du conteneur.

## Déploiement

Comme les sites vitrines (voir `docs/deploiement-site.md`) : la CI construit
l'image `ghcr.io/augustin-jouan/jouan.dev`, Coolify la tire.

- Prévisualisation : `https://portfolio.jouan.dev`.
- `SITE_URL` vaut déjà l'URL finale `https://jouan.dev` (figée au build).
- Avant la bascule sur `jouan.dev` : compléter les mentions légales
  (`apps/web/data/legal.ts`), décommenter `pnpm verifier-placeholders` dans
  la CI, puis domaine nu + redirection `www` → domaine nu dans Coolify.

Liens personnalisés (accueil `/?pour=<jeton>`) : ils demandent une base.

- Créer une ressource Postgres dans Coolify, puis définir sur le site :
  - `DATABASE_URL` : l'URL de connexion de cette base ;
  - `ADMIN_EMPREINTE` : l'empreinte du mot de passe d'administration,
    générée par `pnpm --filter web empreinte-mot-de-passe` ;
  - `ADMIN_SECRET` : le secret de signature de session, généré par
    `openssl rand -base64 48`.
- Les migrations Prisma sont appliquées au démarrage du conteneur
  (`docker/demarrer.sh`) quand `DATABASE_URL` est défini ; sans elle, le site
  démarre quand même, sans migration. Une migration en échec arrête le conteneur.
- Limite de connexion admin : après 5 échecs en 15 minutes, l'administration
  est bloquée pour tout le monde. Un redémarrage du conteneur remet le
  compteur à zéro.
- `pnpm --filter web semer-lien-exemple` crée le lien `/?pour=exemple-0000`
  mesuré par Lighthouse en CI (base migrée et `DATABASE_URL` requises).
- `pnpm --filter web verifier-accueil-statique`, après `pnpm build`, vérifie
  que l'accueil `/` reste prérendu (statique).

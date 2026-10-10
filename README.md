# jouan.dev

Portfolio d'Augustin Jouan, développeur full stack indépendant. Le site
lui-même sert de démonstration : page d'accueil sombre (charte « Nuit mauve »), intro
WebGL « goutte de lumière » écrite à la main, budgets de performance vérifiés
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

Lighthouse (`apps/web/lighthouserc.json`) : accessibilité, CLS et poids des scripts bloquent la CI ; score de performance et LCP ne font qu'avertir, car ils dépendent trop de la vitesse du runner GitHub (un runner lent les fait échouer sans changement du code). À surveiller dans le journal de la CI.

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

## Charte

Charte « Nuit mauve » (spec : `docs/superpowers/specs/2026-10-09-charte-design.md`) :
fond nuit `#2a2127`, texte papier, accent pêche, alerte corail, « en direct » sauge.

- Deux étages dans `apps/web/app/globals.css` : les teintes brutes (`--teinte-*`, sur
  `:root`, sans classe Tailwind) et les rôles (`@theme` : `fond`, `surface`, `texte`,
  `texte-doux`, `accent`, `sur-accent`, `alerte`, `vivant`, `trait`, `trait-fort`,
  `lueur`, `lueur-chaude`, `goutte`). La palette par défaut de Tailwind est retirée.
- Les composants n'emploient **que des rôles** (`bg-fond`, `text-texte-doux`…), sans
  opacité, et jamais `text-vivant` : `lib/charte-classes.test.ts` refuse le reste.
- Le code qui ne lit pas le CSS (intro WebGL, vignettes, curseurs, scène 3D) importe
  `apps/web/lib/charte.ts`. Pour changer une couleur : la modifier dans `globals.css`
  **et** `lib/charte.ts` ; `lib/charte.test.ts` vérifie qu'ils concordent et que chaque
  contraste reste suffisant ; `e2e/accessibilite.spec.ts` passe chaque page à axe-core.
- La démo de l'étude de cas est intégrée en thème sombre (`?theme=sombre`).

## Easter eggs

Pour les curieux (spec : `docs/superpowers/specs/2026-10-09-easter-eggs-design.md`) :

- `curl -L jouan.dev` : le CV en couleurs, en 80 colonnes. `proxy.ts` réécrit `/` vers `/cv.ansi`
  pour les clients en ligne de commande (`curl`, `Wget`, `HTTPie`, `xh`) ; `/cv.txt` donne le même
  CV sans couleur. Les couleurs sont les codes 256 couleurs les plus proches des rôles de la charte
  (`lib/cv/couleurs-terminal.ts`).
- `/api/me` : le même CV au format JSON Resume. Les trois routes sont pré-rendues au build, à
  partir des données du site (`lib/cv/modele.ts`, `data/competences.ts`).
- Cmd+K (Ctrl+K), ou « ⌘K pour naviguer » dans le pied de page : une palette de commandes chargée
  au premier appel (`components/commandes/`, 8 Ko au plus, `verifier-taille-commandes`). Pour
  ajouter une commande : une entrée dans `data/commandes.ts`.
- Indices : le pied de page, la console du navigateur et un commentaire en tête de la page.

Le raccourci et les indices ajoutent environ 1 Ko au JavaScript de chaque page : le budget des
scripts de l'accueil (`lighthouserc.json`) est passé de 160 à 165 Ko pour eux.

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

Temps réel (compteur et curseurs de l'accueil) : service `apps/realtime` (Hono, WebSocket).

- En local : `pnpm dev:direct` (port 3001, `ORIGINES_AUTORISEES=http://localhost:3000` à définir), puis le site construit ou lancé avec `NEXT_PUBLIC_DIRECT_URL=ws://localhost:3001/direct`. Sans cette variable, l'accueil ne charge ni ne connecte rien.
- Image : `ghcr.io/augustin-jouan/jouan.dev-realtime`, construite par la CI comme celle du site.
- Origines autorisées (`ORIGINES_AUTORISEES`, séparées par des virgules) :
  - prévisualisation : `https://portfolio.jouan.dev` ;
  - production, à la bascule sur le domaine nu : ajouter `https://jouan.dev` ;
  - local : `http://localhost:3000` ; e2e et Lighthouse : posées par la CI.

  Toute origine HTTPS servant le site doit figurer dans la liste de la ressource Coolify.
- Exposition : uniquement par le proxy de Coolify, en HTTPS ; le port 3001 n'est pas publié sur l'hôte (sinon la dernière entrée de `X-Forwarded-For` ne serait plus fiable). Une seule réplique : un redéploiement déconnecte les visiteurs quelques secondes.
- Mise en service, dans cet ordre :
  1. entrée DNS `direct.portfolio.jouan.dev` vers le VPS ;
  2. ressource Coolify depuis l'image du service, port 3001, domaine `https://direct.portfolio.jouan.dev`, variable `ORIGINES_AUTORISEES` ; attendre qu'elle soit en ligne et saine (`/sante`) ;
  3. variable de dépôt GitHub `DIRECT_URL=wss://direct.portfolio.jouan.dev/direct` (figée au build du site : tant qu'elle est vide, le site ne tente aucune connexion) ;
  4. secret GitHub `COOLIFY_WEBHOOK_URL_DIRECT` (webhook de la ressource du service).
- Limites : 300 connexions au total, 5 par adresse IP (`CONNEXIONS_PAR_IP`), messages de 128 octets et 40 par seconde au plus. Aucune IP ni position n'est journalisée.

Coulisses (`/coulisses`) : architecture du site mesurée en direct, vue 3D à la demande, preuves de qualité du build.

- Mesures : `GET /api/coulisses/mesure` (temps d'un `SELECT 1`, 60 requêtes par minute et par IP, appels d'un autre site refusés) et WebSocket d'écho `/sonde` du service temps réel (hors de la salle de l'accueil, 2 connexions par IP ; en IPv6, une « IP » est un préfixe /64). Rien n'est stocké. Pour les tests de bout en bout seulement : `MESURE_MAX_PAR_IP` (site) et `SONDE_CONNEXIONS_PAR_IP` (service).
- Dernier déploiement : la CI écrit `apps/web/build-info.json` (commit, date, nombre de tests, notes Lighthouse, poids JS de l'accueil) dans le job `image`, avant le build Docker. En local, sans ce fichier, la section affiche « Build local : pas de mesures CI ». La page reste statique (`pnpm --filter web verifier-accueil-statique`).
- Le titre du commit déployé devient public : la règle d'anonymat des messages de commit s'applique pleinement, et la CI remplace par « Mise à jour du site » un titre qui contient une adresse e-mail ou IP.
- Budgets : `/coulisses` est mesurée par Lighthouse comme les autres pages ; la vue 3D (Three.js, chargée au clic) reste sous 180 Ko compressés (`pnpm --filter web verifier-taille-3d`).
- Rien de nouveau à configurer dans Coolify.

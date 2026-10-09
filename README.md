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

## Déploiement

Comme les sites vitrines (voir `docs/deploiement-site.md`) : la CI construit
l'image `ghcr.io/augustin-jouan/jouan.dev`, Coolify la tire.

- Prévisualisation : `https://portfolio.jouan.dev`.
- `SITE_URL` vaut déjà l'URL finale `https://jouan.dev` (figée au build).
- Avant la bascule sur `jouan.dev` : compléter les mentions légales
  (`apps/web/data/legal.ts`), décommenter `pnpm verifier-placeholders` dans
  la CI, puis domaine nu + redirection `www` → domaine nu dans Coolify.

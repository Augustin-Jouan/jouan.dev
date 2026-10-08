# site-vitrine-template

Châssis de site vitrine : tout ce qui est invisible et identique d'un site
à l'autre (formulaire de contact, SEO, pages légales, sécurité, Docker, CI).
**Aucun design** : chaque site repart d'une page blanche.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Vitest.

## Démarrer un nouveau site

1. Sur GitHub : **Use this template** → nouveau dépôt. Puis `git clone`,
   `npm ci`, `npm run dev`.
2. Renommer : `name` dans `package.json` (et dans `package-lock.json`, deux
   occurrences), titre de ce README. **Supprimer `app/vestiges.test.ts`**
   (il interdit des mots du site d'origine).
3. Remplir `data/site.ts` (nom, description), `data/contact.ts` (adresse
   structurée, téléphone, email ; ajouter `geo` avec les coordonnées
   relevées sur adresse.data.gouv.fr — sans lui, le JSON-LD n'a pas de
   position), `data/navigation.ts`, `data/legal.ts`
   (capital, RCS/RM, TVA, directeur de publication, médiateur ; `assurance`
   uniquement pour un artisan du bâtiment). Refonte d'un site existant :
   lister les anciennes URL dans `data/redirections.ts`. Vérifier
   `hebergeur` et `transfertHorsUe` dans `data/legal.ts` si le site n'est
   pas hébergé sur le VPS OVH.
4. Dans `app/layout.tsx`, passer le type schema.org à `LocalBusinessJsonLd`
   (`<LocalBusinessJsonLd type="Restaurant" />`, liste sur
   schema.org/LocalBusiness).
5. Remplacer `app/icon.svg` par le logo ; adapter `app/opengraph-image.tsx`.
6. Dans `.github/workflows/ci.yml`, **décommenter** `npm run
   verifier-placeholders` : la CI bloquera tant qu'un `[…]` reste dans
   `data/` ou `app/`. `npm run verifier-placeholders` en local pour la
   liste. Une ligne qui doit garder des crochets se marque
   `// placeholder-ok`.
7. Créer `.env.local` depuis `.env.example`. Tester le SMTP :
   `node --env-file=.env.local scripts/verifier-smtp.mjs`.
8. Design : tokens dans `app/globals.css` (`@theme`), police dans
   `app/layout.tsx`, puis `app/page.tsx` et les pages du site. Ajouter
   chaque page à `data/navigation.ts` et `app/sitemap.ts`. Passer chaque
   image par `node scripts/optimiser-images.mjs <fichier>`.
9. Mise en ligne, en suivant [`docs/deploiement-site.md`](docs/deploiement-site.md) :
   dans `.github/workflows/ci.yml`, changer `SITE_URL` et `IMAGE`
   (`ghcr.io/augustin-jouan/<nom-en-minuscules>`) ; entrée DNS ; ressource
   Coolify de type *Docker Image* (port 3000, variables SMTP en runtime) ;
   secrets GitHub `COOLIFY_WEBHOOK_URL` et `COOLIFY_TOKEN` pour le
   redéploiement automatique ; variable `UMAMI_WEBSITE_ID` ; à la bascule,
   Search Console et fiche Google Business.

## Ce que contient le châssis

| Brique | Où | Pourquoi |
| --- | --- | --- |
| Formulaire de contact | `app/contact/`, `components/contact/`, `lib/email.ts`, `lib/rate-limit.ts` | Honeypot, bornes de saisie, 5 envois/h/IP, envoi SMTP, message d'échec avec le code SMTP |
| Headers de sécurité | `next.config.ts` | CSP stricte (Umami autorisé), HSTS, `X-Frame-Options`, `Permissions-Policy`, pas de `X-Powered-By` |
| SEO | `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx`, `components/shared/*JsonLd.tsx` | Canonical par page, sitemap, vignette de partage, données structurées |
| Pages légales | `app/mentions-legales/`, `app/politique-de-confidentialite/`, `data/legal.ts` | Rubriques obligatoires ; les `[À compléter]` s'affichent en italique |
| Mesure d'audience | `components/shared/Umami.tsx` | Sans cookie, exemptée de consentement CNIL |
| Accessibilité | `components/layout/SkipLink.tsx`, `aria-current` dans le header | Lien d'évitement, page courante annoncée |
| Docker | `Dockerfile`, `.dockerignore` | Image standalone ~350 Mo, non-root, healthcheck ; désactivé sur Vercel ; `next/font` télécharge Inter au build : le build Docker a besoin du réseau |
| CI / déploiement | `.github/workflows/ci.yml`, `.github/dependabot.yml`, `docs/deploiement-site.md` | Lint, types, tests, build ; sur `main`, image publiée sur GHCR et webhook Coolify (le VPS ne compile rien) ; mises à jour hebdo groupées |
| Scripts | `scripts/` | `optimiser-images` (2048 px, JPEG 82), `verifier-smtp`, `verifier-placeholders` |

## Variables d'environnement

Voir `.env.example`. `SITE_URL` et `UMAMI_WEBSITE_ID` sont lues **au build**
(pages statiques) : elles sont fournies à la construction de l'image par le
workflow (`env.SITE_URL` et la variable de dépôt `UMAMI_WEBSITE_ID`), pas
dans Coolify, où seules les variables SMTP sont définies. Un build de
production avec une `SITE_URL` locale ou en `http://` échoue volontairement.

## Envoi des mails

Le formulaire envoie depuis `postmaster@jouan.dev` (boîte OVH, DKIM actif)
vers la boîte du client, avec le visiteur en `Reply-To`. Cette boîte sert à
tous les sites : ne l'utiliser que pour les notifications au client, jamais
pour des mails à ses propres clients (confirmations, newsletters), qui
doivent partir du domaine du client.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm test` / `npm run test:watch` | tests |
| `npm run lint` · `npx tsc --noEmit` | lint, types |
| `npm run build && npm start` | production locale |
| `npm run verifier-placeholders` | placeholders restants dans `data/` et `app/` |
| `node --env-file=.env.local scripts/verifier-smtp.mjs` | test de connexion SMTP |
| `node scripts/optimiser-images.mjs [fichier]` | réduit les images de `public/images` |
| `docker build -t site-vitrine . && docker run --rm -p 3000:3000 --env-file .env.local site-vitrine` | image de production |

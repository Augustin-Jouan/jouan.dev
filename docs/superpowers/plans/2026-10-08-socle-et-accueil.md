# Socle et page d'accueil du portfolio — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer le dépôt (copie du template de site vitrine) en monorepo pnpm et y construire la page d'accueil « Atelier clair » du portfolio, avec son intro WebGL « goutte d'encre », ses replis, ses tests et ses budgets de performance vérifiés en CI.

**Architecture:** Le site Next.js 16 déménage dans `apps/web`. La page d'accueil est rendue côté serveur à partir de données typées (`data/accueil.ts`). Le fond est un composant client (`IntroEncre`) qui affiche d'abord un halo CSS, puis importe dynamiquement un moteur WebGL2 sans bibliothèque (`lib/encre/`). La logique de ce moteur (décision, chronologie) est pure et testée à part. Playwright vérifie les parcours et les replis, Lighthouse CI les budgets.

**Tech Stack:** pnpm 10 (workspaces), Next.js 16.3 (App Router), React 19.2, TypeScript 5, Tailwind 4, Vitest 4 + Testing Library, Playwright, Lighthouse CI, WebGL2 / GLSL ES 3.0, Docker, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-08-socle-et-accueil-design.md`

## Global Constraints

- Node 22 ; pnpm **10.34.6** épinglé par `packageManager` dans le `package.json` racine.
- Next.js 16.3, React 19.2.4, Tailwind 4 : versions du châssis, ne pas les changer. **Avant d'écrire du code Next, lire le guide concerné dans `apps/web/node_modules/next/dist/docs/`** (cf. `AGENTS.md`) : cette version diffère de ce que l'on croit savoir.
- Tout en français : textes, commentaires, noms de fonctions et de variables du domaine, messages de commit.
- **Confidentialité** : aucun nom de client, de projet client ni d'employeur dans le code, les textes, les tests ou les messages de commit. Les réalisations restent anonymisées (« entreprise du BTP », « artisan électricien-plombier »).
- **Ne jamais modifier un autre dépôt** que celui-ci (en particulier le template de site vitrine dont il est issu).
- Couleurs (jetons Tailwind) : `papier #f3efe7`, `encre #1b1a17`, `encre-douce #5b574f`, `brique #c84a1f` (grands textes uniquement), `braise #e0582b`, `braise-claire #ef9c62`, `terre #8a5a3c`, `trait #c9c1b2`.
- Polices : Instrument Serif (titres) et Inter (texte) via `next/font/google`.
- Intro : ≈ 1,5 s — étalement 0 → 450 ms, nom 450 → 800 ms, retrait 800 → 1500 ms ; halo final à 80 % de la largeur, 24 % de la hauteur, rayon 0,32 hauteur d'écran.
- Intro en **WebGL2 écrit à la main, sans bibliothèque 3D** ; moteur < 10 Ko compressés.
- Budgets : Lighthouse mobile performance ≥ 95 ; LCP < 1,8 s (simulation mobile) ; CLS < 0,05 ; JS total ≤ 120 Ko compressés (≈ 110 Ko + intro).
- Pas de service `apps/realtime` dans ce sous-projet.
- `SITE_URL` = `https://jouan.dev` (URL finale, figée au build) ; prévisualisation servie sur `https://portfolio.jouan.dev`.
- `verifier-placeholders` reste **commenté** dans la CI (mentions légales incomplètes tant que l'EI n'a pas fourni ses informations).
- Commits ciblés : ne `git add` que les fichiers de la tâche, nommés un par un.

## Review Focus

1. **Rechargement en milieu de page** (navigateur qui restaure le défilement) : l'intro ne doit pas se jouer, l'accueil affiche directement le halo animé. → test `defilee` dans la tâche 7.
2. **Écran portrait ou rotation pendant l'intro** (téléphone 390 × 844) : l'encre doit couvrir les quatre coins de l'écran à la fin de l'étalement, quel que soit le format. → test `rayonCouverture` dans la tâche 7.
3. **Navigation au clavier pendant l'intro** : la touche Tab arrête l'intro et le focus arrive sur le lien d'évitement, sans rester piégé sous l'encre. → test Playwright dans la tâche 10.
4. **Petit écran (320 px de large)** : aucun défilement horizontal, le titre ne déborde pas. → test Playwright dans la tâche 10.
5. **Liens de l'en-tête depuis une page légale** (`/mentions-legales` → « Offre ») : retour à l'accueil, sur la bonne section. → test Playwright dans la tâche 10.

---

## Structure des fichiers

```
jouan.dev/
├── CLAUDE.md                      # → @apps/web/AGENTS.md
├── README.md                      # réécrit (tâche 12)
├── package.json                   # racine du workspace (scripts globaux)
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── Dockerfile / .dockerignore     # adaptés au workspace
├── .github/workflows/ci.yml       # pnpm, jobs e2e + Lighthouse
├── docs/
└── apps/web/                      # contenu actuel du dépôt, déplacé
    ├── AGENTS.md
    ├── app/
    │   ├── globals.css            # jetons Atelier clair, grain, halo, fond
    │   ├── layout.tsx             # polices, PersonJsonLd
    │   ├── page.tsx               # page d'accueil (blocs)
    │   ├── opengraph-image.tsx    # vignette aux couleurs du site
    │   ├── contact/               # action serveur (messages), page
    │   ├── mentions-legales/      # version EI
    │   └── politique-de-confidentialite/
    ├── components/
    │   ├── accueil/
    │   │   ├── Section.tsx        # en-tête commun des sections (surtitre, titre)
    │   │   ├── Accroche.tsx  Offre.tsx  Realisations.tsx
    │   │   ├── Methode.tsx  Parcours.tsx  SectionContact.tsx
    │   │   ├── HaloCss.tsx        # halo de repli, CSS pur
    │   │   └── IntroEncre.tsx     # client : décision, moteur, saut, replis
    │   ├── contact/ContactForm.tsx
    │   ├── layout/Header.tsx  Footer.tsx  SkipLink.tsx
    │   └── shared/PersonJsonLd.tsx  Umami.tsx  FaqJsonLd.tsx
    ├── data/
    │   ├── accueil.ts             # contenu de l'accueil (offre, réalisations…)
    │   ├── site.ts  contact.ts  navigation.ts  legal.ts  redirections.ts
    ├── lib/encre/
    │   ├── decision.ts            # pur : quel fond afficher, drapeau « déjà vue »
    │   ├── chronologie.ts         # pur : état de l'encre à l'instant t, halo
    │   ├── shader.ts              # sources GLSL
    │   └── moteur.ts              # WebGL2 : contexte, boucle, événements
    ├── e2e/                       # Playwright
    ├── scripts/
    │   ├── demarrer-standalone.mjs     # serveur de prod local (e2e, Lighthouse)
    │   └── verifier-taille-encre.mjs   # budget du moteur
    ├── playwright.config.ts
    └── lighthouserc.json
```

---

### Task 1: Monorepo pnpm

**Files:**
- Move: tout le site vers `apps/web/` (`app`, `components`, `data`, `lib`, `public`, `scripts`, `eslint.config.mjs`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, `package.json`, `.env.example`, `AGENTS.md`)
- Delete: `package-lock.json`, `app/vestiges.test.ts`
- Create: `package.json` (racine), `pnpm-workspace.yaml`, `pnpm-lock.yaml` (généré)
- Modify: `CLAUDE.md`, `.gitignore`, `apps/web/package.json`, `apps/web/next.config.ts`

**Interfaces:**
- Produces: commandes racine `pnpm dev | build | lint | typecheck | test | e2e | verifier-placeholders` ; paquet `web` (filtre `pnpm --filter web …`) ; alias `@/*` → `apps/web/*` inchangé.

- [ ] **Step 1: Installer pnpm**

Run: `npm install -g pnpm@10.34.6 && pnpm --version`
Expected: `10.34.6`

- [ ] **Step 2: Supprimer le test de vestiges et le lockfile npm**

`app/vestiges.test.ts` interdit des mots que le portfolio emploie légitimement (« électricien-plombier ») ; le README du châssis demande de le supprimer.

```bash
git rm app/vestiges.test.ts package-lock.json
```

- [ ] **Step 3: Déplacer le site dans `apps/web`**

```bash
mkdir -p apps/web
git mv app components data lib public scripts eslint.config.mjs next.config.ts postcss.config.mjs tsconfig.json vitest.config.ts vitest.setup.ts package.json .env.example AGENTS.md apps/web/
```

- [ ] **Step 4: Créer le `package.json` racine**

```json
{
  "name": "jouan-dev",
  "private": true,
  "packageManager": "pnpm@10.34.6",
  "scripts": {
    "dev": "pnpm --filter web dev",
    "build": "pnpm --filter web build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "e2e": "pnpm --filter web e2e",
    "verifier-placeholders": "pnpm --filter web verifier-placeholders"
  }
}
```

- [ ] **Step 5: Créer `pnpm-workspace.yaml`**

```yaml
packages:
  - apps/*

# pnpm 10 n'exécute les scripts d'installation des dépendances que sur
# autorisation explicite. Ajouter ici un paquet signalé par « Ignored build
# scripts » au `pnpm install` seulement s'il compile du code natif.
onlyBuiltDependencies:
  - sharp
  - unrs-resolver
```

- [ ] **Step 6: Adapter `apps/web/package.json`**

Changer `"name": "site-vitrine-template"` en `"name": "web"` et ajouter le script `typecheck` :

```json
    "typecheck": "tsc --noEmit",
```

(à placer après `"lint": "eslint",`).

- [ ] **Step 7: Pointer `CLAUDE.md` vers le nouvel emplacement d'`AGENTS.md`**

Contenu complet de `CLAUDE.md` (racine) :

```markdown
@apps/web/AGENTS.md
```

- [ ] **Step 8: Désancrer les motifs de `.gitignore`**

Les motifs `/node_modules`, `/.next/`, `/out/`, `/build` et `/coverage` ne visent que la racine : ils laisseraient passer `apps/web/node_modules` et `apps/web/.next`. Remplacer ces lignes par :

```gitignore
node_modules
.next/
out/
build/
coverage
```

- [ ] **Step 9: Racine de traçage dans `apps/web/next.config.ts`**

Ajouter en tête de fichier, après `import type { NextConfig } from "next";` :

```ts
import path from "node:path";
```

Ajouter avant `const nextConfig` :

```ts
// Monorepo : le lockfile pnpm et les dépendances hissées sont à la racine du
// dépôt. Le traçage du mode standalone et Turbopack doivent partir de là,
// sinon l'image Docker manque des modules (doc Next : output.md, turbopack.md).
const racineDepot = path.join(__dirname, "../..");
```

Ajouter dans l'objet `nextConfig`, juste après la ligne `output: …` :

```ts
  outputFileTracingRoot: racineDepot,
  turbopack: { root: racineDepot },
```

- [ ] **Step 10: Installer et vérifier que tout passe comme avant**

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected : installation sans erreur (si pnpm affiche « Ignored build scripts », appliquer la règle de l'étape 5) ; lint, types et tests verts ; build réussi ; le fichier `apps/web/.next/standalone/apps/web/server.js` existe (`ls apps/web/.next/standalone/apps/web/server.js`).

- [ ] **Step 11: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml CLAUDE.md .gitignore apps/web
git commit -m "Monorepo pnpm : le site déménage dans apps/web"
```

(`git status` doit confirmer que les suppressions de l'étape 2 et les déplacements de l'étape 3 sont dans le commit.)

---

### Task 2: Docker et CI adaptés au workspace

**Files:**
- Modify: `Dockerfile`, `.dockerignore`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: scripts racine de la tâche 1 ; sortie standalone `apps/web/.next/standalone/apps/web/server.js`.
- Produces: image `ghcr.io/augustin-jouan/jouan.dev` qui démarre par `node apps/web/server.js` sur le port 3000 ; job CI `verifier` sous pnpm (la tâche 11 y ajoutera un job `e2e`).

- [ ] **Step 1: Réécrire le `Dockerfile`**

```dockerfile
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
```

- [ ] **Step 2: Étendre `.dockerignore` aux sous-dossiers**

Contenu complet :

```
# Tout ce qui n'entre pas dans l'image : le build repart de zéro.
**/node_modules
**/.next
.git
.github
.claude
.superpowers
docs
**/coverage
**/test-results
**/playwright-report
**/.lighthouseci
**/*.tsbuildinfo
**/next-env.d.ts
# Les secrets viennent de l'hébergeur, jamais du dépôt.
**/.env*
!**/.env.example
```

- [ ] **Step 3: Construire et lancer l'image en local**

```bash
docker build -t jouan-dev .
docker run -d --rm -p 3100:3000 --name jouan-dev-test jouan-dev
for i in $(seq 1 30); do curl -sf -o /dev/null http://127.0.0.1:3100/ && break; sleep 1; done
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3100/
docker stop jouan-dev-test
```

Expected : build réussi, puis `200`.

- [ ] **Step 4: Passer la CI à pnpm**

Dans `.github/workflows/ci.yml` :

1. Bloc `env` :

```yaml
env:
  # URL finale du site, figée dans les pages au build (canonical, sitemap…).
  # La prévisualisation (portfolio.jouan.dev) sert déjà ces pages.
  SITE_URL: https://jouan.dev
  # GHCR impose un nom en minuscules, d'où le nom en dur plutôt que
  # `github.repository`.
  IMAGE: ghcr.io/augustin-jouan/jouan.dev
```

(supprimer la ligne de commentaire « Deux valeurs à changer au démarrage d'un site… »).

2. Étapes du job `verifier`, de `actions/checkout` à `build`, remplacées par :

```yaml
      - uses: actions/checkout@v7

      # Lit la version de pnpm dans le champ `packageManager` du package.json.
      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm lint

      - run: pnpm typecheck

      - run: pnpm test

      # Laissé commenté tant que les mentions légales attendent les
      # informations de l'EI ; à activer avant la bascule sur jouan.dev.
      # - run: pnpm verifier-placeholders

      - run: pnpm build
```

- [ ] **Step 5: Vérifier la syntaxe du workflow**

Run: `npx -y yaml-lint .github/workflows/ci.yml`
Expected: `✔ YAML Lint successful.`

- [ ] **Step 6: Commit**

```bash
git add Dockerfile .dockerignore .github/workflows/ci.yml
git commit -m "Docker et CI adaptés au workspace pnpm"
```

---

### Task 3: Direction « Atelier clair » : jetons, polices, en-tête, vignette

**Files:**
- Modify: `apps/web/app/globals.css`, `apps/web/app/layout.tsx`, `apps/web/components/layout/Header.tsx`, `apps/web/components/layout/Header.test.tsx`, `apps/web/components/layout/SkipLink.tsx`, `apps/web/data/navigation.ts`, `apps/web/app/opengraph-image.tsx`

**Interfaces:**
- Produces: utilitaires Tailwind `bg-papier`, `text-encre`, `text-encre-douce`, `text-brique`, `text-braise-claire`, `text-terre`, `border-trait`, `font-serif`, `font-sans` ; variables CSS `--color-*` ; `navLinks` = `[{ href: "/#realisations", label: "Réalisations" }, { href: "/#offre", label: "Offre" }, { href: "/#contact", label: "Contact" }]`.

- [ ] **Step 1: Écrire le test de l'en-tête**

Contenu complet de `apps/web/components/layout/Header.test.tsx` :

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Header } from "./Header";
import { siteName } from "@/data/site";

describe("Header", () => {
  it("affiche le nom vers l'accueil et les liens vers les sections", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: siteName })).toHaveAttribute("href", "/");
    const nav = screen.getByRole("navigation", { name: "Navigation principale" });
    expect(within(nav).getByRole("link", { name: "Réalisations" })).toHaveAttribute(
      "href",
      "/#realisations"
    );
    expect(within(nav).getByRole("link", { name: "Offre" })).toHaveAttribute("href", "/#offre");
    expect(within(nav).getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/#contact");
  });
});
```

- [ ] **Step 2: Vérifier qu'il échoue**

Run: `pnpm --filter web exec vitest run components/layout/Header.test.tsx`
Expected: FAIL (lien « Réalisations » introuvable).

- [ ] **Step 3: Navigation par ancres**

Contenu complet de `apps/web/data/navigation.ts` :

```ts
export type NavLink = {
  href: string;
  label: string;
};

/**
 * Liens de l'en-tête vers les sections de l'accueil. Des ancres absolues
 * (`/#offre`) : elles ramènent aussi à l'accueil depuis les pages légales.
 */
export const navLinks: NavLink[] = [
  { href: "/#realisations", label: "Réalisations" },
  { href: "/#offre", label: "Offre" },
  { href: "/#contact", label: "Contact" },
];
```

- [ ] **Step 4: En-tête**

Plus aucun lien ne désigne une page : `usePathname` et `aria-current` n'ont plus d'objet, le composant redevient serveur. Contenu complet de `apps/web/components/layout/Header.tsx` :

```tsx
import Link from "next/link";
import { navLinks } from "@/data/navigation";
import { siteName } from "@/data/site";

/** En-tête : nom du site et liens vers les sections de l'accueil. */
export function Header() {
  return (
    <header>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-5 sm:px-8">
        <Link href="/" className="font-serif text-2xl leading-none">
          {siteName}
        </Link>
        <nav aria-label="Navigation principale">
          <ul className="flex gap-5 text-sm text-encre-douce">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-encre">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Vérifier que le test passe**

Run: `pnpm --filter web exec vitest run components/layout/Header.test.tsx`
Expected: PASS

- [ ] **Step 6: Jetons et grain de papier**

Contenu complet de `apps/web/app/globals.css` :

```css
@import "tailwindcss";

/*
 * Direction « Atelier clair » : papier chaud, encre noire, un seul accent.
 * Chaque jeton `--color-x` donne les utilitaires `bg-x`, `text-x`, `border-x`.
 * `brique` ne sert qu'aux grands textes (contraste 4,1:1 sur le papier).
 *
 * `--font-inter` et `--font-instrument` sont posées par next/font dans
 * app/layout.tsx. Ne pas nommer un jeton comme une variable next/font : la
 * déclaration serait circulaire.
 */
@theme {
  --color-papier: #f3efe7;
  --color-encre: #1b1a17;
  --color-encre-douce: #5b574f;
  --color-brique: #c84a1f;
  --color-braise: #e0582b;
  --color-braise-claire: #ef9c62;
  --color-terre: #8a5a3c;
  --color-trait: #c9c1b2;

  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-serif: var(--font-instrument), ui-serif, Georgia, serif;
}

html {
  background-color: var(--color-papier);
  color: var(--color-encre);
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}

/* Grain de papier : bruit SVG très léger, fixe, sous tout le contenu. */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -20;
  pointer-events: none;
  opacity: 0.35;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.22'/%3E%3C/svg%3E");
}
```

- [ ] **Step 7: Polices et corps de page dans `apps/web/app/layout.tsx`**

Remplacer l'import et la déclaration de police :

```tsx
import { Inter, Instrument_Serif } from "next/font/google";
```

```tsx
// next/font sert les fichiers depuis le domaine : la CSP n'a pas besoin de
// Google Fonts.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
});
```

Remplacer les balises `<html>` et `<body>` :

```tsx
    <html lang="fr" className={`${inter.variable} ${instrument.variable}`}>
      {/* `relative` : le fond de l'accueil se positionne par rapport au corps. */}
      <body className="relative flex min-h-screen flex-col font-sans text-encre">
```

- [ ] **Step 8: Lien d'évitement aux couleurs du site**

Dans `apps/web/components/layout/SkipLink.tsx`, remplacer `focus:bg-white` par `focus:rounded-full focus:bg-papier`.

- [ ] **Step 9: Vignette de partage**

Contenu complet de `apps/web/app/opengraph-image.tsx` :

```tsx
import { ImageResponse } from "next/og";
import { siteName, siteDescription } from "@/data/site";

// Vignette de partage (LinkedIn, WhatsApp, iMessage…). Next la câble sur
// `og:image` et `twitter:image` pour tout le site et la génère au build.
// Couleurs de l'Atelier clair, en dur : le CSS du site n'existe pas ici.
export const alt = siteName;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 20,
          padding: "72px",
          background: "#f3efe7",
          color: "#1b1a17",
          fontFamily: "serif",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -140,
            top: -180,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, #e0582b 0%, #ef9c62 40%, rgba(243,239,231,0) 70%)",
          }}
        />
        <div style={{ fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "#8a5a3c" }}>
          Développeur full stack · indépendant
        </div>
        <div style={{ fontSize: 84, lineHeight: 1.02 }}>{siteName}</div>
        <div style={{ fontSize: 30, color: "#5b574f", maxWidth: 960, fontFamily: "sans-serif" }}>
          {siteDescription}
        </div>
      </div>
    ),
    size
  );
}
```

- [ ] **Step 10: Vérifier**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected : tout vert. Puis `pnpm dev`, ouvrir `http://localhost:3000` : fond papier avec grain, nom en Instrument Serif dans l'en-tête, trois liens.

- [ ] **Step 11: Commit**

```bash
git add apps/web/app/globals.css apps/web/app/layout.tsx apps/web/components/layout/Header.tsx apps/web/components/layout/Header.test.tsx apps/web/components/layout/SkipLink.tsx apps/web/data/navigation.ts apps/web/app/opengraph-image.tsx
git commit -m "Atelier clair : jetons, polices, en-tête et vignette de partage"
```

---

### Task 4: Identité de l'EI : données, pages légales, contact, JSON-LD

**Files:**
- Modify: `apps/web/data/site.ts`, `apps/web/data/contact.ts`, `apps/web/data/legal.ts`, `apps/web/data/legal.test.ts`, `apps/web/app/mentions-legales/page.tsx`, `apps/web/app/mentions-legales/page.test.tsx`, `apps/web/app/politique-de-confidentialite/page.tsx`, `apps/web/app/contact/page.tsx`, `apps/web/app/contact/page.test.tsx`, `apps/web/app/contact/actions.ts`, `apps/web/app/contact/actions.test.ts`, `apps/web/components/layout/Footer.tsx`, `apps/web/components/layout/Footer.test.tsx`, `apps/web/app/layout.tsx`, `apps/web/.env.example`
- Create: `apps/web/components/shared/PersonJsonLd.tsx`, `apps/web/components/shared/PersonJsonLd.test.tsx`
- Delete: `apps/web/components/shared/LocalBusinessJsonLd.tsx`, `apps/web/components/shared/LocalBusinessJsonLd.test.tsx`

**Interfaces:**
- Produces:
  - `siteName = "Augustin Jouan"`, `siteDescription`, `siteUrl` (défaut `https://jouan.dev`) dans `@/data/site` ;
  - `contact: { email: "contact@jouan.dev"; github: "https://github.com/Augustin-Jouan" }` dans `@/data/contact` ;
  - `mentionsLegales: { editeur, statut, adresse, telephone, email, siren, tva, directeurPublication, hebergeur, mediateur, transfertHorsUe }` dans `@/data/legal` ;
  - `<PersonJsonLd />` dans `@/components/shared/PersonJsonLd`.

- [ ] **Step 1: Écrire les tests (données légales, pied de page, page contact, JSON-LD, action)**

Contenu complet de `apps/web/data/legal.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { A_COMPLETER, mentionsLegales, mentionsLegalesManquantes } from "./legal";
import { contact } from "./contact";
import { siteName } from "./site";

describe("mentionsLegales", () => {
  it("présente l'éditeur comme entrepreneur individuel joignable par e-mail", () => {
    expect(mentionsLegales.editeur).toBe(siteName);
    expect(mentionsLegales.directeurPublication).toBe(siteName);
    expect(mentionsLegales.statut).toMatch(/entrepreneur individuel/i);
    expect(mentionsLegales.email).toBe(contact.email);
  });

  it("préremplit l'hébergeur OVH et l'absence de transfert hors UE", () => {
    expect(mentionsLegales.hebergeur.nom).toBe("OVH SAS");
    expect(mentionsLegales.transfertHorsUe).toMatch(
      /ne sont pas transférées hors de l'Union européenne/
    );
  });

  // Informations à fournir par l'EI avant la bascule sur jouan.dev.
  it("liste précisément les champs à compléter", () => {
    expect([...mentionsLegalesManquantes].sort()).toEqual(
      ["adresse", "mediateur.adresse", "mediateur.nom", "mediateur.site", "siren", "telephone", "tva"].sort()
    );
    expect(mentionsLegales.siren).toBe(A_COMPLETER);
  });
});
```

Contenu complet de `apps/web/components/layout/Footer.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Footer } from "./Footer";
import { contact } from "@/data/contact";
import { siteName } from "@/data/site";

describe("Footer", () => {
  it("donne l'e-mail, le GitHub et les pages légales", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: contact.email })).toHaveAttribute(
      "href",
      `mailto:${contact.email}`
    );
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", contact.github);
    expect(screen.getByRole("link", { name: "Mentions légales" })).toHaveAttribute(
      "href",
      "/mentions-legales"
    );
    expect(screen.getByRole("link", { name: "Politique de confidentialité" })).toHaveAttribute(
      "href",
      "/politique-de-confidentialite"
    );
  });

  it("signe l'année en cours", () => {
    render(<Footer />);
    expect(screen.getByText(`© ${new Date().getFullYear()} ${siteName}`)).toBeInTheDocument();
  });
});
```

Contenu complet de `apps/web/app/contact/page.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ContactPage from "./page";
import { contact } from "@/data/contact";

describe("ContactPage", () => {
  it("affiche le formulaire et l'e-mail direct", () => {
    render(<ContactPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Contact" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nom")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: contact.email })).toHaveAttribute(
      "href",
      `mailto:${contact.email}`
    );
  });
});
```

Contenu complet de `apps/web/components/shared/PersonJsonLd.test.tsx` :

```tsx
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PersonJsonLd } from "./PersonJsonLd";
import { contact } from "@/data/contact";
import { siteName, siteUrl } from "@/data/site";

function lireJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  return JSON.parse(script?.textContent ?? "{}");
}

describe("PersonJsonLd", () => {
  it("décrit une personne, son métier et son profil GitHub", () => {
    const { container } = render(<PersonJsonLd />);
    const jsonLd = lireJsonLd(container);
    expect(jsonLd["@type"]).toBe("Person");
    expect(jsonLd.name).toBe(siteName);
    expect(jsonLd.url).toBe(siteUrl);
    expect(jsonLd.jobTitle).toMatch(/full stack/i);
    expect(jsonLd.sameAs).toEqual([contact.github]);
    expect(jsonLd.knowsAbout).toContain("Next.js");
  });

  it("ne publie ni adresse ni téléphone", () => {
    const jsonLd = lireJsonLd(render(<PersonJsonLd />).container);
    expect(jsonLd).not.toHaveProperty("address");
    expect(jsonLd).not.toHaveProperty("telephone");
  });
});
```

Dans `apps/web/app/contact/actions.test.ts`, ajouter l'import en tête (après les imports existants) :

```ts
import { contact } from "@/data/contact";
```

et ces deux tests à la fin du `describe("submitContactForm", …)` :

```ts
  it("propose l'e-mail direct quand l'envoi échoue", async () => {
    sendContactEmail.mockRejectedValue(new Error("smtp down"));
    const state = await submitContactForm(
      idle,
      buildFormData({ nom: "Jean", email: "jean@exemple.fr", message: "Bonjour" })
    );
    expect(state.status).toBe("error");
    expect(state.message).toContain(contact.email);
  });

  it("propose l'e-mail direct quand la limite d'envois est atteinte", async () => {
    const envoyer = () =>
      submitContactForm(
        idle,
        buildFormData({ nom: "Jean", email: "jean@exemple.fr", message: "Bonjour" })
      );
    for (let i = 0; i < 5; i += 1) await envoyer();
    expect((await envoyer()).message).toContain(contact.email);
  });
```

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `pnpm --filter web exec vitest run data/legal.test.ts components/layout/Footer.test.tsx app/contact components/shared/PersonJsonLd.test.tsx`
Expected: FAIL (champs `editeur`, `github`, composant `PersonJsonLd` absents ; messages sans e-mail).

- [ ] **Step 3: Données du site**

Dans `apps/web/data/site.ts`, remplacer `siteName`, `siteDescription` et la valeur par défaut de l'URL :

```ts
export const siteName = "Augustin Jouan";

export const siteDescription =
  "Développeur full stack indépendant : applications métier sur mesure et sites vitrines, conçus, développés et hébergés de A à Z.";
```

```ts
  const url = process.env.SITE_URL ?? "https://jouan.dev";
```

Contenu complet de `apps/web/data/contact.ts` :

```ts
export type Contact = {
  /** Adresse publique, affichée sur le site et dans les messages d'erreur. */
  email: string;
  /** Profil GitHub, aussi déclaré dans les données structurées (`sameAs`). */
  github: string;
};

export const contact: Contact = {
  email: "contact@jouan.dev",
  github: "https://github.com/Augustin-Jouan",
};
```

- [ ] **Step 4: Mentions légales d'une EI**

Contenu complet de `apps/web/data/legal.ts` :

```ts
import { contact } from "@/data/contact";
import { siteName } from "@/data/site";

/** Valeur affichée tant que l'information n'a pas été fournie. */
export const A_COMPLETER = "[À compléter]"; // placeholder-ok

export type MentionsLegales = {
  /** Nom et prénom de l'entrepreneur individuel. */
  editeur: string;
  statut: string;
  /** Adresse de domiciliation de l'entreprise (art. 6 III de la LCEN). */
  adresse: string;
  telephone: string;
  email: string;
  siren: string;
  /** Numéro de TVA intracommunautaire, ou mention de franchise en base. */
  tva: string;
  directeurPublication: string;
  hebergeur: {
    nom: string;
    adresse: string;
    telephone: string;
  };
  /** Obligatoire dès qu'une prestation peut être vendue à un particulier (art. L.616-1 code conso). */
  mediateur: {
    nom: string;
    adresse: string;
    site: string;
  };
  /** Phrase décrivant un éventuel transfert hors UE, selon l'hébergeur. */
  transfertHorsUe: string;
};

export const mentionsLegales: MentionsLegales = {
  editeur: siteName,
  statut: "Entrepreneur individuel (EI)",
  adresse: A_COMPLETER,
  telephone: A_COMPLETER,
  email: contact.email,
  siren: A_COMPLETER,
  tva: A_COMPLETER,
  directeurPublication: siteName,
  hebergeur: {
    nom: "OVH SAS",
    adresse: "2 rue Kellermann, 59100 Roubaix, France",
    telephone: "1007 (depuis la France) / +33 9 72 10 10 07",
  },
  mediateur: {
    nom: A_COMPLETER,
    adresse: A_COMPLETER,
    site: A_COMPLETER,
  },
  // OVH héberge en France : aucun transfert hors UE lié à l'hébergement.
  transfertHorsUe:
    "Le site est hébergé par OVH SAS sur des serveurs situés en France. Les données collectées via le formulaire de contact ne sont pas transférées hors de l'Union européenne.",
};

/** Chemins (ex. `hebergeur.nom`) des valeurs encore égales à `A_COMPLETER`. */
function champsIncomplets(objet: object, prefixe = ""): string[] {
  return Object.entries(objet).flatMap(([cle, valeur]) => {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle;
    if (typeof valeur === "object" && valeur !== null) {
      return champsIncomplets(valeur, chemin);
    }
    return valeur === A_COMPLETER ? [chemin] : [];
  });
}

/** Champs légalement dus qui restent à renseigner avant la mise en ligne. */
export const mentionsLegalesManquantes: string[] = champsIncomplets(mentionsLegales);
```

Contenu complet de `apps/web/app/mentions-legales/page.tsx` :

```tsx
import type { Metadata } from "next";
import { A_COMPLETER, mentionsLegales as m } from "@/data/legal";
import { siteName } from "@/data/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: `Mentions légales du site de ${siteName}.`,
  alternates: { canonical: "/mentions-legales" },
};

function Ligne({ label, valeur }: { label: string; valeur: string }) {
  const placeholder = valeur === A_COMPLETER;

  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="font-semibold">{label}</dt>
      <dd className={placeholder ? "italic" : undefined}>{valeur}</dd>
    </div>
  );
}

export default function MentionsLegalesPage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-16">
      <h1 className="font-serif text-5xl">Mentions légales</h1>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Éditeur du site</h2>
        <dl className="flex flex-col gap-2">
          <Ligne label="Éditeur :" valeur={m.editeur} />
          <Ligne label="Statut :" valeur={m.statut} />
          <Ligne label="Adresse :" valeur={m.adresse} />
          <Ligne label="Téléphone :" valeur={m.telephone} />
          <Ligne label="Email :" valeur={m.email} />
          <Ligne label="SIREN :" valeur={m.siren} />
          <Ligne label="TVA :" valeur={m.tva} />
          <Ligne label="Directeur de la publication :" valeur={m.directeurPublication} />
        </dl>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Hébergement</h2>
        <dl className="flex flex-col gap-2">
          <Ligne label="Hébergeur :" valeur={m.hebergeur.nom} />
          <Ligne label="Adresse :" valeur={m.hebergeur.adresse} />
          <Ligne label="Téléphone :" valeur={m.hebergeur.telephone} />
        </dl>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Médiation de la consommation</h2>
        <p>
          Conformément aux articles L.611-1 et L.616-1 du code de la
          consommation, en cas de litige vous pouvez recourir gratuitement au
          médiateur de la consommation dont relève {m.editeur}, après avoir
          adressé une réclamation écrite préalable.
        </p>
        <dl className="flex flex-col gap-2">
          <Ligne label="Médiateur :" valeur={m.mediateur.nom} />
          <Ligne label="Adresse :" valeur={m.mediateur.adresse} />
          <Ligne label="Site internet :" valeur={m.mediateur.site} />
        </dl>
      </div>
    </section>
  );
}
```

Contenu complet de `apps/web/app/mentions-legales/page.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MentionsLegalesPage from "./page";
import { A_COMPLETER } from "@/data/legal";
import { siteName } from "@/data/site";

describe("MentionsLegalesPage", () => {
  it("affiche l'éditeur, son statut, l'hébergeur et le médiateur", () => {
    render(<MentionsLegalesPage />);
    expect(screen.getByRole("heading", { level: 1, name: /mentions légales/i })).toBeInTheDocument();
    expect(screen.getAllByText(siteName).length).toBeGreaterThan(0);
    expect(screen.getByText(/entrepreneur individuel/i)).toBeInTheDocument();
    expect(screen.getByText("OVH SAS")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /médiation de la consommation/i })
    ).toBeInTheDocument();
  });

  it("signale visiblement les champs à compléter", () => {
    render(<MentionsLegalesPage />);
    const placeholders = screen.getAllByText(A_COMPLETER);
    expect(placeholders.length).toBeGreaterThan(0);
    placeholders.forEach((el) => expect(el).toHaveClass("italic"));
  });
});
```

Dans `apps/web/app/politique-de-confidentialite/page.tsx` :

1. Remplacer le paragraphe de la section « Responsable du traitement » par :

```tsx
        <p>
          Le responsable du traitement des données collectées sur ce site est{" "}
          {mentionsLegales.editeur} ({mentionsLegales.statut}), joignable par
          e-mail à l&apos;adresse {mentionsLegales.email}.
        </p>
```

2. Remplacer `{mentionsLegales.raisonSociale}` par `{mentionsLegales.editeur}` dans la section « Destinataires ».

3. Vérifier qu'il ne reste aucune ancienne propriété : `grep -rn "raisonSociale\|capitalSocial\|\.rcs\|assurance\|adressePostale\|telephoneLien" apps/web --include=*.ts --include=*.tsx` ne doit rien renvoyer (hors `node_modules`).

- [ ] **Step 5: Pied de page et page contact**

Contenu complet de `apps/web/components/layout/Footer.tsx` :

```tsx
import Link from "next/link";
import { contact } from "@/data/contact";
import { siteName } from "@/data/site";

/** Pied de page : signature, e-mail, GitHub et pages légales. */
export function Footer() {
  return (
    <footer className="border-t border-trait">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-encre-douce sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          © {new Date().getFullYear()} {siteName}
        </p>
        <nav aria-label="Pied de page">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <a href={`mailto:${contact.email}`} className="hover:text-encre">
                {contact.email}
              </a>
            </li>
            <li>
              <a href={contact.github} rel="me" className="hover:text-encre">
                GitHub
              </a>
            </li>
            <li>
              <Link href="/mentions-legales" className="hover:text-encre">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/politique-de-confidentialite" className="hover:text-encre">
                Politique de confidentialité
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
```

Contenu complet de `apps/web/app/contact/page.tsx` :

```tsx
import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { contact } from "@/data/contact";
import { siteName } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contacter ${siteName}, développeur full stack indépendant : formulaire ou e-mail.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-10 px-5 py-16">
      <h1 className="font-serif text-5xl">Contact</h1>

      <ContactForm />

      <div>
        <h2 className="mb-2 font-semibold">Écrire directement</h2>
        <p>
          <a href={`mailto:${contact.email}`} className="underline">
            {contact.email}
          </a>
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Messages d'erreur de l'action**

Dans `apps/web/app/contact/actions.ts`, ajouter l'import :

```ts
import { contact } from "@/data/contact";
```

Remplacer la fin du message de limite `, ou de nous appeler directement.` par :

```ts
      }, ou de m'écrire directement à ${contact.email}.`,
```

Remplacer le message d'échec d'envoi par :

```ts
      message: `L'envoi a échoué (${codeErreur(err)}). Merci de réessayer ou de m'écrire directement à ${contact.email}.`,
```

- [ ] **Step 7: Données structurées « Person »**

Contenu complet de `apps/web/components/shared/PersonJsonLd.tsx` :

```tsx
import { contact } from "@/data/contact";
import { siteUrl, siteName, siteDescription } from "@/data/site";

// Données structurées schema.org : une personne qui propose ses services.
// Rendu dans le layout, donc sur toutes les pages. Ni adresse ni téléphone :
// le site n'en publie pas.
export function PersonJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteName,
    jobTitle: "Développeur full stack indépendant",
    description: siteDescription,
    url: siteUrl,
    // Vignette générée par app/opengraph-image.tsx.
    image: `${siteUrl}/opengraph-image`,
    email: `mailto:${contact.email}`,
    sameAs: [contact.github],
    knowsAbout: ["Next.js", "React", "TypeScript", "Node.js", "PostgreSQL", "Docker"],
  };

  return (
    <script
      type="application/ld+json"
      // Sérialisation contrôlée d'un objet statique, pas d'entrée utilisateur.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

```bash
git rm apps/web/components/shared/LocalBusinessJsonLd.tsx apps/web/components/shared/LocalBusinessJsonLd.test.tsx
```

Dans `apps/web/app/layout.tsx`, remplacer l'import et l'usage de `LocalBusinessJsonLd` par `PersonJsonLd` :

```tsx
import { PersonJsonLd } from "@/components/shared/PersonJsonLd";
```

```tsx
        <PersonJsonLd />
```

- [ ] **Step 8: Expéditeur et destinataire du formulaire**

Dans `apps/web/.env.example`, remplacer les deux lignes `CONTACT_FROM` et `CONTACT_TO` et la ligne `SITE_URL` :

```
CONTACT_FROM=Site jouan.dev <postmaster@jouan.dev>
# Boîte qui reçoit les demandes.
CONTACT_TO=contact@jouan.dev
```

```
SITE_URL=https://jouan.dev
```

(et supprimer le commentaire « Boîte du client qui reçoit les demandes. »).

- [ ] **Step 9: Vérifier que tout passe**

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Expected: PASS (dont les nouveaux tests de l'étape 1).

- [ ] **Step 10: Commit**

```bash
git add apps/web/data/site.ts apps/web/data/contact.ts apps/web/data/legal.ts apps/web/data/legal.test.ts apps/web/app/mentions-legales/page.tsx apps/web/app/mentions-legales/page.test.tsx apps/web/app/politique-de-confidentialite/page.tsx apps/web/app/contact/page.tsx apps/web/app/contact/page.test.tsx apps/web/app/contact/actions.ts apps/web/app/contact/actions.test.ts apps/web/components/layout/Footer.tsx apps/web/components/layout/Footer.test.tsx apps/web/components/shared/PersonJsonLd.tsx apps/web/components/shared/PersonJsonLd.test.tsx apps/web/app/layout.tsx apps/web/.env.example
git commit -m "Identité de l'EI : données, mentions légales, contact et JSON-LD Person"
```

---

### Task 5: Contenu de l'accueil

**Files:**
- Create: `apps/web/data/accueil.ts`, `apps/web/data/accueil.test.ts`

**Interfaces:**
- Consumes: `navLinks` (tâche 3).
- Produces (dans `@/data/accueil`) :
  - `ANCRES: { offre: "offre"; realisations: "realisations"; methode: "methode"; parcours: "parcours"; contact: "contact" }`
  - `type CleSection = keyof typeof ANCRES`
  - `sections: Record<CleSection, { surtitre: string; titre: string }>`
  - `accroche: { surtitre; titreAvant; titreAccent; titreApres; sousTitre; actionPrincipale: Lien; actionSecondaire: Lien }` avec `type Lien = { libelle: string; href: string }`
  - `offres: Offre[]` avec `type Offre = { id: "application" | "vitrine"; titre: string; miseEnAvant: boolean; pourQui: string; livrables: string[]; exemple: string }`
  - `realisations: Realisation[]` avec `type Realisation = { titre: string; contexte: string; besoin: string; livre: string; stack: string[] }`
  - `etapes: Etape[]` avec `type Etape = { titre: string; description: string }`
  - `parcours: string[]`

- [ ] **Step 1: Écrire les tests du contenu**

Contenu complet de `apps/web/data/accueil.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { ANCRES, accroche, etapes, offres, parcours, realisations, sections } from "./accueil";
import { navLinks } from "./navigation";

/** Toutes les chaînes d'une valeur, en profondeur. */
function textes(valeur: unknown): string[] {
  if (typeof valeur === "string") return [valeur];
  if (Array.isArray(valeur)) return valeur.flatMap(textes);
  if (typeof valeur === "object" && valeur !== null) return Object.values(valeur).flatMap(textes);
  return [];
}

const ancres = new Set(Object.values(ANCRES).map((id) => `#${id}`));

describe("contenu de l'accueil", () => {
  it("met en avant une seule offre : l'application métier", () => {
    const misesEnAvant = offres.filter((offre) => offre.miseEnAvant);
    expect(misesEnAvant.map((offre) => offre.id)).toEqual(["application"]);
    expect(offres[0].id).toBe("application");
  });

  it("décrit chaque offre avec au moins un livrable", () => {
    for (const offre of offres) expect(offre.livrables.length).toBeGreaterThan(0);
  });

  it("présente deux réalisations complètes", () => {
    expect(realisations).toHaveLength(2);
    for (const r of realisations) {
      expect(r.besoin).not.toBe("");
      expect(r.livre).not.toBe("");
      expect(r.stack.length).toBeGreaterThan(0);
    }
  });

  it("décrit la méthode en cinq étapes", () => {
    expect(etapes).toHaveLength(5);
  });

  it("donne un parcours de trois lignes", () => {
    expect(parcours).toHaveLength(3);
  });

  it("fait pointer les actions de l'accroche vers des sections existantes", () => {
    expect(ancres.has(accroche.actionPrincipale.href)).toBe(true);
    expect(ancres.has(accroche.actionSecondaire.href)).toBe(true);
  });

  it("fait pointer la navigation de l'en-tête vers des sections existantes", () => {
    for (const lien of navLinks) expect(ancres.has(lien.href.replace(/^\//, ""))).toBe(true);
  });

  it("ne laisse aucun placeholder entre crochets", () => {
    const tout = textes({ sections, accroche, offres, realisations, etapes, parcours });
    expect(tout.filter((texte) => /\[[^\]]*\]/.test(texte))).toEqual([]);
  });
});
```

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `pnpm --filter web exec vitest run data/accueil.test.ts`
Expected: FAIL (module `./accueil` introuvable).

- [ ] **Step 3: Écrire le contenu**

Contenu complet de `apps/web/data/accueil.ts` :

```ts
/**
 * Contenu de la page d'accueil, première version : textes à relire et
 * valider. Réalisations anonymisées : ni nom de client ni détail identifiant.
 */

/** Identifiants des sections de l'accueil, cibles des ancres (`/#offre`). */
export const ANCRES = {
  offre: "offre",
  realisations: "realisations",
  methode: "methode",
  parcours: "parcours",
  contact: "contact",
} as const;

export type CleSection = keyof typeof ANCRES;

export type EnTeteSection = { surtitre: string; titre: string };

export const sections: Record<CleSection, EnTeteSection> = {
  offre: { surtitre: "Ce que je fais", titre: "Deux façons de travailler ensemble" },
  realisations: { surtitre: "Réalisations", titre: "Quelques projets récents" },
  methode: { surtitre: "Comment je travaille", titre: "Un cadre clair, du premier échange au suivi" },
  parcours: { surtitre: "Parcours", titre: "Développeur, étudiant et indépendant" },
  contact: { surtitre: "Contact", titre: "Parlons de votre projet" },
};

export type Lien = { libelle: string; href: string };

export type Accroche = {
  surtitre: string;
  /** Le titre est coupé en trois pour mettre l'accent en couleur. */
  titreAvant: string;
  titreAccent: string;
  titreApres: string;
  sousTitre: string;
  actionPrincipale: Lien;
  actionSecondaire: Lien;
};

export const accroche: Accroche = {
  surtitre: "Développeur full stack · indépendant",
  titreAvant: "Des applications métier ",
  titreAccent: "sur mesure",
  titreApres: ", qui remplacent vos tableurs.",
  sousTitre:
    "Je conçois, développe et héberge vos outils, du premier échange à la mise en ligne.",
  actionPrincipale: { libelle: "Parler de votre projet", href: `#${ANCRES.contact}` },
  actionSecondaire: { libelle: "Voir mes réalisations", href: `#${ANCRES.realisations}` },
};

export type Offre = {
  id: "application" | "vitrine";
  titre: string;
  /** L'offre mise en avant est affichée en premier, en plus grand et en sombre. */
  miseEnAvant: boolean;
  pourQui: string;
  livrables: string[];
  exemple: string;
};

export const offres: Offre[] = [
  {
    id: "application",
    titre: "Application métier sur mesure",
    miseEnAvant: true,
    pourQui:
      "Pour les entreprises qui gèrent leur activité dans des tableurs, des e-mails et des fichiers éparpillés.",
    livrables: [
      "Un outil web pensé pour votre façon de travailler",
      "Tableaux de bord, suivi, devis et documents PDF générés automatiquement",
      "Hébergement, sauvegardes et maintenance inclus",
    ],
    exemple:
      "Exemple : le suivi des marchés de travaux d'une entreprise du BTP, du planning aux finances.",
  },
  {
    id: "vitrine",
    titre: "Site vitrine",
    miseEnAvant: false,
    pourQui:
      "Pour les artisans, indépendants et petites entreprises qui veulent être trouvés et contactés.",
    livrables: [
      "Un site rapide, clair et bien référencé",
      "Formulaire de contact, pages légales et mesure d'audience sans cookie",
      "Mise en ligne et hébergement gérés pour vous",
    ],
    exemple: "Exemple : le site d'un artisan électricien-plombier, livré clé en main.",
  },
];

export type Realisation = {
  titre: string;
  /** Secteur ou métier du client, sans le nommer. */
  contexte: string;
  besoin: string;
  livre: string;
  stack: string[];
};

export const realisations: Realisation[] = [
  {
    titre: "Suivi de marchés de travaux",
    contexte: "Entreprise du BTP",
    besoin:
      "Le planning, le suivi financier et le suivi des chantiers reposaient sur des tableurs partagés, difficiles à tenir à jour.",
    livre:
      "Une application web qui centralise le planning, les finances et le suivi de chantier, et génère les documents en PDF.",
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Docker"],
  },
  {
    titre: "Site vitrine d'artisan",
    contexte: "Électricien-plombier",
    besoin:
      "Reprendre la main sur son site et sur son référencement, jusque-là gérés par un ancien prestataire.",
    livre:
      "Un site rapide et bien référencé, avec un formulaire de contact fiable, une mesure d'audience sans cookie et un hébergement maîtrisé.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Docker"],
  },
];

export type Etape = { titre: string; description: string };

export const etapes: Etape[] = [
  {
    titre: "Échange",
    description:
      "On parle de votre activité et de ce qui vous fait perdre du temps. Gratuit et sans engagement.",
  },
  {
    titre: "Devis",
    description: "Un périmètre clair, un prix ferme et un calendrier, avant toute ligne de code.",
  },
  {
    titre: "Maquette",
    description: "Vous voyez et validez l'outil avant qu'il soit construit.",
  },
  {
    titre: "Développement",
    description: "Des livraisons régulières, que vous testez au fur et à mesure.",
  },
  {
    titre: "Mise en ligne et suivi",
    description: "J'héberge, je sauvegarde et je maintiens : vous n'avez rien à gérer.",
  },
];

export const parcours: string[] = [
  "Développeur full stack en alternance",
  "Master of Science à Epitech, en cours",
  "Indépendant : applications métier et sites vitrines",
];
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `pnpm --filter web exec vitest run data/accueil.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/data/accueil.ts apps/web/data/accueil.test.ts
git commit -m "Contenu de l'accueil : accroche, offre, réalisations, méthode, parcours"
```

---

### Task 6: Blocs de la page d'accueil

**Files:**
- Create: `apps/web/components/accueil/Section.tsx`, `Accroche.tsx`, `Offre.tsx`, `Realisations.tsx`, `Methode.tsx`, `Parcours.tsx`, `SectionContact.tsx` (tous sous `apps/web/components/accueil/`)
- Modify: `apps/web/app/page.tsx`, `apps/web/app/page.test.tsx`, `apps/web/components/contact/ContactForm.tsx`

**Interfaces:**
- Consumes: `@/data/accueil` (tâche 5), `contact` (tâche 4), `ContactForm`.
- Produces: `<Section id surtitre titre>{children}</Section>` ; composants serveur sans props `Accroche`, `Offre`, `Realisations`, `Methode`, `Parcours`, `SectionContact` ; la page d'accueil, dont le `h1` est l'accroche et dont les `h2` sont, dans l'ordre, les titres de `sections`.

- [ ] **Step 1: Écrire le test de la page**

Contenu complet de `apps/web/app/page.test.tsx` :

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "./page";
import {
  ANCRES,
  accroche,
  etapes,
  offres,
  parcours,
  realisations,
  sections,
} from "@/data/accueil";
import { contact } from "@/data/contact";

describe("HomePage", () => {
  it("affiche l'accroche et ses deux actions", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      `${accroche.titreAvant}${accroche.titreAccent}${accroche.titreApres}`
    );
    expect(screen.getByRole("link", { name: accroche.actionPrincipale.libelle })).toHaveAttribute(
      "href",
      accroche.actionPrincipale.href
    );
    expect(screen.getByRole("link", { name: accroche.actionSecondaire.libelle })).toHaveAttribute(
      "href",
      accroche.actionSecondaire.href
    );
  });

  it("affiche les sections dans l'ordre, chacune à son ancre", () => {
    render(<HomePage />);
    const titres = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titres).toEqual([
      sections.offre.titre,
      sections.realisations.titre,
      sections.methode.titre,
      sections.parcours.titre,
      sections.contact.titre,
    ]);
    for (const id of Object.values(ANCRES)) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("affiche les offres, les réalisations, les étapes et le parcours", () => {
    render(<HomePage />);
    for (const offre of offres) {
      expect(screen.getByRole("heading", { level: 3, name: offre.titre })).toBeInTheDocument();
    }
    for (const r of realisations) {
      expect(screen.getByRole("heading", { level: 3, name: r.titre })).toBeInTheDocument();
    }
    for (const etape of etapes) {
      expect(screen.getByRole("heading", { level: 3, name: etape.titre })).toBeInTheDocument();
    }
    for (const ligne of parcours) expect(screen.getByText(ligne)).toBeInTheDocument();
  });

  it("intègre le formulaire et l'e-mail direct dans la section contact", () => {
    render(<HomePage />);
    const section = document.getElementById(ANCRES.contact)!;
    expect(within(section).getByLabelText("Nom")).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: contact.email })).toHaveAttribute(
      "href",
      `mailto:${contact.email}`
    );
  });
});
```

- [ ] **Step 2: Vérifier qu'il échoue**

Run: `pnpm --filter web exec vitest run app/page.test.tsx`
Expected: FAIL (la page placeholder n'a pas ces titres).

- [ ] **Step 3: Section commune**

`apps/web/components/accueil/Section.tsx` :

```tsx
type Props = {
  id: string;
  surtitre: string;
  titre: string;
  children: React.ReactNode;
};

/** Section de l'accueil : ancre, surtitre, titre, puis contenu. */
export function Section({ id, surtitre, titre, children }: Props) {
  const titreId = `${id}-titre`;

  return (
    <section
      id={id}
      aria-labelledby={titreId}
      className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 py-20 sm:px-8 sm:py-28"
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-terre">{surtitre}</p>
      <h2 id={titreId} className="mb-12 max-w-3xl font-serif text-4xl leading-[1.05] sm:text-5xl">
        {titre}
      </h2>
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Accroche**

`apps/web/components/accueil/Accroche.tsx` :

```tsx
import Link from "next/link";
import { accroche } from "@/data/accueil";

/** Premier écran : promesse, signature et deux actions. */
export function Accroche() {
  return (
    <section
      aria-labelledby="accroche-titre"
      className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-6xl flex-col justify-end px-5 pb-16 pt-24 sm:px-8 sm:pb-24"
    >
      {/* L'accueil personnalisé (?pour=…) et le compteur de visiteurs se
          placeront au-dessus du surtitre (sous-projets 3 et 4). */}
      <p className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-terre">
        {accroche.surtitre}
      </p>
      <h1
        id="accroche-titre"
        className="max-w-4xl font-serif text-5xl leading-[0.98] tracking-[-0.01em] break-words sm:text-7xl lg:text-8xl"
      >
        {accroche.titreAvant}
        <em className="text-brique">{accroche.titreAccent}</em>
        {accroche.titreApres}
      </h1>
      <p className="mt-6 max-w-xl text-lg text-encre-douce">{accroche.sousTitre}</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={accroche.actionPrincipale.href}
          className="rounded-full bg-encre px-6 py-3 text-sm font-medium text-papier transition-opacity hover:opacity-85"
        >
          {accroche.actionPrincipale.libelle}
        </Link>
        <Link
          href={accroche.actionSecondaire.href}
          className="rounded-full border border-trait px-6 py-3 text-sm font-medium transition-colors hover:border-encre"
        >
          {accroche.actionSecondaire.libelle}
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Offre**

`apps/web/components/accueil/Offre.tsx` :

```tsx
import { Section } from "./Section";
import { ANCRES, offres, sections, type Offre as OffreType } from "@/data/accueil";

/** Les deux paliers de l'offre ; l'offre mise en avant est plus large et sombre. */
export function Offre() {
  return (
    <Section id={ANCRES.offre} {...sections.offre}>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {offres.map((offre) => (
          <CarteOffre key={offre.id} offre={offre} />
        ))}
      </div>
    </Section>
  );
}

function CarteOffre({ offre }: { offre: OffreType }) {
  const sombre = offre.miseEnAvant;

  return (
    <article
      className={`flex flex-col gap-6 rounded-3xl p-8 sm:p-10 ${
        sombre ? "bg-encre text-papier" : "border border-trait"
      }`}
    >
      <div>
        {sombre && (
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-braise-claire">
            Mon cœur de métier
          </p>
        )}
        <h3 className="font-serif text-3xl sm:text-4xl">{offre.titre}</h3>
        <p className={`mt-3 ${sombre ? "text-papier/75" : "text-encre-douce"}`}>{offre.pourQui}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {offre.livrables.map((livrable) => (
          <li key={livrable} className="flex gap-3">
            <span aria-hidden="true" className={sombre ? "text-braise-claire" : "text-brique"}>
              —
            </span>
            {livrable}
          </li>
        ))}
      </ul>
      <p className={`mt-auto text-sm ${sombre ? "text-papier/70" : "text-encre-douce"}`}>
        {offre.exemple}
      </p>
    </article>
  );
}
```

- [ ] **Step 6: Réalisations, méthode, parcours**

`apps/web/components/accueil/Realisations.tsx` :

```tsx
import { Section } from "./Section";
import { ANCRES, realisations, sections } from "@/data/accueil";

/** Réalisations anonymisées : besoin, livrable, technologies. */
export function Realisations() {
  return (
    <Section id={ANCRES.realisations} {...sections.realisations}>
      <div className="grid gap-5 md:grid-cols-2">
        {realisations.map((r) => (
          <article key={r.titre} className="flex flex-col gap-5 rounded-3xl border border-trait p-8">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-terre">{r.contexte}</p>
            <h3 className="font-serif text-3xl">{r.titre}</h3>
            <dl className="flex flex-col gap-4 text-encre-douce">
              <div>
                <dt className="text-sm font-medium text-encre">Le besoin</dt>
                <dd className="mt-1">{r.besoin}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-encre">Ce que j&apos;ai livré</dt>
                <dd className="mt-1">{r.livre}</dd>
              </div>
            </dl>
            <ul aria-label="Technologies" className="mt-auto flex flex-wrap gap-2">
              {r.stack.map((techno) => (
                <li key={techno} className="rounded-full border border-trait px-3 py-1 text-xs">
                  {techno}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  );
}
```

`apps/web/components/accueil/Methode.tsx` :

```tsx
import { Section } from "./Section";
import { ANCRES, etapes, sections } from "@/data/accueil";

/** Les étapes d'un projet, numérotées. */
export function Methode() {
  return (
    <Section id={ANCRES.methode} {...sections.methode}>
      <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
        {etapes.map((etape, index) => (
          <li key={etape.titre} className="flex flex-col gap-2 border-t border-trait pt-5">
            <span aria-hidden="true" className="font-serif text-3xl text-brique">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="font-medium">{etape.titre}</h3>
            <p className="text-sm text-encre-douce">{etape.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
```

`apps/web/components/accueil/Parcours.tsx` :

```tsx
import { Section } from "./Section";
import { ANCRES, parcours, sections } from "@/data/accueil";

/** Parcours en quelques lignes ; la version complète viendra avec /api/me. */
export function Parcours() {
  return (
    <Section id={ANCRES.parcours} {...sections.parcours}>
      <ul className="flex max-w-3xl flex-col divide-y divide-trait border-y border-trait">
        {parcours.map((ligne) => (
          <li key={ligne} className="py-4 text-lg">
            {ligne}
          </li>
        ))}
      </ul>
    </Section>
  );
}
```

- [ ] **Step 7: Section contact et formulaire aux couleurs du site**

`apps/web/components/accueil/SectionContact.tsx` :

```tsx
import { Section } from "./Section";
import { ContactForm } from "@/components/contact/ContactForm";
import { ANCRES, sections } from "@/data/accueil";
import { contact } from "@/data/contact";

/** Formulaire de contact du châssis, et l'e-mail pour qui préfère écrire. */
export function SectionContact() {
  return (
    <Section id={ANCRES.contact} {...sections.contact}>
      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <ContactForm />
        <div className="flex flex-col gap-3 text-encre-douce">
          <p>Vous préférez l&apos;e-mail ? Écrivez-moi directement :</p>
          <p>
            <a
              href={`mailto:${contact.email}`}
              className="font-serif text-3xl break-all text-encre underline decoration-trait underline-offset-4 hover:decoration-encre"
            >
              {contact.email}
            </a>
          </p>
        </div>
      </div>
    </Section>
  );
}
```

Dans `apps/web/components/contact/ContactForm.tsx` :

1. Remplacer les trois constantes de classes par :

```tsx
const champ = "rounded-xl border bg-papier px-4 py-3 outline-none transition-colors focus:border-encre";
const etiquette = "flex flex-col gap-2 text-sm font-medium";
```

2. Dans `attributs`, remplacer la ligne `className` par :

```tsx
      className: `${champ} ${fautif ? "border-brique" : "border-trait"}`,
```

3. Remplacer la classe du bouton par `"self-start rounded-full bg-encre px-6 py-3 text-sm font-medium text-papier transition-opacity hover:opacity-85 disabled:opacity-60"`.

4. Remplacer la classe du paragraphe RGPD `"text-xs"` par `"text-xs text-encre-douce"` et celle du message de retour `"border px-4 py-3 text-sm"` par `"rounded-xl border border-trait px-4 py-3 text-sm"`.

5. Remplacer le commentaire « Classes minimales : bordure et espacement. Le design est à faire par site. » par « Classes aux couleurs de l'Atelier clair. ».

- [ ] **Step 8: Page d'accueil**

Contenu complet de `apps/web/app/page.tsx` :

```tsx
import type { Metadata } from "next";
import { Accroche } from "@/components/accueil/Accroche";
import { Methode } from "@/components/accueil/Methode";
import { Offre } from "@/components/accueil/Offre";
import { Parcours } from "@/components/accueil/Parcours";
import { Realisations } from "@/components/accueil/Realisations";
import { SectionContact } from "@/components/accueil/SectionContact";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Accroche />
      <Offre />
      <Realisations />
      <Methode />
      <Parcours />
      <SectionContact />
    </>
  );
}
```

- [ ] **Step 9: Vérifier**

```bash
pnpm --filter web exec vitest run app/page.test.tsx
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected: PASS partout. Puis `pnpm dev` et contrôle visuel à 1440 px et 375 px de large : accroche en bas du premier écran, carte « Application métier » sombre et plus large, aucun débordement horizontal.

- [ ] **Step 10: Commit**

```bash
git add apps/web/components/accueil/Section.tsx apps/web/components/accueil/Accroche.tsx apps/web/components/accueil/Offre.tsx apps/web/components/accueil/Realisations.tsx apps/web/components/accueil/Methode.tsx apps/web/components/accueil/Parcours.tsx apps/web/components/accueil/SectionContact.tsx apps/web/components/contact/ContactForm.tsx apps/web/app/page.tsx apps/web/app/page.test.tsx
git commit -m "Page d'accueil : accroche, offre, réalisations, méthode, parcours et contact"
```

---

### Task 7: Logique pure de l'encre : décision et chronologie

**Files:**
- Create: `apps/web/lib/encre/decision.ts`, `apps/web/lib/encre/decision.test.ts`, `apps/web/lib/encre/chronologie.ts`, `apps/web/lib/encre/chronologie.test.ts`

**Interfaces:**
- Produces (dans `@/lib/encre/decision`) :
  - `type ModeEncre = "intro" | "halo-anime" | "halo-css"`
  - `type Contexte = { mouvementReduit: boolean; webgl2: boolean; dejaVu: boolean; defilee: boolean }`
  - `deciderMode(contexte: Contexte): ModeEncre`
  - `CLE_INTRO_VUE = "jouan.dev:intro-vue"`
  - `stockageLocal(): Storage | null` — ne lève jamais
  - `introDejaVue(stockage: Pick<Storage, "getItem"> | null): boolean` — ne lève jamais
  - `marquerIntroVue(stockage: Pick<Storage, "setItem"> | null): void` — ne lève jamais
- Produces (dans `@/lib/encre/chronologie`) :
  - `type Rvb = [number, number, number]`, `type Point = { x: number; y: number }` (fractions de l'écran, y depuis le haut)
  - `ENCRE`, `BRAISE`, `BRAISE_CLAIRE: Rvb`
  - `HALO = { x: 0.8, y: 0.24, rayon: 0.32, flou: 0.2 }`
  - `DUREE_INTRO = 1500`
  - `type EtatEncre = { centre: Point; rayon: number; flou: number; couleur: Rvb; melange: number; opaciteNom: number; terminee: boolean }`
  - `etatEncre(t: number, couverture: number): EtatEncre`
  - `etatHalo(centre: Point): EtatEncre`
  - `rayonCouverture(largeur: number, hauteur: number): number`
  - `cibleHalo(souris: Point | null, temps: number, tactile: boolean): Point`
  - `suivre(actuel: Point, cible: Point, facteur?: number): Point`

- [ ] **Step 1: Écrire les tests de la décision**

`apps/web/lib/encre/decision.test.ts` :

```ts
import { afterEach, describe, it, expect } from "vitest";
import {
  CLE_INTRO_VUE,
  deciderMode,
  introDejaVue,
  marquerIntroVue,
  stockageLocal,
  type Contexte,
} from "./decision";

const base: Contexte = { mouvementReduit: false, webgl2: true, dejaVu: false, defilee: false };

describe("deciderMode", () => {
  it("joue l'intro à la première visite, en haut de page", () => {
    expect(deciderMode(base)).toBe("intro");
  });

  it("passe directement au halo animé à la visite suivante", () => {
    expect(deciderMode({ ...base, dejaVu: true })).toBe("halo-anime");
  });

  // Review Focus 1 : rechargement en milieu de page, défilement restauré.
  it("ne joue pas l'intro si la page est déjà défilée", () => {
    expect(deciderMode({ ...base, defilee: true })).toBe("halo-anime");
  });

  it("se contente du halo CSS avec le mouvement réduit, même à la première visite", () => {
    expect(deciderMode({ ...base, mouvementReduit: true })).toBe("halo-css");
  });

  it("se contente du halo CSS sans WebGL2", () => {
    expect(deciderMode({ ...base, webgl2: false, dejaVu: true })).toBe("halo-css");
  });
});

describe("drapeau « intro déjà vue »", () => {
  const descripteur = Object.getOwnPropertyDescriptor(window, "localStorage");

  afterEach(() => {
    if (descripteur) Object.defineProperty(window, "localStorage", descripteur);
    else delete (window as { localStorage?: Storage }).localStorage;
    window.localStorage.clear();
  });

  it("se lit et s'écrit dans le stockage", () => {
    expect(introDejaVue(window.localStorage)).toBe(false);
    marquerIntroVue(window.localStorage);
    expect(window.localStorage.getItem(CLE_INTRO_VUE)).toBe("1");
    expect(introDejaVue(window.localStorage)).toBe(true);
  });

  it("vaut « jamais vue » sans stockage ou si la lecture lève", () => {
    expect(introDejaVue(null)).toBe(false);
    const refus = {
      getItem: () => {
        throw new DOMException("refusé", "SecurityError");
      },
    };
    expect(introDejaVue(refus)).toBe(false);
  });

  it("n'échoue pas si l'écriture lève", () => {
    const plein = {
      setItem: () => {
        throw new DOMException("plein", "QuotaExceededError");
      },
    };
    expect(() => marquerIntroVue(plein)).not.toThrow();
    expect(() => marquerIntroVue(null)).not.toThrow();
  });

  it("renvoie null quand l'accès même au stockage lève (navigation privée stricte)", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("refusé", "SecurityError");
      },
    });
    expect(stockageLocal()).toBeNull();
  });
});
```

- [ ] **Step 2: Écrire les tests de la chronologie**

`apps/web/lib/encre/chronologie.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import {
  BRAISE,
  DUREE_INTRO,
  ENCRE,
  HALO,
  cibleHalo,
  etatEncre,
  etatHalo,
  rayonCouverture,
  suivre,
} from "./chronologie";

const COUVERTURE = 1.2;

describe("etatEncre", () => {
  it("part d'une goutte invisible au centre, sans nom", () => {
    const etat = etatEncre(0, COUVERTURE);
    expect(etat.centre).toEqual({ x: 0.5, y: 0.5 });
    expect(etat.rayon).toBe(0);
    expect(etat.couleur).toEqual(ENCRE);
    expect(etat.opaciteNom).toBe(0);
    expect(etat.terminee).toBe(false);
  });

  it("couvre l'écran à 450 ms puis affiche le nom", () => {
    expect(etatEncre(450, COUVERTURE).rayon).toBeCloseTo(COUVERTURE);
    expect(etatEncre(650, COUVERTURE).opaciteNom).toBe(1);
  });

  it("se rétracte vers le halo entre 800 et 1500 ms en se réchauffant", () => {
    const milieu = etatEncre(1150, COUVERTURE);
    expect(milieu.rayon).toBeLessThan(COUVERTURE);
    expect(milieu.rayon).toBeGreaterThan(HALO.rayon);
    expect(milieu.centre.x).toBeGreaterThan(0.5);
    expect(milieu.centre.y).toBeLessThan(0.5);
    expect(milieu.melange).toBeGreaterThan(0);
    expect(milieu.melange).toBeLessThan(1);
    expect(milieu.opaciteNom).toBe(0);
  });

  it("a un rayon qui ne fait que décroître pendant le retrait", () => {
    let precedent = Infinity;
    for (let t = 800; t <= 1500; t += 50) {
      const { rayon } = etatEncre(t, COUVERTURE);
      expect(rayon).toBeLessThanOrEqual(precedent);
      precedent = rayon;
    }
  });

  it("se termine en halo à 1500 ms et au-delà", () => {
    const fin = etatEncre(DUREE_INTRO, COUVERTURE);
    expect(fin).toEqual(etatHalo({ x: HALO.x, y: HALO.y }));
    expect(fin.terminee).toBe(true);
    expect(fin.couleur).toEqual(BRAISE);
    expect(etatEncre(60_000, COUVERTURE).terminee).toBe(true);
  });

  it("traite un temps négatif comme le début", () => {
    expect(etatEncre(-20, COUVERTURE).rayon).toBe(0);
  });
});

describe("rayonCouverture", () => {
  // Review Focus 2 : l'encre doit couvrir les coins en paysage comme en portrait.
  it.each([
    [1920, 1080],
    [390, 844],
    [844, 390],
    [3440, 1440],
  ])("couvre les quatre coins d'un écran %i × %i", (largeur, hauteur) => {
    const demiDiagonale = Math.hypot(largeur / hauteur / 2, 0.5);
    expect(rayonCouverture(largeur, hauteur)).toBeGreaterThan(demiDiagonale * 1.15);
  });
});

describe("halo", () => {
  it("reste à sa place sans souris", () => {
    expect(cibleHalo(null, 0, false)).toEqual({ x: HALO.x, y: HALO.y });
  });

  it("est attiré d'un quart vers la souris", () => {
    const cible = cibleHalo({ x: 0, y: 0.24 }, 0, false);
    expect(cible.x).toBeCloseTo(HALO.x * 0.75);
    expect(cible.y).toBeCloseTo(HALO.y);
  });

  it("dérive seul, faiblement, sur écran tactile", () => {
    const a = cibleHalo(null, 0, true);
    const b = cibleHalo(null, 5000, true);
    expect(a).not.toEqual(b);
    expect(Math.abs(b.x - HALO.x)).toBeLessThanOrEqual(0.03);
    expect(Math.abs(b.y - HALO.y)).toBeLessThanOrEqual(0.03);
  });

  it("rejoint sa cible avec inertie", () => {
    let point = { x: 0, y: 0 };
    const cible = { x: 1, y: 1 };
    point = suivre(point, cible);
    expect(point.x).toBeGreaterThan(0);
    expect(point.x).toBeLessThan(1);
    for (let i = 0; i < 200; i += 1) point = suivre(point, cible);
    expect(point.x).toBeCloseTo(1, 3);
  });
});
```

- [ ] **Step 3: Vérifier qu'ils échouent**

Run: `pnpm --filter web exec vitest run lib/encre`
Expected: FAIL (modules introuvables).

- [ ] **Step 4: Implémenter la décision**

`apps/web/lib/encre/decision.ts` :

```ts
/** Ce que l'accueil affiche en fond. */
export type ModeEncre = "intro" | "halo-anime" | "halo-css";

export type Contexte = {
  /** `prefers-reduced-motion: reduce`. */
  mouvementReduit: boolean;
  /** Le navigateur expose WebGL2 (la création du contexte peut encore échouer). */
  webgl2: boolean;
  /** L'intro a déjà été vue sur ce navigateur. */
  dejaVu: boolean;
  /** La page n'est pas en haut (défilement restauré) : l'intro ne couvrirait pas l'écran. */
  defilee: boolean;
};

export function deciderMode(contexte: Contexte): ModeEncre {
  if (contexte.mouvementReduit || !contexte.webgl2) return "halo-css";
  if (contexte.dejaVu || contexte.defilee) return "halo-anime";
  return "intro";
}

export const CLE_INTRO_VUE = "jouan.dev:intro-vue";

/** `localStorage`, ou null quand le navigateur en refuse l'accès. */
export function stockageLocal(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Un stockage illisible vaut « jamais vue » : l'intro se rejoue, sans erreur. */
export function introDejaVue(stockage: Pick<Storage, "getItem"> | null): boolean {
  try {
    return stockage?.getItem(CLE_INTRO_VUE) === "1";
  } catch {
    return false;
  }
}

export function marquerIntroVue(stockage: Pick<Storage, "setItem"> | null): void {
  try {
    stockage?.setItem(CLE_INTRO_VUE, "1");
  } catch {
    // Stockage plein ou refusé : l'intro se rejouera à la prochaine visite.
  }
}
```

- [ ] **Step 5: Implémenter la chronologie**

`apps/web/lib/encre/chronologie.ts` :

```ts
/**
 * Chronologie de l'intro « goutte d'encre », sans WebGL ni DOM : le moteur
 * l'interroge à chaque image et transmet le résultat au shader.
 *
 * Unités : positions en fractions de l'écran (y depuis le haut) ; rayons et
 * flou en hauteurs d'écran.
 */

export type Rvb = [number, number, number];
export type Point = { x: number; y: number };

const rvb = (hex: number): Rvb => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

/** Mêmes valeurs que les jetons de app/globals.css. */
export const ENCRE = rvb(0x1b1a17);
export const BRAISE = rvb(0xe0582b);
export const BRAISE_CLAIRE = rvb(0xef9c62);

/** État final de l'intro, partagé avec le halo CSS (`.halo-css` dans app/globals.css). */
export const HALO = { x: 0.8, y: 0.24, rayon: 0.32, flou: 0.2 } as const;

const FIN_ETALEMENT = 450;
const FIN_NOM = 800;
export const DUREE_INTRO = 1500;
/** Bord net de la goutte, avant qu'elle ne se floute en halo. */
const FLOU_NET = 0.004;
const CENTRE: Point = { x: 0.5, y: 0.5 };

export type EtatEncre = {
  centre: Point;
  rayon: number;
  /** Demi-largeur du bord adouci. */
  flou: number;
  couleur: Rvb;
  /** 0 : encre unie ; 1 : dégradé braise du halo. */
  melange: number;
  opaciteNom: number;
  terminee: boolean;
};

const borner = (t: number) => Math.min(1, Math.max(0, t));
const lisser = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * État de l'encre `t` ms après le début de l'intro. `couverture` est le rayon
 * qui couvre tout l'écran depuis son centre (voir `rayonCouverture`).
 */
export function etatEncre(t: number, couverture: number): EtatEncre {
  if (t >= DUREE_INTRO) return etatHalo({ x: HALO.x, y: HALO.y });

  if (t < FIN_ETALEMENT) {
    return {
      centre: CENTRE,
      rayon: couverture * lisser(borner(t / FIN_ETALEMENT)),
      flou: FLOU_NET,
      couleur: ENCRE,
      melange: 0,
      opaciteNom: 0,
      terminee: false,
    };
  }

  if (t < FIN_NOM) {
    return {
      centre: CENTRE,
      rayon: couverture,
      flou: FLOU_NET,
      couleur: ENCRE,
      melange: 0,
      opaciteNom: borner((t - FIN_ETALEMENT) / 150),
      terminee: false,
    };
  }

  const k = lisser(borner((t - FIN_NOM) / (DUREE_INTRO - FIN_NOM)));
  return {
    centre: { x: mix(CENTRE.x, HALO.x, k), y: mix(CENTRE.y, HALO.y, k) },
    rayon: mix(couverture, HALO.rayon, k),
    flou: mix(FLOU_NET, HALO.flou, k),
    couleur: [mix(ENCRE[0], BRAISE[0], k), mix(ENCRE[1], BRAISE[1], k), mix(ENCRE[2], BRAISE[2], k)],
    melange: k,
    opaciteNom: 1 - borner((t - FIN_NOM) / 200),
    terminee: false,
  };
}

/** Le halo au repos, centré sur `centre`. */
export function etatHalo(centre: Point): EtatEncre {
  return {
    centre: { x: centre.x, y: centre.y },
    rayon: HALO.rayon,
    flou: HALO.flou,
    couleur: BRAISE,
    melange: 1,
    opaciteNom: 0,
    terminee: true,
  };
}

/** Rayon qui couvre tout l'écran depuis son centre, avec une marge pour le bord ondulé. */
export function rayonCouverture(largeur: number, hauteur: number): number {
  return Math.hypot(largeur / hauteur / 2, 0.5) * 1.25;
}

/** Cible du halo : sa position de repos, attirée d'un quart vers la souris ; dérive lente au doigt. */
export function cibleHalo(souris: Point | null, temps: number, tactile: boolean): Point {
  if (tactile) {
    return {
      x: HALO.x + 0.03 * Math.sin(temps / 3200),
      y: HALO.y + 0.03 * Math.cos(temps / 4100),
    };
  }
  if (!souris) return { x: HALO.x, y: HALO.y };
  return {
    x: HALO.x + (souris.x - HALO.x) * 0.25,
    y: HALO.y + (souris.y - HALO.y) * 0.25,
  };
}

/** Rapproche `actuel` de `cible` d'une fraction par image : l'inertie du halo. */
export function suivre(actuel: Point, cible: Point, facteur = 0.08): Point {
  return {
    x: actuel.x + (cible.x - actuel.x) * facteur,
    y: actuel.y + (cible.y - actuel.y) * facteur,
  };
}
```

- [ ] **Step 6: Vérifier que les tests passent**

Run: `pnpm --filter web exec vitest run lib/encre`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/encre/decision.ts apps/web/lib/encre/decision.test.ts apps/web/lib/encre/chronologie.ts apps/web/lib/encre/chronologie.test.ts
git commit -m "Encre : décision du fond et chronologie de l'intro"
```

---

### Task 8: Moteur WebGL2 de l'encre

**Files:**
- Create: `apps/web/lib/encre/shader.ts`, `apps/web/lib/encre/moteur.ts`, `apps/web/lib/encre/moteur.test.ts`

**Interfaces:**
- Consumes: `@/lib/encre/chronologie` (tâche 7).
- Produces (dans `@/lib/encre/moteur`) :
  - `MARQUEUR_MOTEUR = "moteur-encre:v1"` (repère du morceau de JS pour la tâche 11)
  - `type OptionsMoteur = { canvas: HTMLCanvasElement; intro: boolean; nom?: HTMLElement | null; tactile: boolean; surPret?: () => void; surFinIntro?: () => void; surEchec?: (raison: "webgl2-indisponible" | "shader" | "contexte-perdu") => void }`
  - `type Moteur = { demarrer(): void; sauter(): void; suivreSouris(point: Point | null): void; arreter(): void }`
  - `creerMoteur(options: OptionsMoteur): Moteur | null` — renvoie `null` après avoir appelé `surEchec` si WebGL2 ou le shader échouent.

Le rendu WebGL n'existe pas dans jsdom : seul le chemin d'échec est testé ici ; le rendu réel est vérifié par Playwright (tâche 10).

- [ ] **Step 1: Écrire le test du chemin d'échec**

`apps/web/lib/encre/moteur.test.ts` :

```ts
import { afterEach, describe, it, expect, vi } from "vitest";
import { creerMoteur } from "./moteur";

afterEach(() => vi.restoreAllMocks());

describe("creerMoteur", () => {
  it("signale l'absence de WebGL2 et renvoie null", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const surEchec = vi.fn();
    const moteur = creerMoteur({
      canvas: document.createElement("canvas"),
      intro: true,
      tactile: false,
      surEchec,
    });
    expect(moteur).toBeNull();
    expect(surEchec).toHaveBeenCalledWith("webgl2-indisponible");
  });
});
```

- [ ] **Step 2: Vérifier qu'il échoue**

Run: `pnpm --filter web exec vitest run lib/encre/moteur.test.ts`
Expected: FAIL (module `./moteur` introuvable).

- [ ] **Step 3: Shaders**

`apps/web/lib/encre/shader.ts` :

```ts
/**
 * Shaders de l'encre (GLSL ES 3.0). Un seul triangle couvre l'écran ; le
 * fragment shader dessine une forme ronde au bord organique : distance au
 * centre, déformée par un bruit fractal qui ondule lentement.
 */

export const SOURCE_SOMMET = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const SOURCE_FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 uResolution;     // pixels
uniform vec2 uCentre;         // fractions de l'écran, y depuis le haut
uniform float uRayon;         // hauteurs d'écran
uniform float uFlou;          // demi-largeur du bord, hauteurs d'écran
uniform vec3 uCouleur;
uniform vec3 uCouleurClaire;  // bord du halo
uniform float uMelange;       // 0 encre unie, 1 dégradé du halo
uniform float uTemps;         // secondes

out vec4 fragColor;

float hachage(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float bruit(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hachage(i), hachage(i + vec2(1.0, 0.0)), u.x),
    mix(hachage(i + vec2(0.0, 1.0)), hachage(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float valeur = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    valeur += amplitude * bruit(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return valeur;
}

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 p = (pixel - uCentre * uResolution) / uResolution.y;
  float d = length(p);
  // Bruit lu le long du contour (direction), donc sans couture.
  vec2 direction = p / max(d, 1e-4);
  float ondulation = (fbm(direction * 1.8 + uTemps * 0.25) - 0.5) * 0.22 * uRayon;
  float bord = d - (uRayon + ondulation);
  float alpha = 1.0 - smoothstep(-uFlou, uFlou + 0.002, bord);
  float versBord = smoothstep(0.0, uRayon + uFlou, d);
  vec3 couleur = mix(uCouleur, uCouleurClaire, versBord * uMelange);
  alpha *= mix(1.0, 0.85, uMelange);
  fragColor = vec4(couleur * alpha, alpha);
}
`;
```

- [ ] **Step 4: Moteur**

`apps/web/lib/encre/moteur.ts` :

```ts
import {
  BRAISE_CLAIRE,
  HALO,
  cibleHalo,
  etatEncre,
  etatHalo,
  rayonCouverture,
  suivre,
  type EtatEncre,
  type Point,
} from "./chronologie";
import { SOURCE_FRAGMENT, SOURCE_SOMMET } from "./shader";

/** Repère ce morceau de JS dans le build (scripts/verifier-taille-encre.mjs). */
export const MARQUEUR_MOTEUR = "moteur-encre:v1";

/** Au-delà, le coût GPU augmente sans gain visible sur un fond flou. */
const DPR_MAX = 1.5;
/** Écart au-dessous duquel le halo est considéré arrivé : on cesse de dessiner. */
const REPOS = 0.0005;

export type RaisonEchec = "webgl2-indisponible" | "shader" | "contexte-perdu";

export type OptionsMoteur = {
  canvas: HTMLCanvasElement;
  /** Joue l'intro avant de poser le halo ; sinon, halo directement. */
  intro: boolean;
  /** Élément HTML du nom, dont l'opacité suit l'intro. */
  nom?: HTMLElement | null;
  /** Écran tactile : le halo dérive seul au lieu de suivre la souris. */
  tactile: boolean;
  /** Première image dessinée : le canvas peut remplacer le halo CSS. */
  surPret?: () => void;
  surFinIntro?: () => void;
  surEchec?: (raison: RaisonEchec) => void;
};

export type Moteur = {
  demarrer(): void;
  /** Termine l'intro immédiatement : on saute à l'état « halo ». */
  sauter(): void;
  /** Position de la souris en fractions du canvas (y depuis le haut), ou null. */
  suivreSouris(point: Point | null): void;
  arreter(): void;
};

export function creerMoteur(options: OptionsMoteur): Moteur | null {
  const { canvas } = options;
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) {
    options.surEchec?.("webgl2-indisponible");
    return null;
  }

  const programme = compiler(gl);
  if (!programme) {
    options.surEchec?.("shader");
    return null;
  }
  canvas.dataset.moteur = MARQUEUR_MOTEUR;

  gl.useProgram(programme);
  const tampon = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tampon);
  // Un triangle qui déborde de l'écran le couvre entièrement.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(programme, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const u = (nom: string) => gl.getUniformLocation(programme, nom);
  const uniformes = {
    resolution: u("uResolution"),
    centre: u("uCentre"),
    rayon: u("uRayon"),
    flou: u("uFlou"),
    couleur: u("uCouleur"),
    couleurClaire: u("uCouleurClaire"),
    melange: u("uMelange"),
    temps: u("uTemps"),
  };
  gl.uniform3fv(uniformes.couleurClaire, BRAISE_CLAIRE);

  let debut = 0;
  let introFinie = !options.intro;
  let halo: Point = { x: HALO.x, y: HALO.y };
  let souris: Point | null = null;
  let image = 0;
  let pret = false;
  let arrete = false;
  /** Le haut de page est à l'écran ; sinon, inutile de dessiner (dérive tactile). */
  let aLEcran = true;

  function redimensionner() {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    const largeur = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const hauteur = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== largeur || canvas.height !== hauteur) {
      canvas.width = largeur;
      canvas.height = hauteur;
    }
    gl!.viewport(0, 0, canvas.width, canvas.height);
  }

  function dessiner(etat: EtatEncre, maintenant: number) {
    gl!.uniform2f(uniformes.resolution, canvas.width, canvas.height);
    gl!.uniform2f(uniformes.centre, etat.centre.x, etat.centre.y);
    gl!.uniform1f(uniformes.rayon, etat.rayon);
    gl!.uniform1f(uniformes.flou, etat.flou);
    gl!.uniform3fv(uniformes.couleur, etat.couleur);
    gl!.uniform1f(uniformes.melange, etat.melange);
    gl!.uniform1f(uniformes.temps, maintenant / 1000);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    if (!pret) {
      pret = true;
      options.surPret?.();
    }
  }

  function terminerIntro() {
    introFinie = true;
    if (options.nom) options.nom.style.opacity = "0";
    options.surFinIntro?.();
  }

  function boucle(maintenant: number) {
    image = 0;
    if (arrete) return;
    redimensionner();

    if (!introFinie) {
      const etat = etatEncre(maintenant - debut, rayonCouverture(canvas.width, canvas.height));
      if (options.nom) options.nom.style.opacity = String(etat.opaciteNom);
      dessiner(etat, maintenant);
      if (etat.terminee) terminerIntro();
      demanderImage();
      return;
    }

    const cible = cibleHalo(souris, maintenant, options.tactile);
    halo = suivre(halo, cible);
    dessiner(etatHalo(halo), maintenant);
    // Au repos, plus rien ne bouge : la prochaine image viendra d'un mouvement
    // de souris, d'un redimensionnement ou du retour sur l'onglet.
    const auRepos = !options.tactile && Math.hypot(cible.x - halo.x, cible.y - halo.y) < REPOS;
    if (!auRepos) demanderImage();
  }

  function demanderImage() {
    if (image || arrete || !aLEcran || document.visibilityState !== "visible") return;
    image = requestAnimationFrame(boucle);
  }

  const surVisibilite = () => demanderImage();
  const surContextePerdu = (evenement: Event) => {
    evenement.preventDefault();
    arreter();
    options.surEchec?.("contexte-perdu");
  };
  const observateur =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => demanderImage());
  const vigie =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entree]) => {
          aLEcran = entree.isIntersecting;
          demanderImage();
        });

  function arreter() {
    arrete = true;
    if (image) cancelAnimationFrame(image);
    image = 0;
    document.removeEventListener("visibilitychange", surVisibilite);
    canvas.removeEventListener("webglcontextlost", surContextePerdu);
    observateur?.disconnect();
    vigie?.disconnect();
  }

  document.addEventListener("visibilitychange", surVisibilite);
  canvas.addEventListener("webglcontextlost", surContextePerdu);
  observateur?.observe(canvas);
  vigie?.observe(canvas);

  return {
    demarrer() {
      debut = performance.now();
      demanderImage();
    },
    sauter() {
      if (introFinie) return;
      terminerIntro();
      demanderImage();
    },
    suivreSouris(point) {
      souris = point;
      demanderImage();
    },
    arreter,
  };
}

function compiler(gl: WebGL2RenderingContext): WebGLProgram | null {
  const sommet = shader(gl, gl.VERTEX_SHADER, SOURCE_SOMMET);
  const fragment = shader(gl, gl.FRAGMENT_SHADER, SOURCE_FRAGMENT);
  if (!sommet || !fragment) return null;

  const programme = gl.createProgram();
  gl.attachShader(programme, sommet);
  gl.attachShader(programme, fragment);
  gl.linkProgram(programme);
  if (!gl.getProgramParameter(programme, gl.LINK_STATUS)) {
    // Avertissement et non erreur : le repli CSS prend le relais.
    console.warn("[encre] Édition des liens du shader impossible :", gl.getProgramInfoLog(programme));
    return null;
  }
  return programme;
}

function shader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const resultat = gl.createShader(type);
  if (!resultat) return null;
  gl.shaderSource(resultat, source);
  gl.compileShader(resultat);
  if (!gl.getShaderParameter(resultat, gl.COMPILE_STATUS)) {
    console.warn("[encre] Compilation du shader impossible :", gl.getShaderInfoLog(resultat));
    return null;
  }
  return resultat;
}
```

- [ ] **Step 5: Vérifier que le test passe et que tout compile**

```bash
pnpm --filter web exec vitest run lib/encre
pnpm lint && pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/encre/shader.ts apps/web/lib/encre/moteur.ts apps/web/lib/encre/moteur.test.ts
git commit -m "Encre : shader et moteur WebGL2 sans bibliothèque"
```

---

### Task 9: Fond de l'accueil : halo CSS et intro

**Files:**
- Create: `apps/web/components/accueil/HaloCss.tsx`, `apps/web/components/accueil/IntroEncre.tsx`, `apps/web/components/accueil/IntroEncre.test.tsx`
- Modify: `apps/web/app/globals.css`, `apps/web/app/page.tsx`, `apps/web/vitest.setup.ts`

**Interfaces:**
- Consumes: `@/lib/encre/decision` (tâche 7) ; `creerMoteur`, `Moteur` de `@/lib/encre/moteur` (tâche 8), **importé dynamiquement** ; `siteName`.
- Produces: `<IntroEncre />` (composant client sans props) qui rend `div.fond-accueil[data-mode][data-intro][data-encre]` contenant `.halo-css`, un `canvas` (sauf en mode `halo-css`) et `p.fond-accueil__nom` (en mode `intro`). Attributs :
  - `data-mode` : `intro | halo-anime | halo-css`
  - `data-intro` : `en-cours | terminee`, absent hors intro
  - `data-encre` : `actif` (canvas affiché) | `repli` (WebGL a échoué), absent avant la première image

- [ ] **Step 1: matchMedia dans jsdom**

Ajouter à la fin de `apps/web/vitest.setup.ts` :

```ts
// jsdom n'implémente pas matchMedia : par défaut, aucune requête ne correspond.
// Les tests qui ont besoin d'une autre réponse la remplacent (vi.stubGlobal).
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
```

- [ ] **Step 2: Écrire les tests du composant**

`apps/web/components/accueil/IntroEncre.test.tsx` :

```tsx
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import type { OptionsMoteur } from "@/lib/encre/moteur";
import { CLE_INTRO_VUE } from "@/lib/encre/decision";

const { creerMoteur, moteur } = vi.hoisted(() => ({
  creerMoteur: vi.fn(),
  moteur: { demarrer: vi.fn(), sauter: vi.fn(), suivreSouris: vi.fn(), arreter: vi.fn() },
}));
vi.mock("@/lib/encre/moteur", () => ({ creerMoteur }));

import { IntroEncre } from "./IntroEncre";

function navigateur({ mouvementReduit = false, webgl2 = true } = {}) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce") ? mouvementReduit : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
  if (webgl2) vi.stubGlobal("WebGL2RenderingContext", class {});
}

const fond = (container: HTMLElement) => container.querySelector(".fond-accueil")!;
const options = (): OptionsMoteur => creerMoteur.mock.calls[0][0];

beforeEach(() => {
  window.localStorage.clear();
  creerMoteur.mockReset();
  creerMoteur.mockImplementation(() => moteur);
  Object.values(moteur).forEach((fn) => fn.mockReset());
});

afterEach(() => vi.unstubAllGlobals());

describe("IntroEncre", () => {
  it("se contente du halo CSS avec le mouvement réduit, sans charger le moteur", async () => {
    navigateur({ mouvementReduit: true });
    const { container } = render(<IntroEncre />);
    await act(async () => {});
    expect(fond(container)).toHaveAttribute("data-mode", "halo-css");
    expect(container.querySelector("canvas")).toBeNull();
    expect(creerMoteur).not.toHaveBeenCalled();
  });

  it("joue l'intro à la première visite et la marque comme vue", async () => {
    navigateur();
    const { container } = render(<IntroEncre />);
    await waitFor(() => expect(creerMoteur).toHaveBeenCalled());
    expect(options()).toMatchObject({ intro: true, tactile: false });
    expect(moteur.demarrer).toHaveBeenCalled();
    expect(fond(container)).toHaveAttribute("data-mode", "intro");

    act(() => options().surPret?.());
    expect(fond(container)).toHaveAttribute("data-intro", "en-cours");
    expect(fond(container)).toHaveAttribute("data-encre", "actif");

    act(() => options().surFinIntro?.());
    expect(fond(container)).toHaveAttribute("data-intro", "terminee");
    expect(window.localStorage.getItem(CLE_INTRO_VUE)).toBe("1");
  });

  it("passe l'intro au premier clic", async () => {
    navigateur();
    render(<IntroEncre />);
    await waitFor(() => expect(moteur.demarrer).toHaveBeenCalled());
    fireEvent.pointerDown(window);
    expect(moteur.sauter).toHaveBeenCalled();
  });

  it("pose directement le halo animé quand l'intro a déjà été vue", async () => {
    navigateur();
    window.localStorage.setItem(CLE_INTRO_VUE, "1");
    const { container } = render(<IntroEncre />);
    await waitFor(() => expect(creerMoteur).toHaveBeenCalled());
    expect(options()).toMatchObject({ intro: false });
    expect(fond(container)).toHaveAttribute("data-mode", "halo-anime");
  });

  it("revient au halo CSS quand le moteur échoue", async () => {
    navigateur();
    creerMoteur.mockImplementation((o: OptionsMoteur) => {
      o.surEchec?.("shader");
      return null;
    });
    const { container } = render(<IntroEncre />);
    await waitFor(() => expect(fond(container)).toHaveAttribute("data-encre", "repli"));
    expect(fond(container)).toHaveAttribute("data-mode", "halo-css");
    expect(fond(container)).not.toHaveAttribute("data-intro");
  });
});
```

- [ ] **Step 3: Vérifier qu'ils échouent**

Run: `pnpm --filter web exec vitest run components/accueil/IntroEncre.test.tsx`
Expected: FAIL (module `./IntroEncre` introuvable).

- [ ] **Step 4: Halo CSS**

`apps/web/components/accueil/HaloCss.tsx` :

```tsx
/**
 * Halo de repli, en CSS pur (`.halo-css` dans app/globals.css) : présent dans
 * le HTML dès la première réponse, il suffit sans JavaScript, avec le
 * mouvement réduit ou quand WebGL échoue. Il reproduit l'état final de
 * l'intro : le canvas s'y substitue sans saut visible.
 */
export function HaloCss() {
  return <div className="halo-css" />;
}
```

- [ ] **Step 5: Styles du fond**

Ajouter à la fin de `apps/web/app/globals.css` :

```css
/*
 * Fond de l'accueil (components/accueil/IntroEncre.tsx) : couvre le premier
 * écran, sous le contenu ; passe au-dessus de tout pendant l'intro.
 * Le corps est en `position: relative` (app/layout.tsx).
 */
.fond-accueil {
  position: absolute;
  inset: 0 0 auto 0;
  height: 100svh;
  z-index: -10;
  overflow: hidden;
  pointer-events: none;
}

.fond-accueil[data-intro="en-cours"] {
  z-index: 50;
}

.fond-accueil canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* Halo final de l'intro : mêmes position et rayon que HALO dans
   lib/encre/chronologie.ts (x 80 %, y 24 %, rayon 0,32 hauteur d'écran). */
.halo-css {
  position: absolute;
  left: 80%;
  top: 24%;
  width: 64svh;
  height: 64svh;
  translate: -50% -50%;
  border-radius: 9999px;
  background: radial-gradient(
    circle at 45% 45%,
    var(--color-braise) 0%,
    var(--color-braise-claire) 40%,
    transparent 70%
  );
  filter: blur(28px);
  opacity: 0.85;
  transition: opacity 300ms;
}

/* Le canvas dessine le halo : on efface la copie CSS pour ne pas le doubler. */
.fond-accueil[data-encre="actif"] .halo-css {
  opacity: 0;
}

.fond-accueil__nom {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(2.5rem, 7vw, 5rem);
  color: var(--color-papier);
  opacity: 0;
}
```

- [ ] **Step 6: Composant `IntroEncre`**

`apps/web/components/accueil/IntroEncre.tsx` :

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { HaloCss } from "./HaloCss";
import { siteName } from "@/data/site";
import {
  deciderMode,
  introDejaVue,
  marquerIntroVue,
  stockageLocal,
  type ModeEncre,
} from "@/lib/encre/decision";
import type { Moteur } from "@/lib/encre/moteur";

/** Un geste du visiteur termine l'intro immédiatement. */
const EVENEMENTS_SAUT = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/**
 * Fond de l'accueil. Rendu côté serveur, c'est un simple halo CSS ; une fois
 * monté, il décide s'il faut jouer l'intro « goutte d'encre », puis importe
 * le moteur WebGL dans son propre morceau de JS, après l'affichage.
 *
 * Attributs lus par le CSS et les tests de bout en bout :
 * - data-mode : intro | halo-anime | halo-css
 * - data-intro : en-cours | terminee (absent hors intro)
 * - data-encre : actif (canvas affiché) | repli (WebGL a échoué)
 */
export function IntroEncre() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nomRef = useRef<HTMLParagraphElement>(null);
  const [mode, setMode] = useState<ModeEncre>("halo-css");
  const [intro, setIntro] = useState<"en-cours" | "terminee">();
  const [encre, setEncre] = useState<"actif" | "repli">();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la décision dépend du navigateur : impossible au rendu serveur
    setMode(
      deciderMode({
        mouvementReduit: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        webgl2: typeof WebGL2RenderingContext !== "undefined",
        dejaVu: introDejaVue(stockageLocal()),
        defilee: window.scrollY > 0,
      })
    );
  }, []);

  useEffect(() => {
    if (mode === "halo-css") return;

    const jouerIntro = mode === "intro";
    let moteur: Moteur | null = null;
    let annule = false;

    const sauter = () => moteur?.sauter();
    const suivre = (evenement: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cadre = canvas.getBoundingClientRect();
      moteur?.suivreSouris({
        x: (evenement.clientX - cadre.left) / cadre.width,
        y: (evenement.clientY - cadre.top) / cadre.height,
      });
    };

    const echouer = () => {
      moteur?.arreter();
      setEncre("repli");
      setIntro(undefined);
      setMode("halo-css");
    };

    import("@/lib/encre/moteur")
      .then(({ creerMoteur }) => {
        if (annule || !canvasRef.current) return;
        moteur = creerMoteur({
          canvas: canvasRef.current,
          intro: jouerIntro,
          nom: nomRef.current,
          tactile: window.matchMedia("(pointer: coarse)").matches,
          surPret: () => {
            setEncre("actif");
            if (jouerIntro) setIntro("en-cours");
          },
          surFinIntro: () => {
            setIntro("terminee");
            marquerIntroVue(stockageLocal());
          },
          surEchec: echouer,
        });
        moteur?.demarrer();
      })
      // Morceau de JS introuvable (réseau coupé, déploiement en cours).
      .catch(echouer);

    if (jouerIntro) {
      EVENEMENTS_SAUT.forEach((nom) => window.addEventListener(nom, sauter, { passive: true }));
    }
    window.addEventListener("pointermove", suivre, { passive: true });

    return () => {
      annule = true;
      moteur?.arreter();
      EVENEMENTS_SAUT.forEach((nom) => window.removeEventListener(nom, sauter));
      window.removeEventListener("pointermove", suivre);
    };
  }, [mode]);

  return (
    <div
      className="fond-accueil"
      data-mode={mode}
      data-intro={intro}
      data-encre={encre}
      aria-hidden="true"
    >
      <HaloCss />
      {mode !== "halo-css" && <canvas ref={canvasRef} />}
      {mode === "intro" && (
        <p ref={nomRef} className="fond-accueil__nom">
          {siteName}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Brancher le fond sur la page**

Dans `apps/web/app/page.tsx`, ajouter l'import :

```tsx
import { IntroEncre } from "@/components/accueil/IntroEncre";
```

et le composant en premier enfant du fragment, avant `<Accroche />` :

```tsx
      <IntroEncre />
```

- [ ] **Step 8: Vérifier**

```bash
pnpm --filter web exec vitest run components/accueil/IntroEncre.test.tsx
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected: PASS partout. Puis `pnpm dev`, ouvrir l'accueil dans une fenêtre privée : la goutte d'encre couvre l'écran, « Augustin Jouan » apparaît, l'encre se rétracte en halo orange en haut à droite, qui suit la souris ; un rechargement normal n'affiche plus l'intro ; un clic pendant l'intro la termine. Comparer avec la maquette retenue (référence citée dans la spec, section 6).

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/accueil/HaloCss.tsx apps/web/components/accueil/IntroEncre.tsx apps/web/components/accueil/IntroEncre.test.tsx apps/web/app/globals.css apps/web/app/page.tsx apps/web/vitest.setup.ts
git commit -m "Accueil : intro « goutte d'encre » et halo de repli"
```

---

### Task 10: Tests de bout en bout (Playwright)

**Files:**
- Create: `apps/web/playwright.config.ts`, `apps/web/scripts/demarrer-standalone.mjs`, `apps/web/e2e/smtp-factice.ts`, `apps/web/e2e/accueil.spec.ts`, `apps/web/e2e/intro.spec.ts`, `apps/web/e2e/replis.spec.ts`, `apps/web/e2e/sans-js.spec.ts`, `apps/web/e2e/contact.spec.ts`
- Modify: `apps/web/package.json`, `apps/web/vitest.config.ts`, `.gitignore`

**Interfaces:**
- Consumes: `sections`, `accroche` (`../data/accueil`), `contact` (`../data/contact`) ; attributs `data-mode`, `data-intro`, `data-encre` (tâche 9) ; clé `jouan.dev:intro-vue` ; `x-forwarded-for` lu par l'action de contact.
- Produces: script `pnpm --filter web e2e` (après `pnpm build`) ; `scripts/demarrer-standalone.mjs`, réutilisé par Lighthouse (tâche 11).

- [ ] **Step 1: Dépendances et scripts**

```bash
pnpm --filter web add -D @playwright/test smtp-server @types/smtp-server
pnpm --filter web exec playwright install chromium
```

Dans `apps/web/package.json`, ajouter aux scripts :

```json
    "e2e": "playwright test",
```

- [ ] **Step 2: Isoler Vitest des specs Playwright**

Dans `apps/web/vitest.config.ts`, importer `configDefaults` et exclure `e2e/` :

```ts
import { configDefaults, defineConfig } from "vitest/config";
```

```ts
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // Les specs Playwright (e2e/) tournent dans leur propre exécuteur.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
```

Dans `.gitignore`, ajouter :

```gitignore
# Playwright et Lighthouse
test-results/
playwright-report/
.lighthouseci/
```

- [ ] **Step 3: Serveur de production local**

`apps/web/scripts/demarrer-standalone.mjs` :

```js
/**
 * Lance le serveur de production tel qu'il tourne dans l'image Docker :
 * `.next/standalone` complété de `public` et `.next/static`, que le mode
 * standalone ne copie pas. Sert aux tests de bout en bout et à Lighthouse.
 *
 * Prérequis : `pnpm build`. Port et hôte : variables PORT et HOSTNAME.
 */
import { spawn } from "node:child_process";
import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
// Monorepo : le serveur est rangé sous le chemin de l'app dans le standalone.
const standalone = join(app, ".next/standalone/apps/web");

if (!existsSync(join(standalone, "server.js"))) {
  console.error("Build introuvable : lancer `pnpm build` d'abord.");
  process.exit(1);
}

cpSync(join(app, "public"), join(standalone, "public"), { recursive: true });
cpSync(join(app, ".next/static"), join(standalone, ".next/static"), { recursive: true });

const serveur = spawn(process.execPath, [join(standalone, "server.js")], {
  stdio: "inherit",
  env: process.env,
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => serveur.kill(signal));
serveur.on("exit", (code) => process.exit(code ?? 0));
```

- [ ] **Step 4: Faux serveur SMTP**

`apps/web/e2e/smtp-factice.ts` :

```ts
import { SMTPServer } from "smtp-server";

/** Un message qui contient ce mot est refusé : sert à tester le message d'échec. */
export const MOT_REFUS = "REFUS-SMTP";
export const PORT_SMTP = 2525;

/** Démarré avant les tests (globalSetup) ; la fonction renvoyée l'arrête. */
export default async function demarrerSmtpFactice() {
  const serveur = new SMTPServer({
    authOptional: true,
    allowInsecureAuth: true,
    disabledCommands: ["STARTTLS"],
    logger: false,
    onAuth(_auth, _session, rappel) {
      rappel(null, { user: "test" });
    },
    onData(flux, _session, rappel) {
      let contenu = "";
      flux.on("data", (morceau: Buffer) => {
        contenu += morceau.toString();
      });
      flux.on("end", () => {
        if (!contenu.includes(MOT_REFUS)) return rappel();
        rappel(Object.assign(new Error("Message refusé"), { responseCode: 550 }));
      });
    },
  });

  await new Promise<void>((resoudre) => serveur.listen(PORT_SMTP, "127.0.0.1", resoudre));
  return () => new Promise<void>((resoudre) => serveur.close(() => resoudre()));
}
```

- [ ] **Step 5: Configuration Playwright**

`apps/web/playwright.config.ts` :

```ts
import { defineConfig, devices } from "@playwright/test";
import { PORT_SMTP } from "./e2e/smtp-factice";

const PORT = 3100;
// Chromium sans GPU (CI, conteneurs) : WebGL2 passe par SwiftShader.
const lancement = { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] };

/** Prérequis : `pnpm build`. Le serveur testé est celui de production. */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/smtp-factice.ts",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"], launchOptions: lancement } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: lancement } },
  ],
  webServer: {
    command: "node scripts/demarrer-standalone.mjs",
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(PORT_SMTP),
      SMTP_SECURE: "false",
      SMTP_USER: "test",
      SMTP_PASS: "test",
      CONTACT_FROM: "Test <test@jouan.dev>",
      CONTACT_TO: "boite@jouan.dev",
    },
  },
});
```

- [ ] **Step 6: Spec de l'accueil**

`apps/web/e2e/accueil.spec.ts` :

```ts
import { test, expect, type Page } from "@playwright/test";
import { accroche, sections } from "../data/accueil";

function surveillerErreurs(page: Page): string[] {
  const erreurs: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") erreurs.push(message.text());
  });
  page.on("pageerror", (erreur) => erreurs.push(erreur.message));
  return erreurs;
}

test("affiche tous les blocs, sans erreur dans la console", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(accroche.titreAccent);
  for (const { titre } of Object.values(sections)) {
    await expect(page.getByRole("heading", { level: 2, name: titre })).toBeAttached();
  }
  await expect(page.locator(".fond-accueil")).toHaveAttribute("data-intro", "terminee", {
    timeout: 5000,
  });
  expect(erreurs).toEqual([]);
});

test("le bouton principal mène au formulaire", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: accroche.actionPrincipale.libelle }).click();
  await expect(page.getByLabel("Nom", { exact: true })).toBeInViewport();
});

// Review Focus 4 : petit écran sans défilement horizontal.
test("aucun défilement horizontal à 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  const deborde = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );
  expect(deborde).toBe(false);
});

// Review Focus 5 : les ancres de l'en-tête fonctionnent depuis une page légale.
test("les liens de l'en-tête ramènent aux sections depuis une page légale", async ({ page }) => {
  await page.goto("/mentions-legales");
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Offre" })
    .click();
  await expect(page).toHaveURL(/\/#offre$/);
  await expect(page.getByRole("heading", { level: 2, name: sections.offre.titre })).toBeInViewport();
});
```

- [ ] **Step 7: Spec de l'intro**

`apps/web/e2e/intro.spec.ts` :

```ts
import { test, expect } from "@playwright/test";

const CLE = "jouan.dev:intro-vue";

test("première visite : l'intro se joue puis devient le halo", async ({ page }) => {
  await page.goto("/");
  const fond = page.locator(".fond-accueil");
  await expect(fond).toHaveAttribute("data-mode", "intro");
  await expect(fond).toHaveAttribute("data-encre", "actif");
  await expect(fond).toHaveAttribute("data-intro", "terminee", { timeout: 5000 });
  expect(await page.evaluate((cle) => localStorage.getItem(cle), CLE)).toBe("1");
});

test("un clic termine l'intro immédiatement", async ({ page }) => {
  await page.goto("/");
  const fond = page.locator(".fond-accueil");
  await expect(fond).toHaveAttribute("data-intro", "en-cours");
  await page.mouse.click(5, 5);
  await expect(fond).toHaveAttribute("data-intro", "terminee", { timeout: 500 });
});

// Review Focus 3 : le clavier n'est jamais piégé sous l'encre.
test("Tab termine l'intro et atteint le lien d'évitement", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Pas de clavier sur mobile.");
  await page.goto("/");
  const fond = page.locator(".fond-accueil");
  await expect(fond).toHaveAttribute("data-intro", "en-cours");
  await page.keyboard.press("Tab");
  await expect(fond).toHaveAttribute("data-intro", "terminee", { timeout: 500 });
  await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeFocused();
});

test("visite suivante : pas d'intro, halo animé", async ({ page }) => {
  await page.addInitScript((cle) => localStorage.setItem(cle, "1"), CLE);
  await page.goto("/");
  const fond = page.locator(".fond-accueil");
  await expect(fond).toHaveAttribute("data-mode", "halo-anime");
  await expect(fond).toHaveAttribute("data-encre", "actif");
  await expect(fond).not.toHaveAttribute("data-intro", /.+/);
});
```

- [ ] **Step 8: Spec des replis**

`apps/web/e2e/replis.spec.ts` :

```ts
import { test, expect, type Page } from "@playwright/test";

function surveillerErreurs(page: Page): string[] {
  const erreurs: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") erreurs.push(message.text());
  });
  page.on("pageerror", (erreur) => erreurs.push(erreur.message));
  return erreurs;
}

test.describe("mouvement réduit", () => {
  test.use({ reducedMotion: "reduce" });

  test("halo CSS, sans canvas", async ({ page }) => {
    await page.goto("/");
    const fond = page.locator(".fond-accueil");
    await expect(fond).toHaveAttribute("data-mode", "halo-css");
    await expect(fond.locator("canvas")).toHaveCount(0);
    await expect(fond.locator(".halo-css")).toBeVisible();
  });
});

test("WebGL2 absent : halo CSS", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).WebGL2RenderingContext;
  });
  await page.goto("/");
  await expect(page.locator(".fond-accueil")).toHaveAttribute("data-mode", "halo-css");
  expect(erreurs).toEqual([]);
});

test("contexte WebGL2 refusé : repli sans erreur", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...reste: unknown[]
    ) {
      if (type === "webgl2") return null;
      return (original as (...args: unknown[]) => unknown).call(this, type, ...reste);
    } as unknown as typeof original;
  });
  await page.goto("/");
  const fond = page.locator(".fond-accueil");
  await expect(fond).toHaveAttribute("data-encre", "repli");
  await expect(fond).toHaveAttribute("data-mode", "halo-css");
  await expect(fond.locator(".halo-css")).toBeVisible();
  expect(erreurs).toEqual([]);
});

test("shader qui ne compile pas : repli sans erreur", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.addInitScript(() => {
    WebGL2RenderingContext.prototype.getShaderParameter = () => false;
  });
  await page.goto("/");
  await expect(page.locator(".fond-accueil")).toHaveAttribute("data-encre", "repli");
  expect(erreurs).toEqual([]);
});

test("stockage inaccessible : l'intro se joue sans erreur", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("refusé", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await expect(page.locator(".fond-accueil")).toHaveAttribute("data-intro", "terminee", {
    timeout: 5000,
  });
  expect(erreurs).toEqual([]);
});
```

- [ ] **Step 9: Spec sans JavaScript**

`apps/web/e2e/sans-js.spec.ts` :

```ts
import { test, expect } from "@playwright/test";
import { accroche, sections } from "../data/accueil";

test.use({ javaScriptEnabled: false });

test("la page est complète et lisible sans JavaScript", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(accroche.titreAccent);
  for (const { titre } of Object.values(sections)) {
    await expect(page.getByRole("heading", { level: 2, name: titre })).toBeVisible();
  }
  await expect(page.locator(".halo-css")).toBeVisible();
  await expect(page.locator(".fond-accueil canvas")).toHaveCount(0);
});

test("le formulaire s'envoie sans JavaScript (action serveur)", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ordinateur", "Un envoi suffit : chacun compte dans la limite.");
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.1.${Date.now() % 250}.${testInfo.retry + 1}` });
  await page.goto("/#contact");
  await page.getByLabel("Nom", { exact: true }).fill("Client Sans JS");
  await page.getByLabel("Email", { exact: true }).fill("client@exemple.fr");
  await page.getByLabel("Message", { exact: true }).fill("Bonjour, sans JavaScript.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  // Le message de retour est visé par son id : Next insère aussi un élément
  // role="alert" (l'annonceur de navigation), qui rendrait getByRole ambigu.
  await expect(page.locator("#contact-retour")).toContainText("Merci");
});
```

- [ ] **Step 10: Spec du formulaire**

`apps/web/e2e/contact.spec.ts` :

```ts
import { test, expect, type Page } from "@playwright/test";
import { contact } from "../data/contact";
import { MOT_REFUS } from "./smtp-factice";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ordinateur", "Un envoi suffit : chacun compte dans la limite.");
  // Une adresse par test : la limite de 5 envois par heure et par IP ne doit
  // pas lier les tests entre eux.
  const octet = () => Math.floor(Math.random() * 250) + 1;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.0.${octet()}.${octet()}` });
});

async function envoyer(page: Page, message: string) {
  await page.goto("/#contact");
  await page.getByLabel("Nom", { exact: true }).fill("Client Test");
  await page.getByLabel("Email", { exact: true }).fill("client@exemple.fr");
  await page.getByLabel("Message", { exact: true }).fill(message);
  await page.getByRole("button", { name: "Envoyer" }).click();
}

// Le message de retour est visé par son id : Next insère aussi un élément
// role="alert" (l'annonceur de navigation), qui rendrait getByRole ambigu.
const retour = (page: Page) => page.locator("#contact-retour");

test("un message valide est envoyé", async ({ page }) => {
  await envoyer(page, "Bonjour, je voudrais un devis.");
  await expect(retour(page)).toHaveAttribute("role", "status");
  await expect(retour(page)).toContainText("Merci");
});

test("un refus du serveur d'envoi affiche une erreur avec l'e-mail direct", async ({ page }) => {
  await envoyer(page, `Test ${MOT_REFUS}`);
  await expect(retour(page)).toHaveAttribute("role", "alert");
  await expect(retour(page)).toContainText(contact.email);
});
```

- [ ] **Step 11: Lancer les tests**

```bash
pnpm build
pnpm e2e
```

Expected: tous les tests passent sur `ordinateur` et `mobile` (les tests réservés à l'ordinateur apparaissent « skipped » sur mobile). Si le test du formulaire sans JavaScript échoue alors que celui avec JavaScript passe, **s'arrêter et le signaler** : la spec affirme que le formulaire fonctionne sans JS, il faut décider ensemble (corriger le formulaire ou la spec) plutôt que d'affaiblir le test.

- [ ] **Step 12: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/vitest.config.ts .gitignore apps/web/playwright.config.ts apps/web/scripts/demarrer-standalone.mjs apps/web/e2e/smtp-factice.ts apps/web/e2e/accueil.spec.ts apps/web/e2e/intro.spec.ts apps/web/e2e/replis.spec.ts apps/web/e2e/sans-js.spec.ts apps/web/e2e/contact.spec.ts
git commit -m "Tests de bout en bout : accueil, intro, replis, sans JS, formulaire"
```

---

### Task 11: Budgets de performance en CI

**Files:**
- Create: `apps/web/lighthouserc.json`, `apps/web/scripts/verifier-taille-encre.mjs`
- Modify: `apps/web/package.json`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `scripts/demarrer-standalone.mjs` (tâche 10) ; `MARQUEUR_MOTEUR = "moteur-encre:v1"` (tâche 8).
- Produces: scripts `pnpm --filter web lighthouse` et `pnpm --filter web verifier-taille-encre` ; job CI `e2e` dont dépend le job `image`.

- [ ] **Step 1: Contrôle de la taille du moteur**

`apps/web/scripts/verifier-taille-encre.mjs` :

```js
/**
 * Vérifie que le moteur de l'intro, chargé après l'affichage, reste sous
 * 10 Ko compressés. Son morceau de JS est repéré par le marqueur
 * `MARQUEUR_MOTEUR` de lib/encre/moteur.ts.
 *
 * Usage : pnpm --filter web verifier-taille-encre   (après `pnpm build`)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const LIMITE = 10 * 1024;
const MARQUEUR = "moteur-encre:v1";
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const dossier = join(app, ".next/static/chunks");

function* fichiersJs(chemin) {
  for (const nom of readdirSync(chemin)) {
    const complet = join(chemin, nom);
    if (statSync(complet).isDirectory()) yield* fichiersJs(complet);
    else if (nom.endsWith(".js")) yield complet;
  }
}

const trouves = [...fichiersJs(dossier)].filter((f) => readFileSync(f, "utf8").includes(MARQUEUR));
if (trouves.length !== 1) {
  console.error(`Morceau du moteur introuvable ou ambigu (${trouves.length} trouvé(s)) : lancer pnpm build.`);
  process.exit(1);
}

const taille = gzipSync(readFileSync(trouves[0])).length;
console.log(
  `Moteur de l'intro (${relative(app, trouves[0])}) : ${(taille / 1024).toFixed(1)} Ko compressés, limite ${LIMITE / 1024} Ko.`
);
if (taille > LIMITE) process.exit(1);
```

- [ ] **Step 2: Configuration Lighthouse CI**

`apps/web/lighthouserc.json` :

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "node scripts/demarrer-standalone.mjs",
      "startServerReadyPattern": "Ready",
      "url": ["http://127.0.0.1:3000/"],
      "numberOfRuns": 3,
      "settings": {
        "chromeFlags": "--no-sandbox --headless=new"
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95, "aggregationMethod": "median-run" }],
        "categories:accessibility": ["error", { "minScore": 0.95, "aggregationMethod": "median-run" }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 1800, "aggregationMethod": "median-run" }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.05, "aggregationMethod": "median-run" }],
        "resource-summary:script:size": ["error", { "maxNumericValue": 122880, "aggregationMethod": "median-run" }]
      }
    },
    "upload": {
      "target": "filesystem",
      "outputDir": ".lighthouseci"
    }
  }
}
```

(Réglages par défaut de Lighthouse : émulation mobile et réseau lent simulé. 122 880 octets = 120 Ko de JS compressé, intro comprise.)

- [ ] **Step 3: Dépendance et scripts**

```bash
pnpm --filter web add -D @lhci/cli
```

Dans `apps/web/package.json`, ajouter aux scripts :

```json
    "lighthouse": "lhci autorun --config=lighthouserc.json",
    "verifier-taille-encre": "node scripts/verifier-taille-encre.mjs",
```

- [ ] **Step 4: Lancer les deux contrôles en local**

```bash
pnpm build
pnpm --filter web verifier-taille-encre
pnpm --filter web lighthouse
```

Expected : « Moteur de l'intro … Ko compressés » sous 10 Ko ; Lighthouse : « All results processed! » sans assertion en échec. Si une assertion échoue, **lire le rapport** (`apps/web/.lighthouseci/`) et corriger la cause (image, police, contraste, JS) ; ne jamais relever un seuil sans l'accord d'Augustin.

- [ ] **Step 5: Job CI**

Dans `.github/workflows/ci.yml`, ajouter ce job après `verifier` :

```yaml
  e2e:
    name: Bout en bout et performances
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm build

      - run: pnpm --filter web exec playwright install --with-deps chromium

      - run: pnpm e2e

      - run: pnpm --filter web verifier-taille-encre

      - run: pnpm --filter web lighthouse

      - name: Rapports en cas d'échec
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: rapports
          path: |
            apps/web/playwright-report
            apps/web/.lighthouseci
          retention-days: 7
```

et faire dépendre le job `image` des deux :

```yaml
    needs: [verifier, e2e]
```

Vérifier : `npx -y yaml-lint .github/workflows/ci.yml` → `✔ YAML Lint successful.`

- [ ] **Step 6: Commit**

```bash
git add apps/web/lighthouserc.json apps/web/scripts/verifier-taille-encre.mjs apps/web/package.json pnpm-lock.yaml .github/workflows/ci.yml
git commit -m "Budgets de performance vérifiés en CI : Lighthouse et taille du moteur"
```

---

### Task 12: README, vérification finale et mise en ligne

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: tout ce qui précède.

- [ ] **Step 1: Réécrire le README**

Contenu complet de `README.md` :

````markdown
# jouan.dev

Portfolio d'Augustin Jouan, développeur full stack indépendant. Le site
lui-même sert de démonstration : page d'accueil « Atelier clair », intro
WebGL « goutte d'encre » écrite à la main, budgets de performance vérifiés
en CI.

Conception : `docs/superpowers/specs/` · Plans : `docs/superpowers/plans/`.

## Structure

Monorepo pnpm :

- `apps/web` — le site (Next.js 16, React 19, TypeScript, Tailwind 4).
  - `data/` — tout le contenu (accueil, identité, mentions légales).
  - `lib/encre/` — l'intro : décision et chronologie (pures, testées),
    shader et moteur WebGL2.
  - `e2e/` — tests Playwright.

## Commandes

Depuis la racine (Node 22, pnpm 10 — `npm install -g pnpm@10.34.6`) :

```bash
pnpm install
pnpm dev                              # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm e2e                # tests de bout en bout (serveur de production)
pnpm --filter web lighthouse          # budgets de performance
pnpm --filter web verifier-taille-encre
```

Les tests de bout en bout démarrent un faux serveur SMTP local (port 2525).

## Déploiement

Comme les sites vitrines (voir `docs/deploiement-site.md`) : la CI construit
l'image `ghcr.io/augustin-jouan/jouan.dev`, Coolify la tire.

- Prévisualisation : `https://portfolio.jouan.dev`.
- `SITE_URL` vaut déjà l'URL finale `https://jouan.dev` (figée au build).
- Avant la bascule sur `jouan.dev` : compléter les mentions légales
  (`apps/web/data/legal.ts`), décommenter `pnpm verifier-placeholders` dans
  la CI, puis domaine nu + redirection `www` → domaine nu dans Coolify.
````

- [ ] **Step 2: Vérification complète**

```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test
pnpm build
pnpm e2e
pnpm --filter web verifier-taille-encre
pnpm --filter web lighthouse
docker build -t jouan-dev .
```

Expected : tout passe. Noter la sortie de chaque commande pour le compte rendu.

- [ ] **Step 3: Contrôle visuel et LCP réel**

`pnpm build` puis `PORT=3000 node apps/web/scripts/demarrer-standalone.mjs`, et dans Chrome (fenêtre privée, ordinateur, bonne connexion) :

1. L'accueil correspond à la maquette retenue : papier, accroche en serif avec « sur mesure » en brique, halo orange en haut à droite.
2. L'intro se joue (≈ 1,5 s), puis le halo suit la souris.
3. DevTools → Performance → enregistrer un rechargement : **LCP < 1 s** (spec, section 9). Noter la valeur.
4. Mode responsive à 375 px : pas de débordement, cartes empilées.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "README du portfolio : structure, commandes, déploiement"
```

- [ ] **Step 5: Mise en ligne en prévisualisation (à faire par Augustin)**

Ces étapes demandent ses accès (OVH, Coolify, GitHub) ; l'agent ne les exécute pas et les liste dans son compte rendu :

1. Pousser `main` : la CI publie l'image `ghcr.io/augustin-jouan/jouan.dev`.
2. OVH, zone `jouan.dev` : entrée **A** `portfolio` → IP du VPS.
3. Coolify : ressource *Docker Image* `ghcr.io/augustin-jouan/jouan.dev:latest`, domaine `https://portfolio.jouan.dev`, port **3000**, variables SMTP (`SMTP_*`, `CONTACT_FROM=Site jouan.dev <postmaster@jouan.dev>`, `CONTACT_TO`).
4. GitHub : secrets `COOLIFY_WEBHOOK_URL` et `COOLIFY_TOKEN` (procédure dans `docs/deploiement-site.md`, section 4).
5. OVH : créer l'adresse `contact@jouan.dev` (alias ou redirection vers sa boîte), affichée sur le site.
6. Vérifier : `curl -sI https://portfolio.jouan.dev/ | head -1` → `HTTP/2 200`, puis un envoi réel par le formulaire.
````

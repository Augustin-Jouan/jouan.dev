# Études de cas — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deux pages d'étude de cas anonymisées sur jouan.dev, dont une contient une démo interactive « Suivi de marchés » (mini-application Vite + React affichée dans une iframe).

**Architecture:** Nouveau paquet `apps/demo-marches` (Vite, React 19, Tailwind 4 avec le thème de l'application réelle, règles de calcul pures), construit dans `apps/web/public/demo/suivi-de-marches/`. Côté site, une route statique `app/realisations/[slug]` alimentée par `data/realisations.ts`, une fenêtre qui monte l'iframe quand elle arrive à l'écran, des vignettes de partage en Instrument Serif et des captures retouchées du site vitrine.

**Tech Stack:** pnpm 10 (workspace), Next.js 16.4, React 19.2.4, Vite, Tailwind 4, Vitest + Testing Library, Playwright, Lighthouse CI.

**Spec:** `docs/superpowers/specs/2026-10-09-etudes-de-cas-design.md`

## Global Constraints

- Tout le contenu est en français. Aucun nom de client, de projet réel, d'employeur, de ville réelle de client, de téléphone ou d'adresse e-mail réels dans le dépôt, les images ou les messages de commit. La liste des termes interdits est **hors dépôt** : `.superpowers/sdd/2026-10-09-etudes-de-cas/termes-interdits.txt` (git-ignoré) ; ne jamais la copier dans un fichier versionné.
- Le nom de l'application réelle n'apparaît jamais : la démo s'appelle « Suivi de marchés ».
- Les dépôts de référence — l'application réelle (`$APP_REELLE`) et le site vitrine (`$SITE_VITRINE`), chemins définis dans `.superpowers/sdd/2026-10-09-etudes-de-cas/chemins.txt` (git-ignoré) — sont en **lecture seule** : aucune écriture, aucune commande git modifiante. Toute copie se fait dans `/tmp/claude-1000/-home-augustin-jouan--config-Claude-scratch-workspaces-9d152a3f-39c0-4a53-b74b-96fb09ba4a1f-d8dab488-80ca-48ce-84e0-5787fd8aebfb-scratch-2026-10-08-1977df/eba3baa3-ef1b-406b-90ac-3f56cca33a5e/scratchpad/`. Ne jamais copier un fichier de données, un logo ou un texte de ces dépôts : seulement du style (jetons, thème, briques, polices sous licence OFL) et des règles de calcul réécrites.
- React `19.2.4` exactement dans les deux applications ; Node 22 ; pnpm 10.34.6.
- Aucune nouvelle dépendance d'exécution dans `apps/web` sauf `@fontsource/instrument-serif`.
- Les en-têtes de sécurité du site ne changent pas, sauf sous `/demo/:path*` (`frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`).
- Budgets : seuils de `apps/web/lighthouserc.json` inchangés et appliqués aux deux nouvelles pages ; JS compressé de la démo ≤ 110 Kio (112 640 o) ; budgets de l'accueil inchangés.
- La démo n'utilise ni réseau, ni `localStorage`, ni cookie.
- Montants en centimes entiers ; arrondi `ROUND_HALF_UP` au centime.
- Commits ciblés (fichiers nommés un par un, jamais `git add -A`), messages en français ; jamais de `push`, `--force`, `reset --hard`.
- Avant de toucher une API Next, lire le guide correspondant dans `apps/web/node_modules/next/dist/docs/` (voir `apps/web/AGENTS.md`).

## Review Focus

1. Montants saisis comme un humain les tape (« 9 850,00 », « 9850 », « 9 850 € », « -1 450 », « 1234,5 ») : lus correctement ; une saisie illisible affiche un message et le dernier calcul valide reste affiché — test dans la tâche 2 (`lireMontant`) et la tâche 6.
2. Ajouts et suppressions d'avenants répétés : un numéro n'est jamais réutilisé ; ligne, total du chantier et panneau restent cohérents — test dans la tâche 3 (réducteur) et la tâche 5.
3. Clavier seul dans la démo : onglets aux flèches, panneau et aperçu modaux avec piège du focus, Échap qui ferme la surcouche la plus haute et rend le focus au déclencheur — test dans la tâche 5.
4. Écrans étroits : sous 768 px, la page montre l'aperçu et un bouton « Ouvrir la démo » (pas d'iframe à double défilement) ; en plein écran, la démo ne déborde pas horizontalement hors des zones prévues — e2e dans la tâche 11.
5. Anonymat : aucun terme interdit dans le dépôt ni dans le texte visible des captures — contrôle dans les tâches 10 et 12.

---

### Task 1: Socle de la démo (paquet, build, intégration)

**Files:**
- Create: `apps/demo-marches/package.json`, `apps/demo-marches/vite.config.ts`, `apps/demo-marches/tsconfig.json`, `apps/demo-marches/eslint.config.js`, `apps/demo-marches/vitest.setup.ts`, `apps/demo-marches/index.html`, `apps/demo-marches/src/main.tsx`, `apps/demo-marches/src/App.tsx`, `apps/demo-marches/src/App.test.tsx`, `apps/demo-marches/src/styles/{index,jetons,theme,base}.css`, `apps/demo-marches/src/polices/*.woff2`, `apps/web/scripts/verifier-taille-demo.mjs`
- Modify: `package.json` (racine), `apps/web/package.json`, `.gitignore`, `Dockerfile`, `.github/workflows/ci.yml`, `pnpm-lock.yaml`

**Interfaces:**
- Produces: paquet `demo-marches` (`pnpm --filter demo-marches dev|build|lint|typecheck|test`) ; sortie `apps/web/public/demo/suivi-de-marches/index.html` + `assets/` ; `pnpm build` (racine) construit la démo puis le site ; `pnpm --filter web verifier-taille-demo`.
- Produces: utilitaires Tailwind de l'application réelle (`bg-paper`, `text-ink`, `font-titre`, `text-13`…) disponibles dans la démo.

- [ ] **Step 1: Créer le paquet et installer les dépendances**

`apps/demo-marches/package.json` :

```json
{
  "name": "demo-marches",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "19.2.4",
    "react-dom": "19.2.4"
  }
}
```

Puis, depuis la racine :

```bash
pnpm --filter demo-marches add -D vite @vitejs/plugin-react tailwindcss@^4 @tailwindcss/vite@^4 typescript@^5 vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @testing-library/dom @types/react @types/react-dom eslint@^9 typescript-eslint eslint-plugin-react-hooks globals
```

Prendre pour `vite` et `vitest` des versions compatibles avec celles déjà résolues dans `apps/web` (même majeure de `vitest`, `@vitejs/plugin-react` ^6).

- [ ] **Step 2: Configuration Vite, TypeScript, ESLint, Vitest**

`apps/demo-marches/vite.config.ts` :

```ts
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * La démo est servie par le site sous /demo/suivi-de-marches/ : elle se
 * construit directement dans son dossier `public` (ignoré par Git).
 * Le polyfill de préchargement injecterait un script en ligne, que la CSP du
 * site refuse : on s'en passe (navigateurs récents seulement).
 */
export default defineConfig({
  base: "/demo/suivi-de-marches/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: fileURLToPath(new URL("../web/public/demo/suivi-de-marches", import.meta.url)),
    emptyOutDir: true,
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: false,
  },
});
```

`apps/demo-marches/vitest.setup.ts` :

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
```

`apps/demo-marches/tsconfig.json` :

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src", "vite.config.ts", "vitest.setup.ts"]
}
```

`apps/demo-marches/eslint.config.js` :

```js
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
);
```

- [ ] **Step 3: `index.html` sans script en ligne, non indexé**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Démo — Suivi de marchés</title>
  </head>
  <body>
    <div id="racine"></div>
    <noscript>Cette démo a besoin de JavaScript.</noscript>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Reprendre l'habillage de l'application réelle**

Lire (sans rien modifier) `$APP_REELLE/src/styles/{jetons,theme,base}.css` et `docs/interface.md`. Les recopier dans `apps/demo-marches/src/styles/` en les adaptant :

- `jetons.css` : garder les jetons ; forcer le thème clair (`:root { color-scheme: light; }`), de sorte que `light-dark()` rende la valeur claire ;
- `theme.css` : identique (`@theme inline`, palettes Tailwind retirées) ;
- `base.css` : `@font-face` pointant vers `../polices/<fichier>.woff2` (chemins relatifs, que Vite réécrit avec la `base`) ; ajouter en tête un commentaire « Polices Figtree, Outfit, Spline Sans Mono : licence SIL OFL 1.1 » ; retirer tout ce qui dépend de `data-theme` sombre ;
- `index.css` : `@import "tailwindcss" …` puis les trois feuilles, dans l'ordre de `src/app/globals.css` de l'application réelle.

Copier les fichiers `woff2` utilisés par `base.css` depuis `$APP_REELLE/public/polices/` vers `apps/demo-marches/src/polices/`. Aucun logo, aucune image, aucun texte.

- [ ] **Step 5: Coquille minimale et son test**

`apps/demo-marches/src/main.tsx` :

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/index.css";

createRoot(document.getElementById("racine")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`apps/demo-marches/src/App.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("affiche le nom de la démo et le bandeau des données fictives", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "Suivi de marchés" })).toBeInTheDocument();
    expect(screen.getByText("Démo — données fictives")).toBeInTheDocument();
  });
});
```

`apps/demo-marches/src/App.tsx` (remplacé à la tâche 5) :

```tsx
export function App() {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <p className="bg-accent px-4 py-1 text-center text-12 text-on-accent">Démo — données fictives</p>
      <h1 className="px-6 py-4 font-titre text-22">Suivi de marchés</h1>
    </div>
  );
}
```

Run: `pnpm --filter demo-marches test` → PASS ; `pnpm --filter demo-marches lint && pnpm --filter demo-marches typecheck` → OK.

- [ ] **Step 6: Build intégré au site**

Racine `package.json`, scripts :

```json
    "build": "pnpm --filter demo-marches build && pnpm --filter web build",
    "dev:demo": "pnpm --filter demo-marches dev",
```

`.gitignore`, ajouter :

```gitignore
# Sortie du build de la démo (apps/demo-marches)
apps/web/public/demo/
```

`apps/web/scripts/verifier-taille-demo.mjs` :

```js
/**
 * Budget de la démo « Suivi de marchés » : tout son JavaScript, compressé,
 * doit tenir sous 110 Kio. Prérequis : `pnpm build` à la racine.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const LIMITE = 110 * 1024;
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const dossier = join(app, "public/demo/suivi-de-marches/assets");

if (!existsSync(dossier)) {
  console.error("Démo introuvable : lancer `pnpm build` à la racine d'abord.");
  process.exit(1);
}

const fichiers = readdirSync(dossier).filter((nom) => nom.endsWith(".js"));
const total = fichiers.reduce((somme, nom) => somme + gzipSync(readFileSync(join(dossier, nom))).length, 0);

if (fichiers.length === 0) {
  console.error("Aucun fichier JavaScript dans la démo construite.");
  process.exit(1);
}
const ko = (o) => (o / 1024).toFixed(1);
console.log(`Démo : ${fichiers.length} fichier(s) JS, ${ko(total)} Ko compressés, limite ${ko(LIMITE)} Ko.`);
if (total > LIMITE) process.exit(1);
```

`apps/web/package.json`, script : `"verifier-taille-demo": "node scripts/verifier-taille-demo.mjs",`

`Dockerfile` :
- étape `deps` : après `COPY apps/web/package.json apps/web/`, ajouter `COPY apps/demo-marches/package.json apps/demo-marches/` ;
- étape `build` : ajouter `COPY --from=deps /app/apps/demo-marches/node_modules ./apps/demo-marches/node_modules` ; remplacer `RUN pnpm --filter web build` par `RUN pnpm build` (la démo puis le site ; la sortie de la démo tombe dans `apps/web/public`, déjà copiée dans l'image).

`.github/workflows/ci.yml`, job `e2e`, après `verifier-taille-encre` :

```yaml
      - run: pnpm --filter web verifier-taille-demo
```

(Les jobs lancent déjà `pnpm build` à la racine : rien d'autre à changer.)

- [ ] **Step 7: Vérifier**

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test
pnpm build
ls apps/web/public/demo/suivi-de-marches/index.html
grep -c "<script" apps/web/public/demo/suivi-de-marches/index.html
pnpm --filter web verifier-taille-demo
docker build -t jouan-dev .
```

Expected : tout vert ; l'`index.html` construit ne contient qu'un `<script type="module" src="/demo/suivi-de-marches/assets/…">` (aucun script en ligne) ; budget largement tenu (≈ 60 Ko) ; image construite.

- [ ] **Step 8: Commit**

```bash
git add apps/demo-marches package.json pnpm-lock.yaml .gitignore Dockerfile .github/workflows/ci.yml apps/web/package.json apps/web/scripts/verifier-taille-demo.mjs
git commit -m "Démo suivi de marchés : socle Vite, habillage et intégration au build"
```

---

### Task 2: Règles de calcul pures

**Files:**
- Create: `apps/demo-marches/src/domaine/montants.ts`, `montants.test.ts`, `avenants.ts`, `avenants.test.ts`, `certificat.ts`, `certificat.test.ts`, `planning.ts`, `planning.test.ts`

**Interfaces:**
- Produces:
  - `type Centimes = number`
  - `appliquerTaux(montant: Centimes, tauxPourCent: number): Centimes`
  - `lireMontant(texte: string): Centimes | null`
  - `formaterEuros(montant: Centimes): string` ; `formaterEcart(montant: Centimes): string` (signe toujours affiché sauf zéro)
  - `type Avenant = { id: string; numero: number; libelle: string; montantHT: Centimes }`
  - `montantEngage(marcheHT: Centimes, avenants: readonly Avenant[]): Centimes`
  - `validerAvenant(libelle: string, montantTexte: string): { ok: true; libelle: string; montantHT: Centimes } | { ok: false; champ: "libelle" | "montant"; message: string }`
  - `type EntreeCertificat`, `type LignesCertificat`, `calculerCertificat(entree): { ok: true; lignes: LignesCertificat } | { ok: false; message: string }`
  - `type Semaine = { index: number; lundi: string; libelle: string }`, `semainesEntre(debutIso, finIso): Semaine[]`, `placerBarre(debutIso, finIso, origineIso): { colonne: number; duree: number }`

- [ ] **Step 1: Tests des montants**

`montants.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { appliquerTaux, formaterEcart, formaterEuros, lireMontant } from "./montants";

const espaces = (texte: string) => texte.replace(/[  ]/g, " ");

describe("appliquerTaux", () => {
  it("arrondit au centime, demi-centime au-dessus", () => {
    expect(appliquerTaux(265_000, 20)).toBe(53_000);
    expect(appliquerTaux(118_409, 10)).toBe(11_841); // 118,409 → 118,41
    expect(appliquerTaux(130_250, 5)).toBe(6_513); // 65,125 → 65,13
  });
  it("traite un taux décimal et un montant négatif symétriquement", () => {
    expect(appliquerTaux(10_000, 5.5)).toBe(550);
    expect(appliquerTaux(-130_250, 5)).toBe(-6_513);
  });
});

describe("lireMontant", () => {
  it.each([
    ["9 850,00", 985_000],
    ["9850", 985_000],
    ["9 850 €", 985_000],
    ["9 850,5", 985_050],
    ["1234,5", 123_450],
    ["12.600", null], // point de milliers ambigu : refusé
    ["-1 450", -145_000],
    ["+ 850", 85_000],
    ["0", 0],
    ["-0", 0],
    ["", null],
    ["abc", null],
    ["12,345", null],
  ])("%s → %s", (texte, attendu) => {
    expect(lireMontant(texte)).toBe(attendu);
  });
});

describe("formats", () => {
  it("affiche les euros à la française", () => {
    expect(espaces(formaterEuros(302_100))).toBe("3 021,00 €");
    expect(espaces(formaterEcart(85_000))).toBe("+850,00 €");
    expect(espaces(formaterEcart(-145_000))).toBe("-1 450,00 €");
  });
});
```

Note : `"12.600"` est refusé parce qu'un point suivi de trois chiffres est ambigu ; seuls 1 ou 2 décimales sont acceptées après `,` ou `.`.

- [ ] **Step 2: Lancer, voir échouer** — `pnpm --filter demo-marches test src/domaine` → FAIL (module absent).

- [ ] **Step 3: Implémenter `montants.ts`**

```ts
/** Montants en centimes entiers : aucun calcul ne passe par un nombre à virgule. */
export type Centimes = number;

/**
 * Montant × taux (en %), arrondi au centime, demi-centime au-dessus en valeur
 * absolue (ROUND_HALF_UP), comme sur un certificat papier.
 */
export function appliquerTaux(montant: Centimes, tauxPourCent: number): Centimes {
  const centiemesDePourCent = Math.round(tauxPourCent * 100); // 20 % → 2000
  const produit = Math.abs(montant) * centiemesDePourCent; // en 1/10 000 de centime
  const arrondi = Math.floor((produit + 5_000) / 10_000);
  return montant < 0 ? -arrondi : arrondi;
}

const SEPARATEURS = /[\s  ]/g;
const MOTIF = /^([+-])?\s*(\d{1,3}(?:[\s  ]\d{3})+|\d+)(?:[,.](\d{1,2}))?\s*€?$/;

/** Lit un montant tapé à la française ; `null` s'il est illisible. */
export function lireMontant(texte: string): Centimes | null {
  const correspondance = MOTIF.exec(texte.trim());
  if (!correspondance) return null;
  const [, signe, entiers = "", decimales = ""] = correspondance;
  const valeur = Number(entiers.replace(SEPARATEURS, "")) * 100 + Number(decimales.padEnd(2, "0"));
  if (valeur === 0) return 0;
  return signe === "-" ? -valeur : valeur;
}

const EUROS = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const ECART = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", signDisplay: "exceptZero" });

export const formaterEuros = (montant: Centimes) => EUROS.format(montant / 100);
export const formaterEcart = (montant: Centimes) => ECART.format(montant / 100);
```

(`"12.600"` : la seconde alternative `\d+` prend `12`, puis `.600` a trois chiffres → pas de correspondance → `null`.)

- [ ] **Step 4: Tests des avenants et du certificat**

`avenants.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { montantEngage, validerAvenant } from "./avenants";

describe("montantEngage", () => {
  it("ajoute les avenants, positifs ou négatifs, au marché initial", () => {
    const avenants = [
      { id: "a", numero: 1, libelle: "Plus-value", montantHT: 85_000 },
      { id: "b", numero: 2, libelle: "Moins-value", montantHT: -30_000 },
    ];
    expect(montantEngage(1_260_000, avenants)).toBe(1_315_000);
    expect(montantEngage(1_260_000, [])).toBe(1_260_000);
  });
});

describe("validerAvenant", () => {
  it("accepte un libellé et un montant non nul", () => {
    expect(validerAvenant("  Plinthes ", "+1 000")).toEqual({ ok: true, libelle: "Plinthes", montantHT: 100_000 });
  });
  it("refuse un libellé vide, un montant illisible ou nul", () => {
    expect(validerAvenant(" ", "100")).toEqual({ ok: false, champ: "libelle", message: "Donnez un libellé à l'avenant." });
    expect(validerAvenant("Plinthes", "cent")).toEqual({ ok: false, champ: "montant", message: "Montant illisible : écrivez par exemple 1 250,00 ou -300." });
    expect(validerAvenant("Plinthes", "0")).toEqual({ ok: false, champ: "montant", message: "Un avenant ne peut pas être nul." });
  });
});
```

`certificat.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { calculerCertificat, type EntreeCertificat } from "./certificat";

const reference: EntreeCertificat = {
  marcheHT: 1_260_000,
  avenants: [85_000],
  acomptesAnterieurs: [300_000, 420_000],
  tauxTVA: 20,
  tauxRetenue: 5,
  caution: false,
  cumulTexte: "9 850,00",
};

describe("calculerCertificat", () => {
  it("reproduit le cas de référence calculé à la main", () => {
    expect(calculerCertificat(reference)).toEqual({
      ok: true,
      lignes: {
        numero: 3,
        totalHT: 1_345_000,
        totalTVA: 269_000,
        totalTTC: 1_614_000,
        precedentsHT: 720_000,
        precedentsTVA: 144_000,
        precedentsTTC: 864_000,
        presentHT: 265_000,
        presentTVA: 53_000,
        presentTTC: 318_000,
        retenue: 15_900,
        mandate: 302_100,
      },
    });
  });

  it("sans retenue quand une caution bancaire la remplace", () => {
    const resultat = calculerCertificat({ ...reference, caution: true });
    expect(resultat.ok && resultat.lignes.retenue).toBe(0);
    expect(resultat.ok && resultat.lignes.mandate).toBe(318_000);
  });

  it("arrondit le demi-centime au-dessus", () => {
    const resultat = calculerCertificat({
      marcheHT: 500_000,
      avenants: [],
      acomptesAnterieurs: [],
      tauxTVA: 10,
      tauxRetenue: 5,
      caution: false,
      cumulTexte: "1 184,09",
    });
    expect(resultat).toMatchObject({ ok: true, lignes: { presentTVA: 11_841, presentTTC: 130_250, retenue: 6_513, mandate: 123_737 } });
  });

  it.each([
    ["", "Saisissez le montant des travaux réalisés."],
    ["sept mille", "Montant illisible : écrivez par exemple 9 850,00."],
    ["7 000", "Le présent acompte doit être positif."],
    ["7 200", "Le présent acompte doit être positif."],
    ["13 450,01", "Le cumul dépasse le montant du marché avenants compris."],
  ])("refuse le cumul « %s »", (cumulTexte, message) => {
    expect(calculerCertificat({ ...reference, cumulTexte })).toEqual({ ok: false, message });
  });
});
```

- [ ] **Step 5: Implémenter `avenants.ts` et `certificat.ts`**

`avenants.ts` :

```ts
import { lireMontant, type Centimes } from "./montants";

export type Avenant = { id: string; numero: number; libelle: string; montantHT: Centimes };

/** Marché initial + avenants (plus-values et moins-values), en HT. */
export function montantEngage(marcheHT: Centimes, avenants: readonly Avenant[]): Centimes {
  return avenants.reduce((total, avenant) => total + avenant.montantHT, marcheHT);
}

export type ValidationAvenant =
  | { ok: true; libelle: string; montantHT: Centimes }
  | { ok: false; champ: "libelle" | "montant"; message: string };

export function validerAvenant(libelle: string, montantTexte: string): ValidationAvenant {
  const propre = libelle.trim();
  if (!propre) return { ok: false, champ: "libelle", message: "Donnez un libellé à l'avenant." };
  const montantHT = lireMontant(montantTexte);
  if (montantHT === null) {
    return { ok: false, champ: "montant", message: "Montant illisible : écrivez par exemple 1 250,00 ou -300." };
  }
  if (montantHT === 0) return { ok: false, champ: "montant", message: "Un avenant ne peut pas être nul." };
  return { ok: true, libelle: propre, montantHT };
}
```

`certificat.ts` :

```ts
import { appliquerTaux, lireMontant, type Centimes } from "./montants";

export type EntreeCertificat = {
  marcheHT: Centimes;
  /** Montants HT des avenants du lot. */
  avenants: readonly Centimes[];
  acomptesAnterieurs: readonly Centimes[];
  tauxTVA: number;
  tauxRetenue: number;
  caution: boolean;
  cumulTexte: string;
};

export type LignesCertificat = {
  numero: number;
  totalHT: Centimes;
  totalTVA: Centimes;
  totalTTC: Centimes;
  precedentsHT: Centimes;
  precedentsTVA: Centimes;
  precedentsTTC: Centimes;
  presentHT: Centimes;
  presentTVA: Centimes;
  presentTTC: Centimes;
  retenue: Centimes;
  mandate: Centimes;
};

export type ResultatCertificat = { ok: true; lignes: LignesCertificat } | { ok: false; message: string };

const somme = (montants: readonly Centimes[]) => montants.reduce((total, m) => total + m, 0);

/** Certificat de paiement mensuel : seule la saisie du cumul réalisé HT est libre. */
export function calculerCertificat(entree: EntreeCertificat): ResultatCertificat {
  if (!entree.cumulTexte.trim()) return { ok: false, message: "Saisissez le montant des travaux réalisés." };
  const cumul = lireMontant(entree.cumulTexte);
  if (cumul === null) return { ok: false, message: "Montant illisible : écrivez par exemple 9 850,00." };

  const totalHT = entree.marcheHT + somme(entree.avenants);
  if (cumul > totalHT) return { ok: false, message: "Le cumul dépasse le montant du marché avenants compris." };

  const precedentsHT = somme(entree.acomptesAnterieurs);
  const presentHT = cumul - precedentsHT;
  if (presentHT <= 0) return { ok: false, message: "Le présent acompte doit être positif." };

  const totalTVA = appliquerTaux(totalHT, entree.tauxTVA);
  const precedentsTVA = appliquerTaux(precedentsHT, entree.tauxTVA);
  const presentTVA = appliquerTaux(presentHT, entree.tauxTVA);
  const presentTTC = presentHT + presentTVA;
  const retenue = entree.caution ? 0 : appliquerTaux(presentTTC, entree.tauxRetenue);

  return {
    ok: true,
    lignes: {
      numero: entree.acomptesAnterieurs.length + 1,
      totalHT,
      totalTVA,
      totalTTC: totalHT + totalTVA,
      precedentsHT,
      precedentsTVA,
      precedentsTTC: precedentsHT + precedentsTVA,
      presentHT,
      presentTVA,
      presentTTC,
      retenue,
      mandate: presentTTC - retenue,
    },
  };
}
```

- [ ] **Step 6: Tests et implémentation du planning**

`planning.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { placerBarre, semainesEntre } from "./planning";

describe("semainesEntre", () => {
  it("liste les lundis de la première à la dernière semaine, bornes comprises", () => {
    const semaines = semainesEntre("2026-09-09", "2026-10-02"); // mercredi → vendredi
    expect(semaines.map((s) => s.lundi)).toEqual(["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"]);
    expect(semaines[0]).toEqual({ index: 0, lundi: "2026-09-07", libelle: "7 sept." });
  });
});

describe("placerBarre", () => {
  it("donne la colonne de départ et le nombre de semaines couvertes", () => {
    expect(placerBarre("2026-09-07", "2026-10-30", "2026-09-07")).toEqual({ colonne: 0, duree: 8 });
    expect(placerBarre("2026-10-14", "2026-10-16", "2026-09-07")).toEqual({ colonne: 5, duree: 1 });
  });
});
```

`planning.ts` :

```ts
const JOUR = 86_400_000;
const LIBELLE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

const versDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const versIso = (date: Date) => date.toISOString().slice(0, 10);

/** Lundi de la semaine d'une date ISO (AAAA-MM-JJ), calcul en UTC. */
export function lundiDe(iso: string): string {
  const date = versDate(iso);
  const decalage = (date.getUTCDay() + 6) % 7; // lundi → 0
  return versIso(new Date(date.getTime() - decalage * JOUR));
}

export type Semaine = { index: number; lundi: string; libelle: string };

export function semainesEntre(debutIso: string, finIso: string): Semaine[] {
  const premier = versDate(lundiDe(debutIso)).getTime();
  const dernier = versDate(lundiDe(finIso)).getTime();
  const semaines: Semaine[] = [];
  for (let t = premier, index = 0; t <= dernier; t += 7 * JOUR, index += 1) {
    const lundi = new Date(t);
    semaines.push({ index, lundi: versIso(lundi), libelle: LIBELLE.format(lundi) });
  }
  return semaines;
}

/** Position d'une barre dans la grille des semaines qui commence au lundi `origineIso`. */
export function placerBarre(debutIso: string, finIso: string, origineIso: string) {
  const origine = versDate(lundiDe(origineIso)).getTime();
  const colonne = Math.round((versDate(lundiDe(debutIso)).getTime() - origine) / (7 * JOUR));
  const derniere = Math.round((versDate(lundiDe(finIso)).getTime() - origine) / (7 * JOUR));
  return { colonne, duree: derniere - colonne + 1 };
}
```

- [ ] **Step 7: Tout vert** — `pnpm --filter demo-marches test && pnpm --filter demo-marches lint && pnpm --filter demo-marches typecheck` → PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/demo-marches/src/domaine
git commit -m "Démo : règles de calcul au centime (avenants, certificat, planning)"
```

---

### Task 3: Chantier fictif et état de la démo

**Files:**
- Create: `apps/demo-marches/src/donnees/chantier.ts`, `apps/demo-marches/src/donnees/etat.ts`, `apps/demo-marches/src/donnees/etat.test.ts`

**Interfaces:**
- Consumes: `Avenant`, `Centimes`, `montantEngage` (tâche 2).
- Produces:
  - `type Lot = { id: string; numero: number; intitule: string; entreprise: string; marcheHT: Centimes; avenants: Avenant[]; compteurAvenants: number; acomptes: Centimes[]; tauxTVA: number; tauxRetenue: number; caution: boolean; debut: string; fin: string }`
  - `CHANTIER: { nom: string; adresse: string; debut: string; fin: string; lots: readonly Lot[] }`
  - `type EtatDemo = { lots: Lot[] }`, `etatInitial(): EtatDemo`
  - `type ActionDemo = { type: "ajouterAvenant"; lotId: string; libelle: string; montantHT: Centimes } | { type: "supprimerAvenant"; lotId: string; avenantId: string } | { type: "basculerCaution"; lotId: string } | { type: "reinitialiser" }`
  - `reducteur(etat: EtatDemo, action: ActionDemo): EtatDemo`
  - `totauxChantier(lots: readonly Lot[]): { marcheHT: Centimes; avenantsHT: Centimes; engageHT: Centimes; payeHT: Centimes }`

- [ ] **Step 1: Le chantier fictif** — `chantier.ts`, valeurs exactes (le lot 07 est le cas de référence de la spec) :

```ts
import type { Avenant } from "../domaine/avenants";
import type { Centimes } from "../domaine/montants";

export type Lot = {
  id: string;
  numero: number;
  intitule: string;
  entreprise: string;
  marcheHT: Centimes;
  avenants: Avenant[];
  /** Dernier numéro d'avenant attribué : un numéro n'est jamais réutilisé. */
  compteurAvenants: number;
  /** Acomptes déjà versés (HT), dans l'ordre des certificats. */
  acomptes: Centimes[];
  tauxTVA: number;
  tauxRetenue: number;
  caution: boolean;
  debut: string;
  fin: string;
};

const lot = (l: Omit<Lot, "compteurAvenants" | "tauxTVA" | "tauxRetenue">): Lot => ({
  ...l,
  compteurAvenants: l.avenants.length,
  tauxTVA: 20,
  tauxRetenue: 5,
});

const av = (id: string, numero: number, libelle: string, montantHT: Centimes): Avenant => ({ id, numero, libelle, montantHT });

/** Chantier entièrement inventé : aucun nom, lieu ni montant n'est réel. */
export const CHANTIER = {
  nom: "Réhabilitation de 12 logements",
  adresse: "Rue des Tilleuls",
  debut: "2026-09-07",
  fin: "2027-01-29",
  lots: [
    lot({ id: "l1", numero: 1, intitule: "Gros œuvre — maçonnerie", entreprise: "Maçonnerie Brunet", marcheHT: 14_850_000, avenants: [av("l1a1", 1, "Reprise de linteaux", 620_000)], acomptes: [4_000_000, 5_200_000], caution: true, debut: "2026-09-07", fin: "2026-10-30" }),
    lot({ id: "l2", numero: 2, intitule: "Charpente — couverture", entreprise: "Charpentes du Val", marcheHT: 6_430_000, avenants: [], acomptes: [2_000_000], caution: false, debut: "2026-10-12", fin: "2026-11-20" }),
    lot({ id: "l3", numero: 3, intitule: "Menuiseries extérieures", entreprise: "Menuiserie Lambert", marcheHT: 5_280_000, avenants: [av("l3a1", 1, "Suppression d'un châssis", -145_000)], acomptes: [], caution: false, debut: "2026-11-02", fin: "2026-11-27" }),
    lot({ id: "l4", numero: 4, intitule: "Plâtrerie — isolation", entreprise: "Atelier Rocher", marcheHT: 7_195_000, avenants: [], acomptes: [], caution: false, debut: "2026-11-16", fin: "2026-12-18" }),
    lot({ id: "l5", numero: 5, intitule: "Électricité", entreprise: "Élec Services Martin", marcheHT: 4_670_000, avenants: [av("l5a1", 1, "Prises supplémentaires", 238_000)], acomptes: [900_000], caution: false, debut: "2026-10-19", fin: "2027-01-15" }),
    lot({ id: "l6", numero: 6, intitule: "Plomberie — chauffage", entreprise: "Thermique Garnier", marcheHT: 5_840_000, avenants: [], acomptes: [850_000], caution: false, debut: "2026-10-19", fin: "2027-01-15" }),
    lot({ id: "l7", numero: 7, intitule: "Carrelage — faïence", entreprise: "Carrelages Morel", marcheHT: 1_260_000, avenants: [av("l7a1", 1, "Faïence toute hauteur des salles d'eau", 85_000)], acomptes: [300_000, 420_000], caution: false, debut: "2026-12-07", fin: "2027-01-08" }),
    lot({ id: "l8", numero: 8, intitule: "Peinture — sols souples", entreprise: "Peintures Leroy", marcheHT: 3_325_000, avenants: [], acomptes: [], caution: false, debut: "2027-01-04", fin: "2027-01-29" }),
  ],
} as const satisfies { nom: string; adresse: string; debut: string; fin: string; lots: readonly Lot[] };
```

- [ ] **Step 2: Tests du réducteur** — `etat.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { etatInitial, reducteur, totauxChantier } from "./etat";

describe("reducteur", () => {
  it("ajoute un avenant avec le numéro suivant, sans toucher aux autres lots", () => {
    const avant = etatInitial();
    const apres = reducteur(avant, { type: "ajouterAvenant", lotId: "l7", libelle: "Plinthes", montantHT: 100_000 });
    const l7 = apres.lots.find((l) => l.id === "l7")!;
    expect(l7.avenants.map((a) => [a.numero, a.libelle])).toEqual([[1, "Faïence toute hauteur des salles d'eau"], [2, "Plinthes"]]);
    expect(apres.lots.find((l) => l.id === "l1")).toBe(avant.lots.find((l) => l.id === "l1"));
  });

  it("ne réutilise jamais un numéro après une suppression", () => {
    let etat = etatInitial();
    etat = reducteur(etat, { type: "ajouterAvenant", lotId: "l7", libelle: "A", montantHT: 1_000 });
    const numero2 = etat.lots.find((l) => l.id === "l7")!.avenants[1]!;
    etat = reducteur(etat, { type: "supprimerAvenant", lotId: "l7", avenantId: numero2.id });
    etat = reducteur(etat, { type: "ajouterAvenant", lotId: "l7", libelle: "B", montantHT: 2_000 });
    expect(etat.lots.find((l) => l.id === "l7")!.avenants.map((a) => a.numero)).toEqual([1, 3]);
  });

  it("bascule la caution et réinitialise tout", () => {
    let etat = reducteur(etatInitial(), { type: "basculerCaution", lotId: "l7" });
    expect(etat.lots.find((l) => l.id === "l7")!.caution).toBe(true);
    etat = reducteur(etat, { type: "reinitialiser" });
    expect(etat).toEqual(etatInitial());
  });

  it("ignore un avenant invalide", () => {
    const avant = etatInitial();
    expect(reducteur(avant, { type: "ajouterAvenant", lotId: "l7", libelle: " ", montantHT: 100 })).toBe(avant);
    expect(reducteur(avant, { type: "ajouterAvenant", lotId: "l7", libelle: "X", montantHT: 0 })).toBe(avant);
  });
});

describe("totauxChantier", () => {
  it("additionne marchés, avenants, engagé et payé", () => {
    expect(totauxChantier(etatInitial().lots)).toEqual({
      marcheHT: 48_850_000,
      avenantsHT: 798_000,
      engageHT: 49_648_000,
      payeHT: 13_670_000,
    });
  });
});
```

- [ ] **Step 3: FAIL, puis implémenter `etat.ts`**

```ts
import { montantEngage } from "../domaine/avenants";
import type { Centimes } from "../domaine/montants";
import { CHANTIER, type Lot } from "./chantier";

export type EtatDemo = { lots: Lot[] };

export type ActionDemo =
  | { type: "ajouterAvenant"; lotId: string; libelle: string; montantHT: Centimes }
  | { type: "supprimerAvenant"; lotId: string; avenantId: string }
  | { type: "basculerCaution"; lotId: string }
  | { type: "reinitialiser" };

/** Copie profonde : la démo peut tout modifier, l'original reste intact. */
export const etatInitial = (): EtatDemo => ({ lots: structuredClone(CHANTIER.lots) as Lot[] });

function modifierLot(etat: EtatDemo, lotId: string, modifier: (lot: Lot) => Lot): EtatDemo {
  return { lots: etat.lots.map((lot) => (lot.id === lotId ? modifier(lot) : lot)) };
}

export function reducteur(etat: EtatDemo, action: ActionDemo): EtatDemo {
  switch (action.type) {
    case "ajouterAvenant": {
      const libelle = action.libelle.trim();
      if (!libelle || action.montantHT === 0) return etat;
      return modifierLot(etat, action.lotId, (lot) => {
        const numero = lot.compteurAvenants + 1;
        return {
          ...lot,
          compteurAvenants: numero,
          avenants: [...lot.avenants, { id: `${lot.id}a${numero}`, numero, libelle, montantHT: action.montantHT }],
        };
      });
    }
    case "supprimerAvenant":
      return modifierLot(etat, action.lotId, (lot) => ({
        ...lot,
        avenants: lot.avenants.filter((a) => a.id !== action.avenantId),
      }));
    case "basculerCaution":
      return modifierLot(etat, action.lotId, (lot) => ({ ...lot, caution: !lot.caution }));
    case "reinitialiser":
      return etatInitial();
  }
}

export function totauxChantier(lots: readonly Lot[]) {
  return lots.reduce(
    (t, lot) => {
      const avenantsHT = lot.avenants.reduce((s, a) => s + a.montantHT, 0);
      return {
        marcheHT: t.marcheHT + lot.marcheHT,
        avenantsHT: t.avenantsHT + avenantsHT,
        engageHT: t.engageHT + montantEngage(lot.marcheHT, lot.avenants),
        payeHT: t.payeHT + lot.acomptes.reduce((s, a) => s + a, 0),
      };
    },
    { marcheHT: 0, avenantsHT: 0, engageHT: 0, payeHT: 0 },
  );
}
```

- [ ] **Step 4: PASS, lint, types**, puis commit :

```bash
git add apps/demo-marches/src/donnees
git commit -m "Démo : chantier fictif et état (avenants, caution, réinitialisation)"
```

---

### Task 4: Briques d'interface reprises

**Files:**
- Create: `apps/demo-marches/src/briques/` — `cx.ts`, `typo.ts`, `icones.tsx`, `Bouton.tsx`, `Champ.tsx`, `Etiquette.tsx`, `Tableau.tsx`, `Onglets.tsx`, `Surcouche.tsx`, `Interrupteur.tsx`, `CleValeur.tsx`, et leurs tests `*.test.tsx`

**Interfaces:**
- Produces (props exactes) :
  - `cx(...classes: (string | false | null | undefined)[]): string`
  - `Bouton({ variante?: "principal" | "secondaire" | "discret" | "danger"; taille?: "normale" | "petite"; ...ButtonHTMLAttributes })`
  - `Champ({ libelle: string; erreur?: string; aide?: string; ...InputHTMLAttributes })` — `<label>` relié, `aria-invalid` et `aria-describedby` vers le message quand `erreur`.
  - `Etiquette({ ton: "neutre" | "accent" | "alerte" | "danger"; children })`
  - `Tableau({ variante: "plain" | "lots"; children; className? })` — `<table>` stylé ; cellules en HTML avec `data-droite`, `data-premiere`, ligne `data-ouvert`, `data-actif`.
  - `Onglets({ libelle: string; onglets: { id: string; titre: string }[]; actif: string; surChangement(id: string): void })` + `PanneauOnglet({ id: string; actif: string; children })` — rôles `tablist`/`tab`/`tabpanel`, flèches gauche/droite, Début/Fin, focus itinérant (`tabIndex` 0 sur l'actif seulement).
  - `Surcouche({ ouverte: boolean; titre: string; surFermeture(): void; variante: "panneau" | "apercu"; children })` — `role="dialog"`, `aria-modal`, `aria-labelledby` vers le titre, focus mis sur la surcouche à l'ouverture, piège du focus (Tab / Maj+Tab bouclent), Échap ferme **la plus haute seulement**, focus rendu à l'élément actif avant l'ouverture, défilement de la page figé pendant l'ouverture ; `panneau` = tiroir à droite (plein écran sous 60 rem), `apercu` = feuille centrée.
  - `Interrupteur({ libelle: string; actif: boolean; surChangement(actif: boolean): void })` — `role="switch"`, `aria-checked`.
  - `CleValeur({ cle: string; valeur: ReactNode })`.

- [ ] **Step 1: Lire les briques de l'application réelle** (lecture seule) : `$APP_REELLE/src/composants/briques/` (`cx.ts`, `typo.ts`, `Bouton.tsx`, `Champ.tsx`, `Etiquette.tsx`, `Tableau.tsx`, `Onglet.tsx`, `Panneau.tsx`, `surcouches.ts`, `Interrupteur.tsx`, `CleValeur.tsx`, `icones.tsx`) et `docs/interface.md`. Reprendre leurs tables de variantes et leurs classes à l'identique quand c'est possible, en retirant toute dépendance à Next (`next/link`…), au serveur, au thème sombre et tout texte métier réel. Les règles de `docs/interface.md` s'appliquent (`className` = placement seulement, états par ARIA ou `data-*`, pas de valeur arbitraire de couleur ou de taille).

- [ ] **Step 2: Tests d'abord** — au minimum :

```tsx
// Onglets.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Onglets, PanneauOnglet } from "./Onglets";

function Exemple() {
  const [actif, setActif] = useState("marches");
  const onglets = [{ id: "marches", titre: "Marchés" }, { id: "planning", titre: "Planning" }];
  return (
    <>
      <Onglets libelle="Vues du chantier" onglets={onglets} actif={actif} surChangement={setActif} />
      <PanneauOnglet id="marches" actif={actif}>Contenu marchés</PanneauOnglet>
      <PanneauOnglet id="planning" actif={actif}>Contenu planning</PanneauOnglet>
    </>
  );
}

describe("Onglets", () => {
  it("se pilotent aux flèches et n'affichent que le panneau actif", async () => {
    render(<Exemple />);
    const marches = screen.getByRole("tab", { name: "Marchés" });
    expect(marches).toHaveAttribute("aria-selected", "true");
    marches.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Planning" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Contenu planning");
  });
});
```

```tsx
// Surcouche.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Surcouche } from "./Surcouche";

function Exemple() {
  const [panneau, setPanneau] = useState(false);
  const [apercu, setApercu] = useState(false);
  return (
    <>
      <button onClick={() => setPanneau(true)}>Ouvrir</button>
      <Surcouche ouverte={panneau} titre="Lot 07" variante="panneau" surFermeture={() => setPanneau(false)}>
        <button onClick={() => setApercu(true)}>Certificat</button>
        <Surcouche ouverte={apercu} titre="Certificat" variante="apercu" surFermeture={() => setApercu(false)}>
          <input aria-label="Cumul" />
        </Surcouche>
      </Surcouche>
    </>
  );
}

describe("Surcouche", () => {
  it("Échap ferme la plus haute et rend le focus à son déclencheur", async () => {
    render(<Exemple />);
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    expect(screen.getByRole("dialog", { name: "Lot 07" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Certificat" }));
    expect(screen.getByRole("dialog", { name: "Certificat" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Certificat" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Lot 07" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Certificat" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Ouvrir" })).toHaveFocus();
  });

  it("garde le focus à l'intérieur", async () => {
    render(<Exemple />);
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    for (let i = 0; i < 5; i += 1) await userEvent.tab();
    expect(screen.getByRole("dialog", { name: "Lot 07" })).toContainElement(document.activeElement as HTMLElement);
  });
});
```

Plus : `Champ` (libellé relié, `aria-invalid` + `aria-describedby` vers l'erreur), `Interrupteur` (`role="switch"`, `aria-checked` bascule au clic et à Espace), `Bouton` (variante par défaut, `disabled`). Reprendre et adapter les tests existants de l'application réelle quand ils couvrent la même brique.

- [ ] **Step 3: Implémenter** chaque brique pour faire passer les tests, en suivant l'application réelle.

- [ ] **Step 4: Vérifier** — `pnpm --filter demo-marches test && pnpm --filter demo-marches lint && pnpm --filter demo-marches typecheck` ; aucun terme de la liste interdite (`grep -riE -f <(grep -v '^#' .superpowers/sdd/2026-10-09-etudes-de-cas/termes-interdits.txt) apps/demo-marches/src` → rien).

- [ ] **Step 5: Commit**

```bash
git add apps/demo-marches/src/briques
git commit -m "Démo : briques d'interface (boutons, champs, tableau, onglets, surcouches)"
```

---

### Task 5: Écran Marchés, panneau du lot et coquille

**Files:**
- Create: `apps/demo-marches/src/ecrans/Marches.tsx`, `PanneauLot.tsx`, `Coquille.tsx`, `Annonce.tsx`, `apps/demo-marches/src/ecrans/Marches.test.tsx`, `apps/demo-marches/src/ecrans/Coquille.test.tsx`
- Modify: `apps/demo-marches/src/App.tsx`, `apps/demo-marches/src/App.test.tsx`

**Interfaces:**
- Consumes: briques (tâche 4), `reducteur`, `etatInitial`, `totauxChantier`, `CHANTIER` (tâche 3), `montantEngage`, `validerAvenant`, `formaterEuros`, `formaterEcart` (tâche 2).
- Produces:
  - `Coquille({ enTete, children })` : bandeau « Démo — données fictives » (texte exact), `h1` « Suivi de marchés », nom et adresse du chantier, bouton « Réinitialiser la démo ».
  - `Annonce` : région `aria-live="polite"` unique (`role="status"`) ; `useAnnonce(): (message: string) => void`.
  - `Marches({ lots, dispatch })` : tableau des lots ; chaque intitulé de lot est un `<button>` qui ouvre son panneau.
  - `PanneauLot({ lot, dispatch, surFermeture, surCertificat })` : `Surcouche` « Lot 07 — Carrelage — faïence » (format `Lot ${numero.padStart(2,"0")} — ${intitule}`) ; liste des avenants (numéro « Avenant n° 02 », libellé, `formaterEcart`, bouton « Supprimer l'avenant n° 02 ») ; formulaire « Ajouter un avenant » (champs « Libellé » et « Montant HT », bouton « Ajouter ») ; bouton « Certificat de paiement » (appelle `surCertificat`, l'aperçu arrive à la tâche 6).
  - `App` : `useReducer(reducteur, undefined, etatInitial)`, onglets « Marchés » / « Planning » (Planning affiche « Planning » vide jusqu'à la tâche 7).

Colonnes du tableau, dans l'ordre : « Lot », « Entreprise », « Marché HT », « Avenants », « Engagé HT », « Payé HT », « Avancement » (barre `role="meter"` 0-100 avec `aria-valuenow` = payé/engagé arrondi, libellé « Avancement du lot 07 »). Pied : ligne « Total du chantier » avec les totaux. Colonne « Lot » figée au défilement horizontal (`position: sticky`). Montants en `CHIFFRES` (police mono, chiffres tabulaires), alignés à droite.

- [ ] **Step 1: Tests** — `Marches.test.tsx` (rend `App`) :

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";

const espaces = (t: string | null) => (t ?? "").replace(/[  ]/g, " ");
const ligne = (intitule: string) => screen.getByRole("button", { name: intitule }).closest("tr")!;
const total = () => screen.getByRole("row", { name: /Total du chantier/ });

describe("Écran Marchés", () => {
  it("liste les 8 lots et le total du chantier", () => {
    render(<App />);
    expect(screen.getAllByRole("row")).toHaveLength(1 + 8 + 1);
    expect(espaces(total().textContent)).toContain("496 480,00 €");
  });

  it("un avenant ajouté change la ligne, le total et le panneau", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Carrelage — faïence" }));
    const panneau = screen.getByRole("dialog", { name: "Lot 07 — Carrelage — faïence" });
    await userEvent.type(within(panneau).getByLabelText("Libellé"), "Plinthes");
    await userEvent.type(within(panneau).getByLabelText("Montant HT"), "1 000");
    await userEvent.click(within(panneau).getByRole("button", { name: "Ajouter" }));
    expect(within(panneau).getByText("Avenant n° 02")).toBeInTheDocument();
    expect(espaces(ligne("Carrelage — faïence").textContent)).toContain("14 450,00 €");
    expect(espaces(total().textContent)).toContain("497 480,00 €");
    expect(espaces(screen.getByRole("status").textContent)).toContain("14 450,00 €");
  });

  it("refuse un avenant invalide avec un message relié au champ", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Carrelage — faïence" }));
    const panneau = screen.getByRole("dialog");
    await userEvent.click(within(panneau).getByRole("button", { name: "Ajouter" }));
    const libelle = within(panneau).getByLabelText("Libellé");
    expect(libelle).toHaveAttribute("aria-invalid", "true");
    expect(libelle).toHaveAccessibleDescription("Donnez un libellé à l'avenant.");
  });

  it("supprime un avenant sans réutiliser son numéro", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Carrelage — faïence" }));
    const panneau = screen.getByRole("dialog");
    await userEvent.click(within(panneau).getByRole("button", { name: "Supprimer l'avenant n° 01" }));
    expect(espaces(ligne("Carrelage — faïence").textContent)).toContain("12 600,00 €");
    await userEvent.type(within(panneau).getByLabelText("Libellé"), "Autre");
    await userEvent.type(within(panneau).getByLabelText("Montant HT"), "500");
    await userEvent.click(within(panneau).getByRole("button", { name: "Ajouter" }));
    expect(within(panneau).getByText("Avenant n° 02")).toBeInTheDocument();
  });

  it("Échap ferme le panneau et rend le focus au lot", async () => {
    render(<App />);
    const bouton = screen.getByRole("button", { name: "Carrelage — faïence" });
    await userEvent.click(bouton);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(bouton).toHaveFocus();
  });

  it("« Réinitialiser la démo » remet les données d'origine", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Carrelage — faïence" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Supprimer l'avenant n° 01" }));
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Réinitialiser la démo" }));
    expect(espaces(total().textContent)).toContain("496 480,00 €");
  });
});
```

`App.test.tsx` : garder le test de la tâche 1 et ajouter : les onglets « Marchés » (sélectionné) et « Planning » existent ; `ArrowRight` affiche le panneau Planning.

- [ ] **Step 2: FAIL**, puis implémenter `Annonce`, `Coquille`, `Marches`, `PanneauLot`, `App` en reprenant la présentation de `TableauLots.tsx` et `PanneauLot.tsx` de l'application réelle (lecture seule ; ni texte métier réel, ni nom). L'annonce après un ajout ou une suppression : « Montant engagé du lot 07 : 14 450,00 € ».

- [ ] **Step 3: PASS, lint, types, anonymat** (même `grep` qu'à la tâche 4), puis vérifier à l'œil : `pnpm dev:demo`, fenêtre 1280 × 720 puis 390 × 844 (le tableau défile horizontalement, colonne Lot figée ; le panneau occupe tout l'écran sous 60 rem).

- [ ] **Step 4: Commit**

```bash
git add apps/demo-marches/src/ecrans apps/demo-marches/src/App.tsx apps/demo-marches/src/App.test.tsx
git commit -m "Démo : écran des marchés, panneau du lot et avenants"
```

---

### Task 6: Aperçu du certificat de paiement

**Files:**
- Create: `apps/demo-marches/src/ecrans/ApercuCertificat.tsx`, `apps/demo-marches/src/ecrans/ApercuCertificat.test.tsx`
- Modify: `apps/demo-marches/src/ecrans/PanneauLot.tsx`

**Interfaces:**
- Consumes: `calculerCertificat`, `formaterEuros` (tâche 2), `Lot` (tâche 3), `Surcouche`, `Champ`, `Interrupteur`, `CleValeur` (tâche 4), `useAnnonce` (tâche 5).
- Produces: `ApercuCertificat({ lot, dispatch, surFermeture })` — `Surcouche` variante `apercu`, titre « Certificat de paiement n° 03 — Lot 07 » ; champ « Cumul des travaux réalisés HT » (vide à l'ouverture) ; interrupteur « Caution bancaire » (`dispatch({ type: "basculerCaution" })`) ; tableau du certificat (lignes de la spec : Montant du marché HT, Avenants HT, Total HT, TVA, Total TTC, Acomptes précédents HT/TVA/TTC, Présent acompte HT, TVA, TTC, Retenue de garantie, **Montant total mandaté**) ; note « Dans l'application, le certificat est émis en PDF, figé et numéroté. ».

Comportement : le calcul se fait à chaque frappe ; si le résultat est une erreur, le message s'affiche sous le champ (`aria-invalid`, `aria-describedby`) et **le dernier résultat valide reste affiché** (ou des tirets « — » s'il n'y en a jamais eu) ; le montant mandaté valide est annoncé par `useAnnonce` : « Montant total mandaté : 3 021,00 € ».

- [ ] **Step 1: Tests**

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";

const espaces = (t: string | null) => (t ?? "").replace(/[  ]/g, " ");

async function ouvrirCertificat() {
  render(<App />);
  await userEvent.click(screen.getByRole("button", { name: "Carrelage — faïence" }));
  await userEvent.click(screen.getByRole("button", { name: "Certificat de paiement" }));
  return screen.getByRole("dialog", { name: "Certificat de paiement n° 03 — Lot 07" });
}
const mandate = (apercu: HTMLElement) => espaces(within(apercu).getByTestId("mandate").textContent);

describe("Aperçu du certificat", () => {
  it("calcule le cas de référence à la frappe", async () => {
    const apercu = await ouvrirCertificat();
    await userEvent.type(within(apercu).getByLabelText("Cumul des travaux réalisés HT"), "9 850,00");
    expect(mandate(apercu)).toBe("3 021,00 €");
    expect(espaces(screen.getByRole("status").textContent)).toContain("3 021,00 €");
  });

  it("supprime la retenue avec la caution bancaire", async () => {
    const apercu = await ouvrirCertificat();
    await userEvent.type(within(apercu).getByLabelText("Cumul des travaux réalisés HT"), "9850");
    await userEvent.click(within(apercu).getByRole("switch", { name: "Caution bancaire" }));
    expect(mandate(apercu)).toBe("3 180,00 €");
  });

  it("garde le dernier calcul valide et explique l'erreur", async () => {
    const apercu = await ouvrirCertificat();
    const champ = within(apercu).getByLabelText("Cumul des travaux réalisés HT");
    await userEvent.type(champ, "9850");
    await userEvent.clear(champ);
    await userEvent.type(champ, "7 000");
    expect(champ).toHaveAttribute("aria-invalid", "true");
    expect(champ).toHaveAccessibleDescription("Le présent acompte doit être positif.");
    expect(mandate(apercu)).toBe("3 021,00 €");
  });

  it("affiche des tirets tant qu'aucun calcul n'est valide", async () => {
    const apercu = await ouvrirCertificat();
    expect(mandate(apercu)).toBe("—");
  });
});
```

- [ ] **Step 2: FAIL**, implémenter en reprenant la mise en page de `ApercuCertificat.tsx` de l'application réelle (lecture seule ; **sans** logo, coordonnées, ville, ni nom d'entreprise réelle : l'en-tête du certificat dit « Maître d'œuvre — exemple »).

- [ ] **Step 3: PASS, lint, types, anonymat**, puis commit :

```bash
git add apps/demo-marches/src/ecrans/ApercuCertificat.tsx apps/demo-marches/src/ecrans/ApercuCertificat.test.tsx apps/demo-marches/src/ecrans/PanneauLot.tsx
git commit -m "Démo : aperçu du certificat de paiement calculé à la frappe"
```

---

### Task 7: Planning en lecture seule

**Files:**
- Create: `apps/demo-marches/src/ecrans/Planning.tsx`, `apps/demo-marches/src/ecrans/Planning.test.tsx`, `apps/demo-marches/src/ecrans/planning.css`
- Modify: `apps/demo-marches/src/App.tsx`

**Interfaces:**
- Consumes: `semainesEntre`, `placerBarre` (tâche 2), `CHANTIER`, `Lot` (tâche 3).
- Produces: `Planning({ lots })` — grille : une colonne figée « Lot » puis une colonne par semaine (`semainesEntre(CHANTIER.debut, CHANTIER.fin)`, en-tête = libellé du lundi) ; une ligne par lot avec une barre (`data-testid="barre-l7"`) placée par `placerBarre` ; chaque barre est un `<button>` nommé « Lot 07 — Carrelage — faïence, du 7 déc. au 8 janv. » ; survol ou focus d'une barre → `data-actif` sur la barre et sa ligne ; clic → encart de détail (`role="region"`, nommé « Détail du lot ») avec entreprise et dates longues (« du lundi 7 décembre 2026 au vendredi 8 janvier 2027 ») ; Échap ou second clic sur la même barre efface le détail.

Styles : reprendre l'esprit de `planning.css` de l'application réelle (largeur de semaine en variable `--sem-w`, colonne figée, survol qui colore la ligne) dans `planning.css` de la démo, importé par `Planning.tsx`.

- [ ] **Step 1: Tests**

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CHANTIER } from "../donnees/chantier";
import { etatInitial } from "../donnees/etat";
import { Planning } from "./Planning";

describe("Planning", () => {
  it("place une barre par lot sur la frise des semaines", () => {
    render(<Planning lots={etatInitial().lots} />);
    expect(screen.getAllByRole("button", { name: /^Lot \d{2} — / })).toHaveLength(CHANTIER.lots.length);
    expect(screen.getAllByRole("columnheader")).toHaveLength(1 + 21); // Lot + 21 semaines (7 sept. → 25 janv.)
  });

  it("met un lot en évidence et affiche son détail au clic", async () => {
    render(<Planning lots={etatInitial().lots} />);
    const barre = screen.getByTestId("barre-l7");
    await userEvent.click(barre);
    expect(barre).toHaveAttribute("data-actif");
    const detail = screen.getByRole("region", { name: "Détail du lot" });
    expect(within(detail).getByText("Carrelages Morel")).toBeInTheDocument();
    expect(detail).toHaveTextContent("du lundi 7 décembre 2026 au vendredi 8 janvier 2027");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "Détail du lot" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: FAIL, implémenter, PASS**, brancher `Planning` dans l'onglet « Planning » de `App`, vérifier à l'œil (1280 × 720 et 390 × 844 : la frise défile horizontalement, colonne des lots figée), lint, types, anonymat.

- [ ] **Step 3: Commit**

```bash
git add apps/demo-marches/src/ecrans/Planning.tsx apps/demo-marches/src/ecrans/Planning.test.tsx apps/demo-marches/src/ecrans/planning.css apps/demo-marches/src/App.tsx
git commit -m "Démo : planning des lots en lecture seule"
```

---

### Task 8: Pages d'étude de cas sur le site

**Files:**
- Create: `apps/web/data/realisations.ts`, `apps/web/data/realisations.test.ts`, `apps/web/app/realisations/[slug]/page.tsx`, `apps/web/app/realisations/[slug]/page.test.tsx`, `apps/web/components/realisations/FenetreDemo.tsx`, `apps/web/components/realisations/FenetreDemo.test.tsx`, `apps/web/components/realisations/Captures.tsx`
- Modify: `apps/web/data/accueil.ts`, `apps/web/components/accueil/Realisations.tsx`, `apps/web/app/sitemap.ts`, `apps/web/app/sitemap.test.ts`, `apps/web/next.config.ts`, tests de l'accueil concernés

**Interfaces:**
- Produces:
  - `type SlugEtude = "suivi-de-marches" | "site-artisan"`
  - `type EtudeDeCas = { slug: SlugEtude; surtitre: string; titre: string; sousTitre: string; chiffres: { valeur: string; libelle: string }[]; besoin: string[]; livre: { titre: string; texte: string }[]; stack: string[]; choix: { titre: string; texte: string }[]; media: { type: "demo"; apercu: Image } | { type: "captures"; images: Image[] } }` avec `type Image = { src: string; alt: string; largeur: number; hauteur: number }`
  - `etudesDeCas: EtudeDeCas[]`, `trouverEtude(slug: string): EtudeDeCas | undefined`, `cheminEtude(slug: SlugEtude): string` (= `/realisations/${slug}`)
  - `SOURCE_DEMO = "/demo/suivi-de-marches/index.html"` (exporté par `FenetreDemo.tsx`)

- [ ] **Step 1: Contenu** — `apps/web/data/realisations.ts` (premier jet ; les valeurs `[À mesurer]` seront remplacées par la tâche 10) :

```ts
export type SlugEtude = "suivi-de-marches" | "site-artisan";

export type Image = { src: string; alt: string; largeur: number; hauteur: number };

export type EtudeDeCas = {
  slug: SlugEtude;
  surtitre: string;
  titre: string;
  sousTitre: string;
  /** Trois chiffres clés, vérifiables. */
  chiffres: { valeur: string; libelle: string }[];
  besoin: string[];
  livre: { titre: string; texte: string }[];
  stack: string[];
  choix: { titre: string; texte: string }[];
  media: { type: "demo"; apercu: Image } | { type: "captures"; images: Image[] };
};

export const cheminEtude = (slug: SlugEtude) => `/realisations/${slug}`;

/** Réalisations anonymisées : ni nom de client, ni lieu, ni montant réel. */
export const etudesDeCas: EtudeDeCas[] = [
  {
    slug: "suivi-de-marches",
    surtitre: "Application métier · BTP",
    titre: "Le suivi des marchés de travaux, sans tableur ni courrier retapé",
    sousTitre:
      "Une application web pour une entreprise qui pilote des chantiers : marchés, avenants, certificats de paiement, planning et suivi de chantier, avec des documents PDF générés en un clic.",
    chiffres: [
      { valeur: "4", libelle: "modules : marchés, planning, finances, suivi de chantier" },
      { valeur: "0,01 €", libelle: "précision de chaque ligne de certificat, recalculée côté serveur" },
      { valeur: "1", libelle: "seul outil à la place des tableurs et des modèles de courrier" },
    ],
    besoin: [
      "Chaque chantier se suivait dans plusieurs tableurs : les marchés d'un côté, le planning de l'autre, les paiements ailleurs. Un avenant signé obligeait à reporter le nouveau montant à la main, partout.",
      "Chaque mois, les certificats de paiement se calculaient à la calculatrice puis se retapaient dans un modèle de courrier : des heures de ressaisie, et le risque d'une erreur de quelques euros sur un document signé.",
    ],
    livre: [
      { titre: "Marchés et avenants", texte: "Les lots, leurs entreprises et leurs montants au même endroit. Un avenant saisi met à jour le montant engagé partout, et sa lettre se génère toute seule." },
      { titre: "Certificats de paiement", texte: "On saisit le cumul des travaux réalisés : acomptes, TVA et retenue de garantie se calculent au centime, puis le certificat part en PDF." },
      { titre: "Planning", texte: "Les lots sur une frise en semaines, avec les périodes de fermeture, imprimable sur une seule feuille." },
      { titre: "Suivi de chantier", texte: "Comptes rendus, réserves à lever et réception, rattachés au bon lot et à la bonne entreprise." },
      { titre: "Documents", texte: "Chaque document émis est figé, numéroté et versionné : on retrouve toujours ce qui a été envoyé, tel qu'il a été envoyé." },
    ],
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Playwright", "Docker"],
    choix: [
      { titre: "Des calculs exacts", texte: "Les montants sont des décimaux arrondis au centime à chaque ligne, comme sur un certificat papier. Le serveur ne reprend jamais un montant envoyé par l'écran : il recalcule tout." },
      { titre: "Des documents qui ne changent plus", texte: "Un PDF émis n'est jamais réécrit : une correction crée une nouvelle version, l'ancienne reste consultable." },
      { titre: "Pas d'écrasement entre collègues", texte: "Deux personnes qui modifient le même lot en même temps ne peuvent pas se marcher dessus : chaque écriture verrouille le lot le temps de l'enregistrer." },
    ],
    media: {
      type: "demo",
      apercu: { src: "/realisations/suivi-de-marches/apercu.webp", alt: "Écran des marchés de la démo : tableau des lots d'un chantier fictif", largeur: 1280, hauteur: 720 },
    },
  },
  {
    slug: "site-artisan",
    surtitre: "Site vitrine · Artisan",
    titre: "Un site d'artisan rapide, bien référencé, et enfin entre ses mains",
    sousTitre:
      "La refonte complète du site d'un électricien-plombier : design sur mesure, formulaire de contact fiable, mesure d'audience sans cookie et hébergement maîtrisé.",
    chiffres: [
      { valeur: "[À mesurer]", libelle: "score de performance Lighthouse sur mobile" },
      { valeur: "[À mesurer]", libelle: "score de référencement Lighthouse" },
      { valeur: "0", libelle: "cookie déposé : pas de bandeau de consentement" },
    ],
    besoin: [
      "L'artisan dépendait d'un ancien prestataire pour la moindre modification de son site, et ne savait plus précisément qui détenait son nom de domaine et ses comptes en ligne.",
      "Il voulait un site moderne qui donne confiance, qui se trouve bien sur Google dans sa zone, et dont il garde la maîtrise.",
    ],
    livre: [
      { titre: "Un design sur mesure", texte: "Pensé d'abord pour le téléphone, là où ses clients le cherchent, avec ses réalisations et ses services mis en avant." },
      { titre: "Un formulaire de contact fiable", texte: "Les demandes de devis arrivent dans sa boîte, les erreurs d'envoi sont gérées, et le spam est filtré sans casse-tête pour le visiteur." },
      { titre: "Le référencement local", texte: "Chaque ancienne adresse redirige vers la bonne page, les données structurées décrivent l'entreprise et sa zone d'intervention." },
      { titre: "Une mesure d'audience respectueuse", texte: "Il sait combien de personnes visitent son site, sans cookie ni donnée personnelle." },
      { titre: "Un hébergement maîtrisé", texte: "Le site tourne sur un serveur que je gère, se met à jour automatiquement après chaque modification testée, et la passation du domaine a été organisée." },
    ],
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Docker", "Coolify"],
    choix: [
      { titre: "Rien de perdu au changement de site", texte: "Les pages de l'ancien site redirigent vers les nouvelles : le référencement acquis est conservé." },
      { titre: "Aucun cookie", texte: "La mesure d'audience fonctionne sans cookie : pas de bandeau de consentement, pas de données personnelles." },
      { titre: "Déploiement automatique", texte: "Chaque modification passe les tests, puis le site se met à jour seul sur le serveur, sans coupure." },
    ],
    media: {
      type: "captures",
      images: [
        { src: "/realisations/site-artisan/ordinateur.webp", alt: "Page d'accueil du site sur ordinateur (nom et coordonnées de l'artisan remplacés)", largeur: 1440, hauteur: 900 },
        { src: "/realisations/site-artisan/mobile.webp", alt: "Page d'accueil du site sur téléphone (nom et coordonnées de l'artisan remplacés)", largeur: 390, hauteur: 844 },
      ],
    },
  },
];

export function trouverEtude(slug: string): EtudeDeCas | undefined {
  return etudesDeCas.find((etude) => etude.slug === slug);
}
```

`apps/web/data/accueil.ts` : ajouter `slug: SlugEtude` au type `Realisation` (import de type depuis `./realisations`) et le renseigner (`"suivi-de-marches"`, `"site-artisan"`) ; l'ordre reste : application métier en premier.

- [ ] **Step 2: Tests des données** — `realisations.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { realisations } from "./accueil";
import { cheminEtude, etudesDeCas, trouverEtude } from "./realisations";

describe("études de cas", () => {
  it("ont des slugs uniques et trois chiffres clés", () => {
    expect(new Set(etudesDeCas.map((e) => e.slug)).size).toBe(etudesDeCas.length);
    for (const etude of etudesDeCas) expect(etude.chiffres).toHaveLength(3);
  });
  it("chaque carte de l'accueil mène à une étude existante", () => {
    for (const carte of realisations) expect(trouverEtude(carte.slug)).toBeDefined();
    expect(cheminEtude("site-artisan")).toBe("/realisations/site-artisan");
  });
  it("une seule étude porte la démo", () => {
    expect(etudesDeCas.filter((e) => e.media.type === "demo")).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Fenêtre de la démo** — `FenetreDemo.tsx` :

```tsx
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Image as ImageEtude } from "@/data/realisations";

export const SOURCE_DEMO = "/demo/suivi-de-marches/index.html";

/** Sous cette largeur, une iframe à défilement interne se manie mal : on ouvre la démo en plein écran. */
const LARGEUR_MIN = 768;

/**
 * La démo n'est chargée qu'à l'approche de la fenêtre : son JavaScript ne pèse
 * pas sur le chargement de la page. Avant (et sans JavaScript), l'aperçu tient
 * sa place.
 */
export function FenetreDemo({ apercu }: { apercu: ImageEtude }) {
  const fenetre = useRef<HTMLDivElement>(null);
  const [chargee, setChargee] = useState(false);

  useEffect(() => {
    const element = fenetre.current;
    if (!element || !window.matchMedia(`(min-width: ${LARGEUR_MIN}px)`).matches) return;
    if (typeof IntersectionObserver === "undefined") {
      setChargee(true);
      return;
    }
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((entree) => entree.isIntersecting)) {
          setChargee(true);
          observateur.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);

  return (
    <figure className="flex flex-col gap-4">
      <div ref={fenetre} className="overflow-hidden rounded-3xl border border-trait bg-papier-sombre shadow-[0_30px_80px_-40px_rgba(27,26,23,0.45)]">
        <div aria-hidden="true" className="flex items-center gap-2 border-b border-trait px-5 py-3">
          <span className="size-3 rounded-full bg-trait" />
          <span className="size-3 rounded-full bg-trait" />
          <span className="size-3 rounded-full bg-trait" />
          <span className="ml-3 text-xs text-encre-douce">Suivi de marchés — démo</span>
        </div>
        {chargee ? (
          <iframe
            src={SOURCE_DEMO}
            title="Démo interactive : suivi de marchés de travaux"
            className="block h-[720px] w-full bg-white"
          />
        ) : (
          <Image src={apercu.src} alt={apercu.alt} width={apercu.largeur} height={apercu.hauteur} className="block h-auto w-full" />
        )}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-3 text-sm text-encre-douce">
        <span>Chantier, entreprises et montants entièrement fictifs. Rien n&apos;est enregistré.</span>
        <a
          href={SOURCE_DEMO}
          target="_blank"
          rel="noopener"
          className="rounded-full bg-encre px-5 py-2.5 font-medium text-papier transition-opacity hover:opacity-85"
        >
          Ouvrir la démo en plein écran
        </a>
      </figcaption>
    </figure>
  );
}
```

(Les noms de jetons `bg-papier-sombre`, `border-trait`, `text-encre-douce`, `bg-encre`, `text-papier` doivent exister dans `app/globals.css` ; sinon prendre les jetons équivalents du site, sans valeur arbitraire de couleur. L'ombre arbitraire est tolérée ici, une seule fois.)

`FenetreDemo.test.tsx` : avec `matchMedia` simulé à `true` et un `IntersectionObserver` factice qu'on déclenche, l'aperçu est remplacé par une iframe titrée « Démo interactive : suivi de marchés de travaux » dont `src` vaut `SOURCE_DEMO` ; avec `matchMedia` à `false`, l'aperçu reste et le lien « Ouvrir la démo en plein écran » pointe vers `SOURCE_DEMO`.

- [ ] **Step 4: La page** — `app/realisations/[slug]/page.tsx`. Lire d'abord `node_modules/next/dist/docs/` sur `generateStaticParams`, `dynamicParams`, `generateMetadata` et le type de `params` (promesse dans Next 16). Structure :

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Captures } from "@/components/realisations/Captures";
import { FenetreDemo } from "@/components/realisations/FenetreDemo";
import { cheminEtude, etudesDeCas, trouverEtude } from "@/data/realisations";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return etudesDeCas.map((etude) => ({ slug: etude.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const etude = trouverEtude((await params).slug);
  if (!etude) return {};
  return {
    title: etude.titre,
    description: etude.sousTitre,
    alternates: { canonical: cheminEtude(etude.slug) },
  };
}

export default async function EtudeDeCasPage({ params }: Props) {
  const etude = trouverEtude((await params).slug);
  if (!etude) notFound();
  const autre = etudesDeCas.find((e) => e.slug !== etude.slug)!;
  // … sections 1 à 6 de la spec (§ 3)
}
```

Sections, dans l'ordre, avec les jetons et la typographie de l'accueil (`font-serif` pour les titres, surtitres en petites capitales `text-terre`) :
1. `<header>` : surtitre, `h1` = `titre`, sous-titre, `<dl>` des trois chiffres (valeur en serif grand format, libellé dessous) ;
2. `<section aria-labelledby>` « Le besoin » (`h2`) : paragraphes de `besoin` ;
3. `<section>` « La démo » (`FenetreDemo`) ou « Le résultat » (`Captures`) selon `media.type` ;
4. `<section>` « Ce que j'ai livré » : grille de `livre` (`h3` + texte) ;
5. `<section>` « Sous le capot » : liste de la `stack` (pastilles comme sur les cartes de l'accueil) et `choix` (`h3` + texte) ;
6. `<footer>` de page : « Un projet similaire ? » + lien « Parlons-en » vers `/#contact` ; lien « Voir aussi : {autre.titre} » vers `cheminEtude(autre.slug)`.

`Captures.tsx` : les images en `next/image` (`sizes` adaptés), ordinateur dans une fenêtre de navigateur stylisée, mobile dans un cadre de téléphone arrondi, côte à côte à partir de `md`, empilées en dessous.

`page.test.tsx` : pour chaque slug, la page rend le `h1`, les trois chiffres, les six sections dans l'ordre et le lien vers l'autre étude ; `generateStaticParams` renvoie les deux slugs ; un slug inconnu appelle `notFound` (simuler `next/navigation`).

- [ ] **Step 5: Cartes de l'accueil, sitemap, en-têtes**

`components/accueil/Realisations.tsx` : chaque carte reste un `<article>` ; son titre `h3` contient un `Link` vers `cheminEtude(r.slug)` dont la zone cliquable couvre la carte (pseudo-élément `after:absolute after:inset-0` sur le lien, `relative` sur l'article) ; ajouter en bas de carte « Voir l'étude de cas → » (`aria-hidden="true"`, le lien du titre porte le nom accessible). Mettre à jour le test de l'accueil : chaque carte a un lien nommé par son titre vers `/realisations/<slug>`.

`app/sitemap.ts` : `const pages = ["", "/contact", "/realisations/suivi-de-marches", "/realisations/site-artisan", "/mentions-legales", "/politique-de-confidentialite"];` construit avec `etudesDeCas.map((e) => cheminEtude(e.slug))` plutôt qu'en dur ; priorité 0.8 ; test mis à jour.

`next.config.ts` : après `securityHeaders`, ajouter

```ts
// La démo (public/demo, construite depuis apps/demo-marches) s'affiche dans
// une iframe des études de cas : elle seule accepte d'être incluse, et
// seulement par le site lui-même. La dernière règle qui pose un en-tête l'emporte.
const entetesDemo = [
  { key: "Content-Security-Policy", value: csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'") },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];
```

et dans `headers()` : `return [{ source: "/:path*", headers: securityHeaders }, { source: "/demo/:path*", headers: entetesDemo }];`

- [ ] **Step 6: Vérifier** — `pnpm lint && pnpm typecheck && pnpm test && pnpm build` ; démarrer le standalone et vérifier :

```bash
curl -sI http://127.0.0.1:3000/demo/suivi-de-marches/index.html | grep -iE "x-frame-options|frame-ancestors"
curl -sI http://127.0.0.1:3000/ | grep -iE "x-frame-options|frame-ancestors"
```

Expected : `SAMEORIGIN` et `frame-ancestors 'self'` pour la démo ; `DENY` et `frame-ancestors 'none'` pour l'accueil. Arrêter le serveur.

- [ ] **Step 7: Commit**

```bash
git add apps/web/data/realisations.ts apps/web/data/realisations.test.ts apps/web/data/accueil.ts "apps/web/app/realisations" apps/web/components/realisations apps/web/components/accueil/Realisations.tsx apps/web/app/sitemap.ts apps/web/app/sitemap.test.ts apps/web/next.config.ts
# + les tests de l'accueil modifiés, nommés un par un
git commit -m "Études de cas : pages, fenêtre de démo, cartes de l'accueil en liens"
```

---

### Task 9: Vignettes de partage en Instrument Serif

**Files:**
- Create: `apps/web/lib/vignette.tsx`, `apps/web/lib/vignette.test.ts`, `apps/web/app/realisations/[slug]/opengraph-image.tsx`
- Modify: `apps/web/app/opengraph-image.tsx`, `apps/web/package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Produces: `vignette({ surtitre: string; titre: string; sousTitre: string }): Promise<ImageResponse>` — 1200 × 630, couleurs de l'Atelier clair, halo en haut à droite, titre en Instrument Serif (police chargée par `chargerInstrumentSerif(): Promise<ArrayBuffer>`).

- [ ] **Step 1:** `pnpm --filter web add @fontsource/instrument-serif`. Vérifier le nom exact du fichier `woff` latin 400 normal dans `apps/web/node_modules/@fontsource/instrument-serif/files/` (attendu : `instrument-serif-latin-400-normal.woff` ; `next/og` ne lit pas le `woff2`).

- [ ] **Step 2: Test** — `vignette.test.ts` : `chargerInstrumentSerif()` renvoie un tampon non vide commençant par la signature `wOFF` (`0x774f4646`).

- [ ] **Step 3: `lib/vignette.tsx`** : déplacer la mise en page de `app/opengraph-image.tsx` dans `vignette()`, avec `fonts: [{ name: "Instrument Serif", data, style: "normal", weight: 400 }]` et `fontFamily: "Instrument Serif"` sur le titre ; lire la police avec `readFile(join(process.cwd(), "node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff"))`. `app/opengraph-image.tsx` appelle `vignette({ surtitre: accroche.surtitre, titre: siteName, sousTitre: siteDescription })` (surtitre lu depuis `data/accueil.ts`, plus en dur). `app/realisations/[slug]/opengraph-image.tsx` : `alt` = titre de l'étude, mêmes `size`/`contentType`, `generateStaticParams` identique à la page si la doc Next l'exige pour une image de segment dynamique (lire `node_modules/next/dist/docs/` sur `opengraph-image`), et `vignette({ surtitre, titre, sousTitre })` de l'étude.

- [ ] **Step 4: Vérifier** — `pnpm build` ; démarrer le standalone ; télécharger `/opengraph-image` et `/realisations/suivi-de-marches/opengraph-image` (chemin exact affiché par le build ou la balise `og:image` de la page) et les regarder : titre en Instrument Serif, pas de texte coupé. Tests, lint, types.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/vignette.tsx apps/web/lib/vignette.test.ts apps/web/app/opengraph-image.tsx "apps/web/app/realisations/[slug]/opengraph-image.tsx" apps/web/package.json pnpm-lock.yaml
git commit -m "Vignettes de partage en Instrument Serif, une par étude de cas"
```

---

### Task 10: Captures (aperçu de la démo, site vitrine retouché)

**Files:**
- Create: `apps/web/scripts/capturer-apercu-demo.mjs`, `apps/web/public/realisations/suivi-de-marches/apercu.webp`, `apps/web/public/realisations/site-artisan/ordinateur.webp`, `apps/web/public/realisations/site-artisan/mobile.webp`
- Modify: `apps/web/data/realisations.ts` (chiffres `[À mesurer]`), `apps/web/package.json` (script `capturer-apercu-demo`)

- [ ] **Step 1: Aperçu de la démo** — `scripts/capturer-apercu-demo.mjs` : prérequis `pnpm build` ; démarre `scripts/demarrer-standalone.mjs` sur le port 3200 (`HOSTNAME=127.0.0.1`), ouvre `/demo/suivi-de-marches/index.html` en Chromium Playwright (1280 × 720, `deviceScaleFactor: 1`), attend le tableau des lots, capture en PNG, convertit en WebP qualité 80 avec `sharp` vers `public/realisations/suivi-de-marches/apercu.webp`, arrête le serveur. Script `"capturer-apercu-demo": "node scripts/capturer-apercu-demo.mjs"`. L'exécuter.

- [ ] **Step 2: Copie anonymisée du site vitrine** — dans le scratchpad (chemin des Global Constraints), **jamais** dans un dépôt :

```bash
SC=<scratchpad>/site-artisan-anonyme
rsync -a --exclude node_modules --exclude .git --exclude .next $SITE_VITRINE/ "$SC/"
```

Dans `$SC` uniquement, remplacer partout (données, composants, métadonnées, mentions, images) chaque élément identifiant par du fictif : raison sociale → « Durand Électricité Plomberie » ; prénom et nom → « Paul Durand » ; ville et département → « Saint-Aubin (00) » ; téléphones → « 06 00 00 00 00 » ; e-mails → « contact@exemple.fr » ; domaine → `exemple.fr` ; qualifications nominatives et numéros (SIRET, RCS…) → retirés ; logo → nom fictif en texte ; photos de l'artisan, de son véhicule ou de chantiers reconnaissables → remplacées par des aplats ou fortement floutées (`sharp().blur(40)`). Puis `grep -riE -f <(grep -v '^#' /home/augustin-jouan/Documents/Projets/EI/jouan.dev/.superpowers/sdd/2026-10-09-etudes-de-cas/termes-interdits.txt) "$SC" --exclude-dir=node_modules` → **aucune** correspondance dans ce qui s'affiche.

- [ ] **Step 3: Construire, mesurer, capturer** — dans `$SC` : `npm ci`, build de production avec `SITE_URL=https://exemple.fr`, démarrage local ; Lighthouse mobile (mêmes réglages que `lighthouserc.json`, 3 passages, médiane) : noter les scores Performance et SEO ; captures Playwright de l'accueil : ordinateur 1440 × 900 (`deviceScaleFactor: 1`), mobile 390 × 844 (`deviceScaleFactor: 2`, réduite ensuite à 390 de large) ; conversion WebP qualité 80 vers `apps/web/public/realisations/site-artisan/{ordinateur,mobile}.webp`. Arrêter le serveur.

- [ ] **Step 4: Contrôle visuel obligatoire** — ouvrir les trois images (outil de lecture d'image) et vérifier qu'aucun nom, téléphone, ville, logo, plaque ou visage reconnaissable n'y figure. Si un élément subsiste : corriger la copie et recapturer.

- [ ] **Step 5: Chiffres** — remplacer les deux `[À mesurer]` de `data/realisations.ts` par les scores mesurés (ex. « 98 ») et adapter le libellé si besoin (« sur 100, performance Lighthouse sur mobile »). Les noter, avec la date de mesure, dans le rapport de tâche.

- [ ] **Step 6: Vérifier** — `pnpm --filter web verifier-placeholders` n'a plus de correspondance dans `data/realisations.ts` (les mentions légales peuvent en avoir) ; tests, lint, types, build.

- [ ] **Step 7: Commit**

```bash
git add apps/web/scripts/capturer-apercu-demo.mjs apps/web/package.json apps/web/public/realisations apps/web/data/realisations.ts
git commit -m "Études de cas : aperçu de la démo et captures anonymisées du site vitrine"
```

---

### Task 11: Tests de bout en bout et budgets

**Files:**
- Create: `apps/web/e2e/realisations.spec.ts`, `apps/web/e2e/demo.spec.ts`
- Modify: `apps/web/lighthouserc.json`

- [ ] **Step 1: `realisations.spec.ts`**

```ts
import { expect, test } from "@playwright/test";
import { surveillerErreurs } from "./outils";

test("depuis l'accueil, une carte ouvre son étude de cas", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Suivi de marchés de travaux" }).click();
  await expect(page).toHaveURL(/\/realisations\/suivi-de-marches$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("suivi des marchés");
  expect(erreurs).toEqual([]);
});

test("l'étude du site vitrine montre ses captures et renvoie vers l'autre étude", async ({ page }) => {
  await page.goto("/realisations/site-artisan");
  await expect(page.getByRole("img", { name: /sur ordinateur/ })).toBeVisible();
  await page.getByRole("link", { name: /Voir aussi/ }).click();
  await expect(page).toHaveURL(/suivi-de-marches$/);
});

test("pas de débordement horizontal", async ({ page }) => {
  for (const chemin of ["/realisations/suivi-de-marches", "/realisations/site-artisan"]) {
    await page.goto(chemin);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  }
});

test("sans JavaScript, l'aperçu et le lien plein écran restent", async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  await page.goto("/realisations/suivi-de-marches");
  await expect(page.getByRole("img", { name: /Écran des marchés de la démo/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ouvrir la démo en plein écran" })).toHaveAttribute("href", "/demo/suivi-de-marches/index.html");
  await contexte.close();
});

test("les en-têtes n'autorisent l'inclusion que de la démo, par le site seulement", async ({ request }) => {
  const demo = await request.get("/demo/suivi-de-marches/index.html");
  expect(demo.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect(demo.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
  const etude = await request.get("/realisations/suivi-de-marches");
  expect(etude.headers()["x-frame-options"]).toBe("DENY");
});
```

- [ ] **Step 2: `demo.spec.ts`**

```ts
import { expect, test } from "@playwright/test";
import { surveillerErreurs } from "./outils";

const espaces = (t: string | null) => (t ?? "").replace(/[  ]/g, " ");

test.describe("ordinateur", () => {
  test.skip(({ isMobile }) => isMobile, "La démo s'ouvre en plein écran sur mobile.");

  test("la démo n'est chargée qu'à l'approche de sa fenêtre", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    const requetes: string[] = [];
    page.on("request", (r) => r.url().includes("/demo/") && requetes.push(r.url()));
    await page.goto("/realisations/suivi-de-marches");
    await page.waitForLoadState("networkidle");
    expect(requetes).toEqual([]);
    await page.getByRole("img", { name: /Écran des marchés de la démo/ }).scrollIntoViewIfNeeded();
    await expect(page.frameLocator('iframe[title^="Démo interactive"]').getByRole("heading", { name: "Suivi de marchés" })).toBeVisible();
  });

  test("dans l'iframe : avenant puis certificat du cas de référence", async ({ page }) => {
    const erreurs = surveillerErreurs(page);
    await page.goto("/realisations/suivi-de-marches");
    await page.locator("figure").first().scrollIntoViewIfNeeded();
    const demo = page.frameLocator('iframe[title^="Démo interactive"]');
    await demo.getByRole("button", { name: "Carrelage — faïence" }).click();
    const panneau = demo.getByRole("dialog", { name: "Lot 07 — Carrelage — faïence" });
    await panneau.getByLabel("Libellé").fill("Plinthes");
    await panneau.getByLabel("Montant HT").fill("1 000");
    await panneau.getByRole("button", { name: "Ajouter" }).click();
    await expect(demo.getByRole("row", { name: /Total du chantier/ })).toContainText(/497\s480,00\s€/);
    await panneau.getByRole("button", { name: "Supprimer l'avenant n° 02" }).click();
    await panneau.getByRole("button", { name: "Certificat de paiement" }).click();
    const apercu = demo.getByRole("dialog", { name: "Certificat de paiement n° 03 — Lot 07" });
    await apercu.getByLabel("Cumul des travaux réalisés HT").fill("9 850,00");
    expect(espaces(await apercu.getByTestId("mandate").textContent())).toBe("3 021,00 €");
    expect(erreurs).toEqual([]);
  });
});

test("en plein écran : onglet Planning et détail d'un lot, sans débordement de page", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/demo/suivi-de-marches/index.html");
  await page.getByRole("tab", { name: "Planning" }).click();
  await page.getByTestId("barre-l7").click();
  await expect(page.getByRole("region", { name: "Détail du lot" })).toContainText("Carrelages Morel");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  expect(erreurs).toEqual([]);
});

test("sur mobile, la page propose d'ouvrir la démo au lieu d'une iframe", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Comportement propre aux petits écrans.");
  await page.goto("/realisations/suivi-de-marches");
  await page.locator("figure").first().scrollIntoViewIfNeeded();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ouvrir la démo en plein écran" })).toBeVisible();
});
```

- [ ] **Step 3: Lighthouse** — `lighthouserc.json`, `collect.url` :

```json
      "url": [
        "http://127.0.0.1:3000/",
        "http://127.0.0.1:3000/realisations/suivi-de-marches",
        "http://127.0.0.1:3000/realisations/site-artisan"
      ],
```

Seuils inchangés (ils s'appliquent à chaque URL).

- [ ] **Step 4: Vérifier** — `pnpm build && pnpm e2e` (tous verts, sauts volontaires seulement) ; `pnpm --filter web lighthouse` (les trois URL passent) ; `pnpm --filter web verifier-taille-demo` ; ports 3000, 3100, 3200, 2525 libres.

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/realisations.spec.ts apps/web/e2e/demo.spec.ts apps/web/lighthouserc.json
git commit -m "Études de cas : tests de bout en bout et budgets Lighthouse"
```

---

### Task 12: README, anonymat et vérification finale

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README** — dans « Structure », ajouter :

```markdown
- `apps/demo-marches` — la démo « Suivi de marchés » des études de cas (Vite, React,
  Tailwind) : règles de calcul pures dans `src/domaine/`, chantier fictif dans
  `src/donnees/`. Construite dans `apps/web/public/demo/suivi-de-marches/` par
  `pnpm build` ; `pnpm dev:demo` pour la développer seule.
```

et dans « Commandes » : `pnpm --filter web verifier-taille-demo` et `pnpm --filter web capturer-apercu-demo   # après un changement visible de la démo`.

- [ ] **Step 2: Anonymat** —

```bash
T=.superpowers/sdd/2026-10-09-etudes-de-cas/termes-interdits.txt
git grep -niE -f <(grep -v '^#' $T) main..HEAD -- . ':!pnpm-lock.yaml' || echo "aucun terme interdit"
git log main..HEAD --format=%B | grep -niE -f <(grep -v '^#' $T) || echo "messages propres"
```

Expected : « aucun terme interdit », « messages propres ».

- [ ] **Step 3: Vérification complète**

```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test
pnpm build
pnpm e2e
pnpm --filter web verifier-taille-encre
pnpm --filter web verifier-taille-demo
pnpm --filter web lighthouse
docker build -t jouan-dev .
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "README : la démo des études de cas"
```

# Tâche 08 — Budgets de la palette et e2e

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **medium**.
> Commandes depuis la racine du dépôt. Termine par le compte rendu de `contexte.md`.

Spec : section 7 (« Bout en bout » et « Budgets »).

**Décision d'Augustin :** la limite Lighthouse des scripts de l'accueil passe de 160 à **165 Ko** (163 840 → 168 960 octets). Avant ce sous-projet, l'accueil pesait 163 278 octets (562 de marge) ; les easter eggs en ajoutent environ 1 000 (mesuré : 164 300).

**Files:**
- Create: `apps/web/scripts/verifier-taille-commandes.mjs`
- Modify: `apps/web/package.json` (un script), `apps/web/lighthouserc.json` (une valeur), `.github/workflows/ci.yml` (une étape)
- Create: `apps/web/e2e/commandes.spec.ts`

- [ ] **Step 1: Contrôle de taille**

`apps/web/scripts/verifier-taille-commandes.mjs` :

```js
/**
 * Vérifie que la palette de commandes (sous-projet 7), chargée au premier Cmd+K,
 * reste sous 8 Ko compressés et n'est pas chargée d'office par l'accueil. Son
 * morceau de JS est repéré par `MARQUEUR_PALETTE` de components/commandes/PaletteCommandes.tsx.
 *
 * Usage : pnpm --filter web verifier-taille-commandes   (après `pnpm build`)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const LIMITE = 8 * 1024;
const MARQUEUR = "palette-commandes:v1";
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const dossier = join(app, ".next/static/chunks");
const accueil = join(app, ".next/server/app/index.html");

function* fichiersJs(chemin) {
  for (const nom of readdirSync(chemin)) {
    const complet = join(chemin, nom);
    if (statSync(complet).isDirectory()) yield* fichiersJs(complet);
    else if (nom.endsWith(".js")) yield complet;
  }
}

if (!existsSync(dossier) || !existsSync(accueil)) {
  console.error("Build introuvable (.next/static/chunks, accueil prérendu) : lancer pnpm build.");
  process.exit(1);
}

const trouves = [...fichiersJs(dossier)].filter((f) => readFileSync(f, "utf8").includes(MARQUEUR));
if (trouves.length !== 1) {
  console.error(`Morceau de la palette introuvable ou ambigu (${trouves.length} trouvé(s)) : lancer pnpm build.`);
  process.exit(1);
}

const chemin = relative(join(app, ".next"), trouves[0]);
if (readFileSync(accueil, "utf8").includes(chemin)) {
  console.error(`La palette (${chemin}) est chargée d'office par l'accueil : elle doit l'être au premier Cmd+K.`);
  process.exit(1);
}

const taille = gzipSync(readFileSync(trouves[0])).length;
console.log(`Palette de commandes (${relative(app, trouves[0])}) : ${(taille / 1024).toFixed(1)} Ko compressés, limite ${LIMITE / 1024} Ko.`);
if (taille > LIMITE) process.exit(1);
```

Dans `apps/web/package.json`, après la ligne `"verifier-taille-3d": "node scripts/verifier-taille-3d.mjs",`, ajouter :

```json
    "verifier-taille-commandes": "node scripts/verifier-taille-commandes.mjs",
```

Dans `.github/workflows/ci.yml`, après la ligne `      - run: pnpm --filter web verifier-taille-3d`, ajouter une ligne vide puis :

```yaml
      - run: pnpm --filter web verifier-taille-commandes
```

Dans `apps/web/lighthouserc.json`, remplacer `"maxNumericValue": 163840` par `"maxNumericValue": 168960` (ligne `resource-summary:script:size`, la seule).

```bash
./docs/superpowers/plans/easter-eggs/court.sh bash -c 'pnpm build && pnpm --filter web verifier-taille-commandes && pnpm --filter web verifier-accueil-statique'
```

Expected: « Palette de commandes (…) : 2.2 Ko compressés, limite 8 Ko. » (à quelques dixièmes près) ; accueil prérendu.

- [ ] **Step 2: e2e de la palette**

`apps/web/e2e/commandes.spec.ts` :

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { surveillerErreurs } from "./outils";

// Même marqueur que components/commandes/PaletteCommandes.tsx et scripts/verifier-taille-commandes.mjs.
const MARQUEUR = "palette-commandes:v1";
const palette = (page: Page) => page.getByRole("dialog", { name: "Commandes" });

test.describe("ordinateur", () => {
  test.skip(({ isMobile }) => isMobile, "Raccourci clavier : ordinateur seulement.");

  test("Ctrl+K charge la palette à part ; « contact » puis Entrée mène au contact", async ({ page }) => {
    const erreurs = surveillerErreurs(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const charges: string[] = [];
    page.on("response", (r) => {
      if (r.request().resourceType() === "script") charges.push(decodeURIComponent(new URL(r.url()).pathname));
    });
    await page.keyboard.press("Control+k");
    await expect(palette(page)).toBeVisible();
    // Chaque morceau chargé à l'ouverture est celui que compte verifier-taille-commandes.
    expect(charges.length).toBeGreaterThan(0);
    for (const chemin of charges) {
      const fichier = join(process.cwd(), ".next", chemin.replace(/^\/_next\//, ""));
      expect(readFileSync(fichier, "utf8"), `${chemin} n'est pas le morceau de la palette`).toContain(MARQUEUR);
    }
    await page.getByRole("combobox").fill("contact");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/contact$/);
    await expect(palette(page)).toBeHidden();
    expect(erreurs).toEqual([]);
  });

  test("Échap ferme la palette et rend le focus", async ({ page }) => {
    await page.goto("/contact");
    const lien = page.getByRole("link", { name: "Coulisses" });
    await lien.focus();
    await page.keyboard.press("Control+k");
    await expect(palette(page)).toBeVisible();
    await expect(page.getByRole("combobox")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(palette(page)).toBeHidden();
    await expect(lien).toBeFocused();
  });

  test("« Copier l'e-mail » copie l'adresse et l'annonce", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox").fill("copier e-mail");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "E-mail copié" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("contact@jouan.dev");
  });

  test("palette ouverte : aucune violation WCAG A/AA", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.keyboard.press("Control+k");
    await expect(palette(page)).toBeVisible();
    const resultat = await new AxeBuilder({ page })
      .include("dialog")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(resultat.violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});

test("mobile : le bouton du pied de page ouvre la palette", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Comportement propre aux petits écrans.");
  await page.goto("/");
  await page.getByRole("button", { name: /pour naviguer/ }).click();
  await expect(palette(page)).toBeVisible();
});
```

```bash
./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec playwright test e2e/commandes.spec.ts --reporter=line
```

Expected: 5 passés, 5 ignorés (raccourci clavier sur mobile, bouton du pied de page sur ordinateur).

Si « n'est pas le morceau de la palette » échoue : un module partagé a été ajouté à la palette (voir `contexte.md`, code chargé à la demande). S'arrêter et le dire.

- [ ] **Step 3: Commiter**

```bash
git add apps/web/scripts/verifier-taille-commandes.mjs
git add apps/web/package.json
git add apps/web/lighthouserc.json
git add .github/workflows/ci.yml
git add apps/web/e2e/commandes.spec.ts
git commit -m "Palette : 8 Ko au plus hors du JS de l'accueil, budget de l'accueil à 165 Ko, e2e"
```

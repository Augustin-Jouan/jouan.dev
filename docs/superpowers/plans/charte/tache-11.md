# Tâche 11 — Vignettes de partage, navigateur et icône

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **medium**.
> Commandes depuis la racine du dépôt. Termine par le compte rendu de `contexte.md`.

**Files:**
- Modify: `apps/web/lib/vignette.tsx`, `apps/web/app/layout.tsx`
- Replace: `apps/web/app/icon.svg`
- Create: `apps/web/e2e/charte.spec.ts`

**Interfaces:**
- Consumes: `couleur(role)` (tâche 2).

- [ ] **Step 1: Test e2e (échoue)**

`apps/web/e2e/charte.spec.ts` (`sharp` est déjà une dépendance d'`apps/web`) :

```ts
import { expect, test } from "@playwright/test";
import sharp from "sharp";

test("navigateur, icône et vignette aux couleurs de la nuit", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#2a2127");
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "dark");

  expect(await (await request.get("/icon.svg")).text()).toContain("#eab595");

  // Vignette Open Graph : le coin bas gauche (marge, loin du halo et du texte) est nuit.
  const adresse = new URL((await page.locator('meta[property="og:image"]').getAttribute("content"))!);
  const image = await request.get(adresse.pathname + adresse.search);
  expect(image.headers()["content-type"]).toContain("image/png");
  const pixel = await sharp(Buffer.from(await image.body()))
    .extract({ left: 4, top: 620, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer();
  const [r, v, b] = [...pixel];
  for (const [mesure, attendu] of [[r, 42], [v, 33], [b, 39]] as const) {
    expect(Math.abs(mesure! - attendu)).toBeLessThanOrEqual(2);
  }
});
```

`./docs/superpowers/plans/charte/court.sh bash -c 'pnpm build && pnpm --filter web exec playwright test e2e/charte.spec.ts --reporter=line'`
Expected: FAIL (pas de `meta[name="theme-color"]`).

- [ ] **Step 2: Vignettes**

Dans `apps/web/lib/vignette.tsx` : ajouter `import { couleur } from "./charte";` ; remplacer `// Couleurs de l'Atelier clair, en dur : le CSS du site n'existe pas ici.` par `// Couleurs de lib/charte.ts : le CSS du site n'existe pas ici.` ; puis :
- `background: "#f3efe7",` → `background: couleur("fond"),`
- `color: "#1b1a17",` → `color: couleur("texte"),`
- `"radial-gradient(circle, #e0582b 0%, #ef9c62 40%, rgba(243,239,231,0) 70%)",` → `` `radial-gradient(circle, ${couleur("lueur")} 0%, ${couleur("lueur-chaude")} 40%, rgba(42,33,39,0) 70%)`, ``
- `color: "#8a5a3c"` (surtitre) → `color: couleur("accent")`
- `color: "#5b574f"` (sous-titre) → `color: couleur("texte-doux")`

Run: `grep -n "#[0-9a-f]\{6\}" apps/web/lib/vignette.tsx` — Expected : aucune ligne.

- [ ] **Step 3: `viewport` du layout**

Lire le guide `generateViewport` dans `apps/web/node_modules/next/dist/docs/` (`grep -rl "themeColor" apps/web/node_modules/next/dist/docs/`), sections `themeColor` et `colorScheme`. Dans `apps/web/app/layout.tsx` : `import type { Metadata } from "next";` → `import type { Metadata, Viewport } from "next";` ; ajouter `import { couleur } from "@/lib/charte";` ; sous l'export `metadata` :

```ts
/** Barre du navigateur mobile et contrôles natifs aux couleurs de la nuit. */
export const viewport: Viewport = {
  themeColor: couleur("fond"),
  colorScheme: "dark",
};
```

- [ ] **Step 4: Icône**

Remplacer tout `apps/web/app/icon.svg` par :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <!-- Goutte de lumière de l'intro sur la nuit (charte « Nuit mauve », lib/charte.ts). -->
  <defs>
    <radialGradient id="lueur" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#d87f81" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#d87f81" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="#2a2127"/>
  <circle cx="32" cy="32" r="26" fill="url(#lueur)"/>
  <circle cx="32" cy="32" r="12" fill="#eab595"/>
</svg>
```

- [ ] **Step 5: Vérifier**

`./docs/superpowers/plans/charte/court.sh bash -c 'pnpm typecheck && pnpm build && pnpm --filter web exec playwright test e2e/charte.spec.ts --reporter=line'`
Expected: PASS.

- [ ] **Step 6: Commiter**

```bash
git add apps/web/lib/vignette.tsx
git add apps/web/app/layout.tsx
git add apps/web/app/icon.svg
git add apps/web/e2e/charte.spec.ts
git commit -m "Charte : vignettes de partage, couleur du navigateur et icône « goutte »"
```

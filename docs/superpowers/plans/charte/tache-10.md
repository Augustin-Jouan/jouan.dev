# Tâche 10 — Démo intégrée en sombre (`?theme=sombre`)

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **medium**.
> Commandes depuis la racine du dépôt. Termine par le compte rendu de `contexte.md`.

**Files:**
- Create: `apps/demo-marches/src/theme.ts`, `apps/demo-marches/src/theme.test.ts`
- Modify: `apps/demo-marches/src/main.tsx`, `apps/demo-marches/src/styles/jetons.css` (commentaire d'en-tête, jeton `--faint`)
- Modify: `apps/web/components/realisations/FenetreDemo.tsx` (`SOURCE_DEMO`, apparition de l'iframe), `apps/web/components/realisations/FenetreDemo.test.tsx`, `apps/web/scripts/capturer-apercu-demo.mjs`, `apps/web/e2e/realisations.spec.ts`, `apps/web/e2e/demo.spec.ts`
- Regenerate: `apps/web/public/realisations/suivi-de-marches/apercu.webp`

**Interfaces:**
- Produces: `appliquerTheme(recherche: string, racine: HTMLElement): void` ; `SOURCE_DEMO = "/demo/suivi-de-marches/index.html?theme=sombre"`.

- [ ] **Step 1: Test unitaire de la démo (échoue)**

`apps/demo-marches/src/theme.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { appliquerTheme } from "./theme";

describe("appliquerTheme", () => {
  it("passe la démo en sombre avec ?theme=sombre (règle de styles/jetons.css)", () => {
    const racine = document.createElement("html");
    appliquerTheme("?theme=sombre", racine);
    expect(racine.dataset.theme).toBe("sombre");
  });

  it("ne change rien sans paramètre ni avec une autre valeur", () => {
    for (const recherche of ["", "?theme=clair", "?autre=sombre"]) {
      const racine = document.createElement("html");
      appliquerTheme(recherche, racine);
      expect(racine.dataset.theme).toBeUndefined();
    }
  });
});
```

Run: `./docs/superpowers/plans/charte/court.sh pnpm --filter demo-marches exec vitest run src/theme.test.ts --reporter=dot`
Expected: FAIL — `Failed to resolve import "./theme"`.

- [ ] **Step 2: Implémenter dans la démo**

`apps/demo-marches/src/theme.ts` :

```ts
/**
 * Thème de la démo : claire quand on l'ouvre seule ; sombre quand le site
 * l'intègre (`?theme=sombre`), pour s'accorder à sa charte « Nuit mauve ».
 * Pose `data-theme="sombre"` : la règle CSS de styles/jetons.css déclare
 * `color-scheme: dark`, et c'est à elle que LightningCSS attache la bascule des
 * valeurs sombres de `light-dark()` (un style en ligne ne la déclencherait pas).
 * Appelé avant le premier rendu, sans script en ligne (la CSP du site s'applique).
 */
export function appliquerTheme(recherche: string, racine: HTMLElement): void {
  if (new URLSearchParams(recherche).get("theme") === "sombre") racine.dataset.theme = "sombre";
}
```

`apps/demo-marches/src/main.tsx` — garder les imports existants, ajouter `import { appliquerTheme } from "./theme";` avec eux et, juste avant l'appel `createRoot(…)` :

```tsx
appliquerTheme(window.location.search, document.documentElement);
```

`apps/demo-marches/src/styles/jetons.css` :
- dans le commentaire d'en-tête, remplacer `La démo reste en thème clair. */` par `Claire quand on l'ouvre seule ; sombre dans le site (`?theme=sombre`, src/theme.ts). */` ;
- juste après `:root { color-scheme: light; }`, ajouter la règle ci-dessous — **obligatoire** : LightningCSS compile `light-dark()` en variables `--lightningcss-light/-dark` qu'il ne bascule que dans les règles CSS qui déclarent `color-scheme` ; un `style.colorScheme` en ligne laisse la démo claire :

```css
/* Dans le site (`?theme=sombre`, src/theme.ts). Une vraie règle CSS, pas un style
   en ligne : LightningCSS compile light-dark() en variables qu'il ne bascule
   qu'aux règles qui déclarent color-scheme. */
:root[data-theme="sombre"] { color-scheme: dark; }
```

- remplacer `--faint: light-dark(#97a0a7, #748a9d);` par `--faint: light-dark(#97a0a7, #8a9eb0);` (en sombre : 4,64:1 sur `#223442`, sa surface la plus claire, contre 3,58 ; la valeur claire ne change pas).

Run: `./docs/superpowers/plans/charte/court.sh bash -c 'pnpm --filter demo-marches exec vitest run --reporter=dot && pnpm --filter demo-marches build'`
Expected: PASS ; build OK ; `grep -o '\[data-theme=[^}]*}' apps/web/public/demo/suivi-de-marches/assets/*.css` affiche `--lightningcss-dark:initial;color-scheme:dark`.

- [ ] **Step 3: Le site charge la démo en sombre, sans éclair clair (test d'abord)**

Dans `apps/web/components/realisations/FenetreDemo.test.tsx`, dans le test `"charge l'iframe quand la fenêtre approche sur un grand écran"`, après `expect(iframe).toHaveAttribute("src", SOURCE_DEMO);`, ajouter :

```ts
    expect(SOURCE_DEMO).toContain("?theme=sombre");
    // Invisible jusqu'à son chargement : pas d'éclair clair avant le passage en sombre.
    expect(iframe).toHaveClass("opacity-0");
    fireEvent.load(iframe);
    expect(iframe).toHaveClass("opacity-100");
```

(importer `fireEvent` depuis `@testing-library/react` s'il ne l'est pas.)

Run: `./docs/superpowers/plans/charte/court.sh pnpm --filter web exec vitest run components/realisations/FenetreDemo.test.tsx --reporter=dot`
Expected: FAIL (`SOURCE_DEMO` sans paramètre, pas de classe `opacity-0`).

Dans `apps/web/components/realisations/FenetreDemo.tsx` :
- `export const SOURCE_DEMO = "/demo/suivi-de-marches/index.html";` → `export const SOURCE_DEMO = "/demo/suivi-de-marches/index.html?theme=sombre";`
- à côté de l'état qui déclenche le chargement, ajouter `const [prete, setPrete] = useState(false);` ;
- sur l'`<iframe>`, ajouter `onLoad={() => setPrete(true)}` et faire de sa `className` un gabarit qui garde ses classes actuelles (déjà passées à `bg-surface` à la tâche 6) et ajoute `` transition-opacity duration-300 ${prete ? "opacity-100" : "opacity-0"} ``.

Run: `./docs/superpowers/plans/charte/court.sh pnpm --filter web exec vitest run components/realisations --reporter=dot`
Expected: PASS.

- [ ] **Step 4: e2e**

`apps/web/e2e/realisations.spec.ts`, ligne 34 : `toHaveAttribute("href", "/demo/suivi-de-marches/index.html")` → `toHaveAttribute("href", "/demo/suivi-de-marches/index.html?theme=sombre")`.

`apps/web/e2e/demo.spec.ts` — dans le `test.describe("ordinateur", …)`, ajouter :

```ts
  test("dans l'iframe, la démo est en thème sombre", async ({ page }) => {
    await page.goto("/realisations/suivi-de-marches");
    await page.getByRole("img", { name: /Écran des marchés de la démo/ }).scrollIntoViewIfNeeded();
    const iframe = page.locator('iframe[title^="Démo interactive"]');
    await expect(iframe).toHaveClass(/opacity-100/);
    const cadre = page.frames().find((f) => f.url().includes("/demo/suivi-de-marches/"))!;
    expect(await cadre.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("dark");
    // Les couleurs réellement affichées (le seul color-scheme ne prouve pas la bascule des jetons).
    const corps = await cadre.evaluate(() => {
      const s = getComputedStyle(document.body);
      return { fond: s.backgroundColor, texte: s.color };
    });
    expect(corps).toEqual({ fond: "rgb(20, 32, 43)", texte: "rgb(233, 239, 245)" });
  });
```

(Reprendre le sélecteur d'image et le titre de l'iframe des tests voisins du fichier s'ils diffèrent.)

- [ ] **Step 5: Régénérer l'aperçu en sombre**

`apps/web/scripts/capturer-apercu-demo.mjs` : dans l'appel `page.goto(…/demo/suivi-de-marches/index.html…)`, ajouter `?theme=sombre` à l'adresse ; dans le commentaire d'en-tête, « ouvre la démo en » → « ouvre la démo en thème sombre, en ».


```bash
./docs/superpowers/plans/charte/court.sh bash -c 'pnpm build && pnpm --filter web capturer-apercu-demo'
./docs/superpowers/plans/charte/court.sh pnpm --filter web exec playwright test e2e/demo.spec.ts e2e/realisations.spec.ts --reporter=line
```

Expected: « Aperçu enregistré : …/apercu.webp » ; ouvrir l'image : la démo y est sombre (luminance moyenne ≈ 40 ; ≈ 228 si elle est restée claire) ; e2e PASS. Puis `./docs/superpowers/plans/charte/court.sh pnpm --filter web verifier-taille-demo` : PASS.

- [ ] **Step 6: Commiter**

```bash
bash <<'EOF'
set -e
for f in apps/demo-marches/src/theme.ts apps/demo-marches/src/theme.test.ts apps/demo-marches/src/main.tsx apps/demo-marches/src/styles/jetons.css apps/web/components/realisations/FenetreDemo.tsx apps/web/components/realisations/FenetreDemo.test.tsx apps/web/scripts/capturer-apercu-demo.mjs apps/web/e2e/realisations.spec.ts apps/web/e2e/demo.spec.ts apps/web/public/realisations/suivi-de-marches/apercu.webp; do git add "$f"; done
EOF
git commit -m "Démo : thème sombre dans le site (?theme=sombre), sans éclair clair, aperçu régénéré"
```

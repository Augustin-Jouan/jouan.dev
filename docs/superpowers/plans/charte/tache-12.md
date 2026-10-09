# Tâche 12 — Accessibilité de bout en bout et documentation

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **high**.
> Commandes depuis la racine du worktree. Termine par le compte rendu de `contexte.md`.

**Files:**
- Modify: `apps/web/package.json`, `pnpm-lock.yaml` (dépendance `@axe-core/playwright`)
- Create: `apps/web/e2e/accessibilite.spec.ts`
- Modify: `README.md` (lignes 4-5 et nouvelle section « Charte »)

**Interfaces:**
- Consumes: `simulerGpu` de `apps/web/e2e/outils.ts`.

- [ ] **Step 1: Dépendance**

Run: `./docs/superpowers/plans/charte/court.sh pnpm --filter web add -D @axe-core/playwright`
Expected: ajoutée aux `devDependencies` d'`apps/web/package.json` ; `pnpm-lock.yaml` mis à jour.

- [ ] **Step 2: `e2e/accessibilite.spec.ts`**

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { simulerGpu } from "./outils";

/**
 * Charte « Nuit mauve » : chaque page publique passe les règles WCAG 2.0, 2.1 et
 * 2.2 (A et AA) d'axe-core, contraste compris : plus large que Lighthouse.
 */
const NORMES = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PAGES = [
  "/",
  "/realisations/suivi-de-marches",
  "/realisations/site-artisan",
  "/contact",
  "/coulisses",
  "/mentions-legales",
  "/politique-de-confidentialite",
  "/admin/connexion",
  "/demo/suivi-de-marches/index.html?theme=sombre",
];

async function violations(page: Page): Promise<string[]> {
  const resultat = await new AxeBuilder({ page }).withTags(NORMES).analyze();
  return resultat.violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test.describe("mouvement réduit (page posée)", () => {
  test.use({ reducedMotion: "reduce" });

  for (const chemin of PAGES) {
    test(`${chemin} : aucune violation WCAG A/AA`, async ({ page }) => {
      await page.goto(chemin);
      expect(await violations(page)).toEqual([]);
    });
  }

  test("page personnalisée d'exemple : aucune violation WCAG A/AA", async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, "Base de test requise (DATABASE_URL).");
    await page.goto("/?pour=exemple-0000");
    expect(await violations(page)).toEqual([]);
  });
});

test("accueil après l'intro, sans mouvement réduit : aucune violation WCAG A/AA", async ({ page }) => {
  await simulerGpu(page);
  await page.goto("/");
  await expect(page.locator(".fond-accueil")).toHaveAttribute("data-intro", "terminee", { timeout: 5000 });
  expect(await violations(page)).toEqual([]);
});

test("la page déclare un thème sombre aux contrôles natifs", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("dark");
});

for (const chemin of ["/", "/contact"]) {
  test(`${chemin} : chaque élément atteint au clavier montre un focus pêche`, async ({ page, isMobile }) => {
    test.skip(isMobile, "Navigation au clavier : ordinateur seulement.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(chemin);
    const vus = new Set<string>();
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press("Tab");
      const etat = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const peche = "rgb(234, 181, 149)";
        const contour = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2 && s.outlineColor === peche;
        const anneau = s.boxShadow.includes(peche);
        return { id: el.outerHTML.slice(0, 160), visible: contour || anneau };
      });
      if (!etat || vus.has(etat.id)) break;
      vus.add(etat.id);
      expect(etat.visible, etat.id).toBe(true);
    }
    expect(vus.size).toBeGreaterThan(5);
  });
}
```

- [ ] **Step 3: Lancer**

`./docs/superpowers/plans/charte/court.sh bash -c 'pnpm build && pnpm --filter web semer-lien-exemple && pnpm --filter web exec playwright test e2e/accessibilite.spec.ts --reporter=line'`
Expected: PASS. Pour chaque violation : corriger la couleur **du composant** avec le rôle adapté (tableau de la section 3 de la spec) ; pour la démo, ses jetons sombres (`apps/demo-marches/src/styles/jetons.css`, valeur sombre de `light-dark()`). Ne jamais désactiver une règle d'axe. Si une violation vient d'une teinte de la charte elle-même, ou d'une structure (titres, libellés) hors de la charte, s'arrêter et prévenir Augustin. Le point pulsant de la sauge est décoratif (`aria-hidden`) : axe ne le compte pas comme du texte.

- [ ] **Step 4: README**

Dans `README.md`, lignes 4-5 : `page d'accueil « Atelier clair »` → `page d'accueil sombre (charte « Nuit mauve »)` et `WebGL « goutte d'encre »` → `WebGL « goutte de lumière »`. Puis ajouter, avant `## Déploiement` :

```markdown
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
```

- [ ] **Step 5: Commiter**

```bash
grep -cP "[\x{00a0}\x{202f}]" apps/web/e2e/accessibilite.spec.ts README.md
git add apps/web/package.json
git add pnpm-lock.yaml
git add apps/web/e2e/accessibilite.spec.ts
git add README.md
git commit -m "Charte : axe-core (WCAG 2.2 AA) sur toutes les pages, focus et thème sombre vérifiés, README"
```

- [ ] **Step 6: S'arrêter**

Ne pas pousser. Le compte rendu suffit : la vérification complète, Lighthouse et les captures sont lancés par Augustin (`verification-finale.md`).

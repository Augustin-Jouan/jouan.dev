import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { FIN_INTRO_MS, simulerGpu } from "./outils";

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
  await expect(page.locator(".fond-accueil")).toHaveAttribute("data-intro", "terminee", { timeout: FIN_INTRO_MS });
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

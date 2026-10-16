import { expect, test, type Page } from "@playwright/test";

/** Défilement doux démarré : Lenis pose la classe `lenis` sur <html>. */
const lenisActif = (page: Page) => page.evaluate(() => document.documentElement.classList.contains("lenis"));
const attendreLenis = (page: Page) =>
  page.waitForFunction(() => document.documentElement.classList.contains("lenis"), null, { timeout: 10_000 });

/**
 * Positions de défilement relevées image par image jusqu'à l'arrivée (position inchangée sur 10 images),
 * 10 s au plus. Pas de durée fixe : en CI, le navigateur sans carte graphique peut n'afficher qu'une
 * douzaine d'images par seconde, et le glissé de Lenis avance image par image.
 */
const releverJusquALArret = (page: Page) =>
  page.evaluate(async () => {
    const valeurs: number[] = [];
    const fin = performance.now() + 10_000;
    while (performance.now() < fin) {
      await new Promise((ok) => requestAnimationFrame(ok));
      valeurs.push(Math.round(window.scrollY));
      const dernieres = valeurs.slice(-10);
      if (dernieres.length === 10 && dernieres.every((y) => y === dernieres[0]) && dernieres[0] !== 0) break;
    }
    return valeurs;
  });

test.beforeEach(async ({ page }) => {
  // Intro déjà vue : l'accueil s'affiche tout de suite.
  await page.addInitScript(() => sessionStorage.setItem("jouan.dev:intro-vue", "1"));
});

test.describe("avec une souris", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "ordinateur", "Défilement doux : souris ou pavé tactile seulement.");
  });

  test("à la molette, la page glisse au lieu de sauter d'un cran", async ({ page }) => {
    await page.goto("/");
    await attendreLenis(page);
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, 500);
    const positions = await releverJusquALArret(page);
    const intermediaires = new Set(positions.filter((y) => y > 5 && y < 495));
    expect(intermediaires.size, positions.join(" ")).toBeGreaterThanOrEqual(3);
    expect(positions.at(-1), positions.join(" ")).toBeGreaterThanOrEqual(495);
  });

  test("un lien du menu glisse jusqu'à sa section et garde la personnalisation", async ({ page }) => {
    await page.goto("/?pour=inconnu-0000");
    await attendreLenis(page);
    await page.getByRole("banner").getByRole("link", { name: "Contact" }).click();
    const positions = await releverJusquALArret(page);
    expect(new Set(positions.filter((y) => y > 5 && y < positions.at(-1)! - 5)).size, positions.join(" ")).toBeGreaterThanOrEqual(3);
    expect(new URL(page.url()).search).toBe("?pour=inconnu-0000");
    expect(new URL(page.url()).hash).toBe("#contact");
    // Arrivée sous la marge de défilement de la section (`scroll-mt-8`, 32 px).
    const haut = await page.evaluate(() => document.getElementById("contact")!.getBoundingClientRect().top);
    expect(Math.abs(haut - 32)).toBeLessThanOrEqual(2);
  });

  test("dans la palette, la molette fait défiler la liste, pas la page", async ({ page }) => {
    await page.goto("/");
    await attendreLenis(page);
    await page.keyboard.press("Control+k");
    const liste = page.getByRole("listbox", { name: "Commandes" });
    const cadre = (await liste.boundingBox())!;
    await page.mouse.move(cadre.x + cadre.width / 2, cadre.y + cadre.height / 2);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => liste.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test("sur téléphone, défilement natif : le défilement doux n'est pas chargé", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Téléphone seulement.");
  await page.goto("/");
  await page.waitForTimeout(3_500);
  expect(await lenisActif(page)).toBe(false);
});

test.describe("mouvement réduit", () => {
  test.use({ reducedMotion: "reduce" });

  test("le défilement doux n'est pas chargé", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3_500);
    expect(await lenisActif(page)).toBe(false);
  });
});

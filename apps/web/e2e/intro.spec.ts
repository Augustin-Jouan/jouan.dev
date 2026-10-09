import { test, expect, type Page } from "@playwright/test";
import { simulerGpu } from "./outils";

const CLE = "jouan.dev:intro-vue";

// L'intro ne se joue qu'avec une carte graphique : on en simule une.
test.beforeEach(async ({ page }) => {
  await simulerGpu(page);
});

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

// Revue finale, Important 1 : sur un téléphone lent, le moteur arrive plusieurs
// centaines de ms après l'hydratation. Un geste fait pendant ce délai ne doit
// pas être perdu, et l'encre ne doit jamais recouvrir une page déjà défilée.
const MARQUEUR_MOTEUR = "moteur-encre:v1";
const RETARD_MOTEUR_MS = 1500;

/** Retarde le seul morceau de JS qui contient le moteur (repéré par son marqueur). */
async function retarderMoteur(page: Page) {
  await page.route("**/_next/static/chunks/**/*.js", async (route) => {
    const reponse = await route.fetch();
    const corps = await reponse.text();
    if (corps.includes(MARQUEUR_MOTEUR)) {
      await new Promise((resoudre) => setTimeout(resoudre, RETARD_MOTEUR_MS));
    }
    await route.fulfill({ response: reponse, body: corps });
  });
}

/** Enregistre chaque état du fond : valeur de data-intro et z-index calculé. */
async function enregistrerFond(page: Page) {
  await page.evaluate(() => {
    const fond = document.querySelector<HTMLElement>(".fond-accueil")!;
    const etats: { intro: string | null; zIndex: string }[] = [];
    const noter = () => etats.push({ intro: fond.dataset.intro ?? null, zIndex: getComputedStyle(fond).zIndex });
    noter();
    new MutationObserver(noter).observe(fond, { attributes: true });
    (window as unknown as { etatsFond: typeof etats }).etatsFond = etats;
  });
}

const etatsFond = (page: Page) =>
  page.evaluate(() => (window as unknown as { etatsFond: { intro: string | null; zIndex: string }[] }).etatsFond);

test.describe("moteur en retard", () => {
  test.beforeEach(async ({ page }) => {
    await retarderMoteur(page);
    await page.goto("/");
    // Hydraté, intro décidée, moteur encore en route.
    await expect(page.locator(".fond-accueil")).toHaveAttribute("data-mode", "intro");
    await enregistrerFond(page);
  });

  test("sans geste, l'intro se joue quand même", async ({ page }) => {
    const fond = page.locator(".fond-accueil");
    await expect(fond).toHaveAttribute("data-intro", "en-cours", { timeout: 5000 });
  });

  test("un clic avant l'arrivée du moteur annule l'intro", async ({ page }) => {
    await page.mouse.click(5, 5);
    const fond = page.locator(".fond-accueil");
    await expect(fond).toHaveAttribute("data-encre", "actif", { timeout: 5000 });
    await expect(fond).toHaveAttribute("data-intro", "terminee");
    const etats = await etatsFond(page);
    expect(etats.map((e) => e.intro)).not.toContain("en-cours");
    expect(etats.map((e) => e.zIndex)).not.toContain("50");
  });

  test("un défilement avant l'arrivée du moteur : l'encre ne recouvre jamais la page", async ({ page }, testInfo) => {
    if (testInfo.project.name === "mobile") {
      // Pas de molette sur mobile : un défilement programmé émet le même `scroll`.
      await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
    } else {
      await page.mouse.move(400, 400);
      await page.mouse.wheel(0, 600);
    }
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const fond = page.locator(".fond-accueil");
    await expect(fond).toHaveAttribute("data-encre", "actif", { timeout: 5000 });
    await expect(fond).toHaveAttribute("data-intro", "terminee");
    const etats = await etatsFond(page);
    expect(etats.map((e) => e.intro)).not.toContain("en-cours");
    expect(etats.map((e) => e.zIndex)).not.toContain("50");
  });
});

import { test, expect, type Page } from "@playwright/test";
import { FIN_INTRO_MS, simulerGpu } from "./outils";

const CLE = "jouan.dev:intro-vue";

// L'intro ne se joue qu'avec une carte graphique : on en simule une.
test.beforeEach(async ({ page }) => {
  await simulerGpu(page);
});

test("première visite : l'intro se joue puis devient le nuage", async ({ page }) => {
  await page.goto("/");
  const fond = page.locator(".fond-accueil");
  await expect(fond).toHaveAttribute("data-mode", "intro");
  await expect(fond).toHaveAttribute("data-encre", "actif");
  await expect(fond).toHaveAttribute("data-intro", "terminee", { timeout: FIN_INTRO_MS });
  expect(await page.evaluate((cle) => sessionStorage.getItem(cle), CLE)).toBe("1");
});

test("pendant l'intro, le nom se lit en nuit sur la goutte pêche", async ({ page }) => {
  await page.goto("/");
  const nom = page.locator(".fond-accueil__nom");
  await expect(nom).toBeAttached();
  expect(await nom.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(42, 33, 39)"); // sur-accent (nuit)
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

test("dans le même onglet (rechargement, retour à l'accueil) : pas d'intro, nuage animé", async ({ page }) => {
  await page.addInitScript((cle) => sessionStorage.setItem(cle, "1"), CLE);
  await page.goto("/");
  const fond = page.locator(".fond-accueil");
  await expect(fond).toHaveAttribute("data-mode", "nuage-anime");
  await expect(fond).toHaveAttribute("data-encre", "actif");
  await expect(fond).not.toHaveAttribute("data-intro", /.+/);
});

test("nouvelle visite (nouvel onglet) : l'intro se rejoue", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.locator(".fond-accueil")).toHaveAttribute("data-intro", "terminee", { timeout: FIN_INTRO_MS });

  const onglet = await context.newPage();
  await simulerGpu(onglet);
  // Ancien repère (intro vue une fois pour toutes) laissé chez un visiteur qui revient : sans effet.
  await onglet.addInitScript((cle) => localStorage.setItem(cle, "1"), CLE);
  await onglet.goto("/");
  await expect(onglet.locator(".fond-accueil")).toHaveAttribute("data-mode", "intro");
  await expect(onglet.locator(".fond-accueil")).toHaveAttribute("data-intro", "terminee", { timeout: FIN_INTRO_MS });
});

test("« Rejouer l'intro » depuis la palette, page défilée : l'intro repart du haut", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Raccourci clavier : ordinateur seulement.");
  await page.goto("/");
  const fond = page.locator(".fond-accueil");
  await expect(fond).toHaveAttribute("data-intro", "terminee", { timeout: FIN_INTRO_MS });
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox").fill("rejouer");
  await page.keyboard.press("Enter");
  await expect(fond).toHaveAttribute("data-intro", "en-cours");
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(fond).toHaveAttribute("data-intro", "terminee", { timeout: FIN_INTRO_MS });
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

// Voile de l'intro (lib/encre/voile.ts) : la page ne s'affiche pas avant l'intro.
const VOILE = "data-voile-intro";

/** Note chaque pose ou levée du voile, avec l'état de l'intro à ce moment-là. */
async function enregistrerVoile(page: Page) {
  await page.addInitScript((attribut) => {
    const w = window as unknown as { voile: { voile: boolean; intro: string | null }[] };
    w.voile = [];
    new MutationObserver(() =>
      w.voile.push({
        voile: document.documentElement.hasAttribute(attribut),
        intro: document.querySelector<HTMLElement>(".fond-accueil")?.dataset.intro ?? null,
      }),
      // <html> n'existe pas encore quand ce script s'exécute : on observe le document.
    ).observe(document, { attributes: true, subtree: true, attributeFilter: [attribut] });
  }, VOILE);
}

const etatsVoile = (page: Page) =>
  page.evaluate(() => (window as unknown as { voile: { voile: boolean; intro: string | null }[] }).voile);

test.describe("voile avant l'intro", () => {
  test("la nuit cache la page dès le premier affichage, jusqu'à ce que la goutte la couvre", async ({ page }) => {
    await enregistrerVoile(page);
    await retarderMoteur(page);
    await page.goto("/");
    const racine = page.locator("html");
    await expect(racine).toHaveAttribute(VOILE, "");
    const voile = await page.evaluate(() => {
      const style = getComputedStyle(document.body, "::after");
      return { position: style.position, zIndex: style.zIndex, fond: style.backgroundColor };
    });
    expect(voile).toEqual({ position: "fixed", zIndex: "40", fond: "rgb(42, 33, 39)" });
    await expect(racine).not.toHaveAttribute(VOILE, { timeout: 5000 });
    expect(await etatsVoile(page)).toEqual([
      { voile: true, intro: null },
      { voile: false, intro: "en-cours" },
    ]);
    await expect(page.locator(".fond-accueil")).toHaveAttribute("data-intro", "terminee", { timeout: FIN_INTRO_MS });
  });

  test("un geste avant l'arrivée du moteur lève le voile tout de suite", async ({ page }) => {
    await retarderMoteur(page);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute(VOILE, "");
    // Hydraté, intro décidée, moteur encore en route.
    await expect(page.locator(".fond-accueil")).toHaveAttribute("data-mode", "intro");
    await page.mouse.click(5, 5);
    await expect(page.locator("html")).not.toHaveAttribute(VOILE, { timeout: 300 });
    // Laisse arriver le moteur retardé avant de fermer la page.
    await expect(page.locator(".fond-accueil")).toHaveAttribute("data-encre", "actif", { timeout: 5000 });
  });

  test("moteur introuvable : le voile se lève et le nuage figé reste", async ({ page }) => {
    await page.route("**/_next/static/chunks/**/*.js", async (route) => {
      const reponse = await route.fetch();
      const corps = await reponse.text();
      if (corps.includes(MARQUEUR_MOTEUR)) await route.abort();
      else await route.fulfill({ response: reponse, body: corps });
    });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute(VOILE, { timeout: 5000 });
    await expect(page.locator(".fond-accueil")).toHaveAttribute("data-mode", "nuage-fige");
  });

  test("aucun voile quand l'intro ne se jouera pas", async ({ page }) => {
    await enregistrerVoile(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".fond-accueil")).toHaveAttribute("data-mode", "nuage-fige");
    expect(await etatsVoile(page)).toEqual([]);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/#contact");
    await expect(page.locator(".fond-accueil")).toHaveAttribute("data-mode", /nuage/);
    expect(await etatsVoile(page)).toEqual([]);

    await page.goto("/");
    await expect(page.locator(".fond-accueil")).toHaveAttribute("data-intro", "terminee", { timeout: FIN_INTRO_MS });
    await page.reload();
    await expect(page.locator(".fond-accueil")).toHaveAttribute("data-mode", "nuage-anime");
    expect(await etatsVoile(page)).toEqual([]);
  });
});

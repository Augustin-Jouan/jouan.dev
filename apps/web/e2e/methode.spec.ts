import { expect, test, type Page } from "@playwright/test";

const ETAPES = 5;

/** Opacité de chaque titre d'étape, après le prochain rendu (l'animation suit le défilement). */
async function opacites(page: Page): Promise<number[]> {
  return page.evaluate(async () => {
    await new Promise((fin) => requestAnimationFrame(() => requestAnimationFrame(fin)));
    return [...document.querySelectorAll("#methode li h3")].map((h) => Number(getComputedStyle(h).opacity));
  });
}

async function defilerVers(page: Page, fraction: number) {
  // `fraction` : part parcourue de la frise, de son entrée en bas de l'écran (0) à sa sortie en haut (1).
  await page.evaluate((f) => {
    const r = document.querySelector(".methode-frise")!.getBoundingClientRect();
    // Instantané : la page défile en douceur (`scroll-behavior: smooth`), le relevé serait en retard.
    window.scrollTo({ top: r.top + window.scrollY - window.innerHeight + f * (window.innerHeight + r.height), behavior: "instant" });
  }, fraction);
}

test.beforeEach(async ({ page }) => {
  // Intro déjà vue : l'accueil s'affiche tout de suite.
  await page.addInitScript(() => sessionStorage.setItem("jouan.dev:intro-vue", "1"));
});

test("la méthode s'allume étape par étape au défilement, dans l'ordre, puis reste allumée", async ({ page }) => {
  await page.goto("/");
  await defilerVers(page, 0);
  expect(await opacites(page)).toEqual(Array(ETAPES).fill(0));

  let partiel = false;
  for (let f = 0; f <= 0.7; f += 0.02) {
    await defilerVers(page, f);
    const allumees = (await opacites(page)).map((o) => o > 0.99);
    // Toujours un début de liste : jamais une étape allumée après une éteinte.
    expect(allumees.indexOf(false) === -1 || !allumees.slice(allumees.indexOf(false)).includes(true), String(allumees)).toBe(true);
    if (allumees.includes(true) && allumees.includes(false)) partiel = true;
  }
  expect(partiel).toBe(true);
  expect(await opacites(page)).toEqual(Array(ETAPES).fill(1));
});

test.describe("mouvement réduit", () => {
  test.use({ reducedMotion: "reduce" });

  test("les étapes sont affichées d'emblée, sans animation", async ({ page }) => {
    await page.goto("/");
    await defilerVers(page, 0);
    expect(await opacites(page)).toEqual(Array(ETAPES).fill(1));
  });
});

test("le paquet de lumière ne fait jamais déborder la page en largeur", async ({ page }) => {
  await page.goto("/");
  for (const fraction of [0, 0.3, 0.7]) {
    await defilerVers(page, fraction);
    // Toute une boucle du paquet (4 s) : la largeur de la page ne doit jamais dépasser l'écran.
    const debordementMax = await page.evaluate(async () => {
      let max = 0;
      const fin = performance.now() + 4_200;
      while (performance.now() < fin) {
        await new Promise((ok) => requestAnimationFrame(ok));
        max = Math.max(max, document.documentElement.scrollWidth - document.documentElement.clientWidth);
      }
      return max;
    });
    expect(debordementMax, `fraction ${fraction}`).toBe(0);
  }
});

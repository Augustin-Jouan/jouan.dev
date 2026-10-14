import { expect, test, type Page } from "@playwright/test";

const ETAPES = 5;

/** Opacité de chaque titre d'étape, après le prochain rendu. */
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

/** Jamais une étape allumée après une éteinte : toujours un début de liste. */
function enOrdre(allumees: boolean[]) {
  const premiereEteinte = allumees.indexOf(false);
  return premiereEteinte === -1 || !allumees.slice(premiereEteinte).includes(true);
}

test("ordinateur : la frise s'allume d'une traite en cascade, même si l'on cesse de défiler", async ({ page, isMobile }) => {
  test.skip(isMobile, "Cascade : ordinateur seulement.");
  await page.goto("/");
  // Frise armée (hydratée) avant de défiler : sinon elle serait déjà à l'écran et resterait finie.
  await expect(page.locator(".methode-frise[data-animation]")).toBeAttached();
  // Fil effacé d'un coup à l'armement : s'il se « détraçait » en transition, la cascade partirait d'un fil plein.
  expect(await page.locator(".methode-fil__plein").evaluate((f) => f.getBoundingClientRect().width)).toBe(0);
  await defilerVers(page, 0);
  expect(await opacites(page)).toEqual(Array(ETAPES).fill(0));

  // Un seul coup de défilement, puis plus rien : la cascade doit aller au bout seule.
  await defilerVers(page, 0.4);
  let partiel = false;
  const fin = Date.now() + 4_000;
  while (Date.now() < fin) {
    const allumees = (await opacites(page)).map((o) => o > 0.99);
    expect(enOrdre(allumees), String(allumees)).toBe(true);
    if (allumees.includes(true) && allumees.includes(false)) partiel = true;
    if (!allumees.includes(false)) break;
  }
  expect(partiel).toBe(true);
  await expect.poll(() => opacites(page), { timeout: 1_000 }).toEqual(Array(ETAPES).fill(1));
});

test("téléphone : chaque étape s'allume en arrivant à l'écran, et le reste", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Étape par étape : téléphone seulement.");
  /** Place le haut (0) ou le bas (1) de la frise au milieu de l'écran. */
  const centrer = (bord: 0 | 1) =>
    page.evaluate((b) => {
      const r = document.querySelector(".methode-frise")!.getBoundingClientRect();
      window.scrollTo({ top: (b ? r.bottom : r.top) + window.scrollY - window.innerHeight / 2, behavior: "instant" });
    }, bord);
  await page.goto("/");
  // Frise armée (hydratée) avant de défiler : sinon elle serait déjà à l'écran et resterait finie.
  await expect(page.locator(".methode-frise[data-animation]")).toBeAttached();

  // Haut de la frise au milieu de l'écran : les premières étapes y sont, pas la dernière.
  await centrer(0);
  await expect.poll(async () => (await opacites(page))[0], { timeout: 3_000 }).toBe(1);
  await page.waitForTimeout(1_000);
  const valeurs = await opacites(page);
  expect(valeurs[ETAPES - 1]).toBe(0);
  expect(enOrdre(valeurs.map((o) => o > 0.99)), String(valeurs)).toBe(true);

  // Bas de la frise à l'écran : tout est allumé, et le reste en remontant.
  await centrer(1);
  await expect.poll(() => opacites(page), { timeout: 3_000 }).toEqual(Array(ETAPES).fill(1));
  await defilerVers(page, 0);
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

import { readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { surveillerErreurs } from "./outils";

// Playwright charge les tests en CJS : l'import du `.mjs` échoue
// (`import.meta` hors module). Même logique que scripts/verifier-taille-3d.mjs.
const SIGNATURES_3D = ["scene-3d:v1", "__THREE__", "isCSS2DObject", "autoRotateSpeed"];
const contientVue3d = (code: string) => SIGNATURES_3D.some((s) => code.includes(s));

test("au bouton, la 3D se charge, chacun de ses morceaux est compté, puis « Voir en 2D » ramène le schéma", async ({ page }) => {
  await page.goto("/coulisses");
  const webgl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  });
  test.skip(!webgl, "WebGL indisponible dans ce navigateur de test.");
  const erreurs = surveillerErreurs(page);
  expect(await page.evaluate(() => "__THREE__" in window)).toBe(false);
  // Prefetch Next du lien d'accueil (`/`) : sans attendre, son JS (IntroEncre)
  // arrive pendant le clic et n'est pas une signature 3D.
  await page.waitForLoadState("networkidle");
  // Défilement doux (Lenis), chargé dans un temps libre : il ne doit pas arriver pendant le clic.
  await page.waitForFunction(
    () =>
      document.documentElement.classList.contains("lenis") ||
      matchMedia("(hover: none) and (pointer: coarse)").matches ||
      matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const charges: string[] = [];
  page.on("response", (r) => {
    if (r.request().resourceType() === "script") charges.push(decodeURIComponent(new URL(r.url()).pathname));
  });
  await page.getByRole("button", { name: "Voir en 3D" }).click();
  await expect(page.getByTestId("scene-3d").locator("canvas")).toBeVisible();
  expect(await page.evaluate(() => "__THREE__" in window)).toBe(true);

  // Chaque morceau chargé par le clic (ou par le geste qui le précède) est compté par verifier-taille-3d
  // (budget de 180 Ko compressés).
  expect(charges.length).toBeGreaterThan(0);
  for (const chemin of charges) {
    const fichier = join(process.cwd(), ".next", chemin.replace(/^\/_next\//, ""));
    expect(contientVue3d(readFileSync(fichier, "utf8")), `${chemin} n'est pas compté par verifier-taille-3d`).toBe(true);
  }

  await page.getByRole("group", { name: "Nœuds" }).getByRole("button", { name: "Base" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Base" })).toBeVisible();
  await page.getByRole("button", { name: "Voir en 2D" }).click();
  await expect(page.getByRole("group", { name: "Schéma de l'architecture" })).toBeVisible();
  await expect(page.getByTestId("scene-3d")).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

/** Fait passer le moteur de rendu WebGL pour `nom` (comme `simulerGpu` d'e2e/outils.ts). */
async function simulerRendu(page: Page, nom: string) {
  await page.addInitScript((nom) => {
    const original = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (this: WebGL2RenderingContext, p: number) {
      return p === 0x1f01 || p === 0x9246 ? nom : original.call(this, p);
    };
  }, nom);
}

/** Gestes répétés jusqu'à `attente` : un geste avant l'hydratation n'est pas vu (le suivant le sera). */
async function gesteJusqua(page: Page, isMobile: boolean, attente: () => Promise<void>) {
  let i = 0;
  await expect(async () => {
    i++;
    if (isMobile) await page.touchscreen.tap(200, 200 + i);
    else await page.mouse.move(300, 300 + i);
    await attente();
  }).toPass({ timeout: 15_000 });
}

test("sans aucun geste, la 3D n'est pas chargée : la page arrive légère, avec le schéma 2D (budget Lighthouse)", async ({ page }) => {
  await page.goto("/coulisses");
  await page.waitForLoadState("load");
  await page.waitForTimeout(3_000);
  expect(await page.evaluate(() => "__THREE__" in window)).toBe(false);
  await expect(page.getByRole("group", { name: "Schéma de l'architecture" }).first()).toBeAttached();
});

test("au premier geste, sur une carte graphique, la 3D remplace le schéma 2D", async ({ page, isMobile }) => {
  await simulerRendu(page, "GPU simulé (tests)");
  await page.goto("/coulisses");
  const webgl = await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2")));
  test.skip(!webgl, "WebGL indisponible dans ce navigateur de test.");
  const erreurs = surveillerErreurs(page);
  await gesteJusqua(page, isMobile, () => expect(page.getByTestId("scene-3d").locator("canvas")).toBeVisible({ timeout: 1_000 }));
  await expect(page.getByRole("button", { name: "Voir en 2D" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Schéma de l'architecture" })).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test("au premier geste, au processeur, le schéma 2D reste et la 3D reste proposée", async ({ page, isMobile }) => {
  await simulerRendu(page, "Google SwiftShader");
  await page.goto("/coulisses");
  const webgl = await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2")));
  test.skip(!webgl, "WebGL indisponible dans ce navigateur de test.");
  await page.waitForLoadState("networkidle");
  // Le bouton apparaît à l'hydratation : les gestes qui suivent sont vus.
  await expect(page.getByRole("button", { name: "Voir en 3D" })).toBeVisible();
  for (let i = 0; i < 3; i++) {
    if (isMobile) await page.touchscreen.tap(200, 200 + i);
    else await page.mouse.move(300, 300 + i);
  }
  await page.waitForTimeout(2_000);
  expect(await page.evaluate(() => "__THREE__" in window)).toBe(false);
  await expect(page.getByRole("button", { name: "Voir en 3D" })).toBeVisible();
});

test("/coulisses?vue=3d ouvre directement la vue 3D", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/coulisses?vue=3d");
  const webgl = await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2")));
  test.skip(!webgl, "WebGL indisponible dans ce navigateur de test.");
  await expect(page.getByTestId("scene-3d").locator("canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Voir en 2D" })).toBeVisible();
  expect(erreurs).toEqual([]);
});

test("en 3D, les coulisses restent sans violation WCAG A/AA", async ({ page }) => {
  await page.goto("/coulisses?vue=3d");
  const webgl = await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2")));
  test.skip(!webgl, "WebGL indisponible dans ce navigateur de test.");
  await expect(page.getByTestId("scene-3d").locator("canvas")).toBeVisible();
  // Les étiquettes HTML de la scène sont posées à la première image.
  await expect(page.getByTestId("scene-3d").getByText("Déploiement")).toBeVisible();
  const resultat = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(resultat.violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});

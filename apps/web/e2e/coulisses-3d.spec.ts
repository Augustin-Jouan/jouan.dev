import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { surveillerErreurs } from "./outils";

// Playwright charge les tests en CJS : l'import du `.mjs` échoue
// (`import.meta` hors module). Même logique que scripts/verifier-taille-3d.mjs.
const SIGNATURES_3D = ["scene-3d:v1", "__THREE__", "isCSS2DObject", "autoRotateSpeed"];
const contientVue3d = (code: string) => SIGNATURES_3D.some((s) => code.includes(s));

test("la 3D se charge au clic seulement, puis revient en 2D", async ({ page }) => {
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

  const charges: string[] = [];
  page.on("response", (r) => {
    if (r.request().resourceType() === "script") charges.push(decodeURIComponent(new URL(r.url()).pathname));
  });
  await page.getByRole("button", { name: "Voir en 3D" }).click();
  await expect(page.getByTestId("scene-3d").locator("canvas")).toBeVisible();
  expect(await page.evaluate(() => "__THREE__" in window)).toBe(true);

  // Chaque morceau chargé par le clic est compté par verifier-taille-3d (budget de 180 Ko compressés).
  expect(charges.length).toBeGreaterThan(0);
  for (const chemin of charges) {
    const fichier = join(process.cwd(), ".next", chemin.replace(/^\/_next\//, ""));
    expect(contientVue3d(readFileSync(fichier, "utf8")), `${chemin} n'est pas compté par verifier-taille-3d`).toBe(true);
  }

  await page.getByRole("group", { name: "Nœuds" }).getByRole("button", { name: "Base" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Base" })).toBeVisible();
  await page.getByRole("button", { name: "Revenir en 2D" }).click();
  await expect(page.getByRole("group", { name: "Schéma de l'architecture" })).toBeVisible();
  await expect(page.getByTestId("scene-3d")).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test("/coulisses?vue=3d ouvre directement la vue 3D", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/coulisses?vue=3d");
  const webgl = await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2")));
  test.skip(!webgl, "WebGL indisponible dans ce navigateur de test.");
  await expect(page.getByTestId("scene-3d").locator("canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Revenir en 2D" })).toBeVisible();
  expect(erreurs).toEqual([]);
});

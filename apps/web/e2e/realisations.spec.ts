import { expect, test } from "@playwright/test";
import { surveillerErreurs } from "./outils";

test("depuis l'accueil, une carte ouvre son étude de cas", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Suivi de marchés de travaux" }).click();
  await expect(page).toHaveURL(/\/realisations\/suivi-de-marches$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("suivi des marchés");
  expect(erreurs).toEqual([]);
});

test("l'étude du site vitrine montre ses captures et renvoie vers l'autre étude", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/realisations/site-artisan");
  await expect(page.getByRole("img", { name: /sur ordinateur/ })).toBeVisible();
  await page.getByRole("link", { name: /Voir aussi/ }).click();
  await expect(page).toHaveURL(/suivi-de-marches$/);
  expect(erreurs).toEqual([]);
});

test("pas de débordement horizontal", async ({ page }) => {
  for (const chemin of ["/realisations/suivi-de-marches", "/realisations/site-artisan"]) {
    await page.goto(chemin);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  }
});

test("sans JavaScript, l'aperçu et le lien plein écran restent", async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  await page.goto("/realisations/suivi-de-marches");
  await expect(page.getByRole("img", { name: /Écran des marchés de la démo/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ouvrir la démo en plein écran/ })).toHaveAttribute("href", "/demo/suivi-de-marches/index.html");
  await contexte.close();
});

test("les en-têtes n'autorisent l'inclusion que de la démo, par le site seulement", async ({ request }) => {
  const demo = await request.get("/demo/suivi-de-marches/index.html");
  expect(demo.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect(demo.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect(demo.headers()["content-security-policy"]).not.toContain("frame-ancestors 'none'");
  const courte = await request.get("/demo/suivi-de-marches");
  expect(courte.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  const etude = await request.get("/realisations/suivi-de-marches");
  expect(etude.headers()["x-frame-options"]).toBe("DENY");
});

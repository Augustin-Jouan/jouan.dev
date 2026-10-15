import { expect, test } from "@playwright/test";
import { surveillerErreurs } from "./outils";

test("depuis l'accueil, l'exemple du site vitrine descend à son étude sur /realisations", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Voir l'exemple : Site vitrine d'artisan" }).click();
  await expect(page).toHaveURL(/\/realisations#site-vitrine$/);
  await expect(page.getByRole("heading", { level: 2, name: /Un site d'artisan rapide/ })).toBeInViewport();
  expect(erreurs).toEqual([]);
});

test("« Voir mes réalisations » montre les deux études à la suite", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Voir mes réalisations" }).click();
  await expect(page).toHaveURL(/\/realisations$/);
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([/suivi des marchés de travaux/, /Un site d'artisan rapide/]);
  await expect(page.getByRole("img", { name: /sur ordinateur/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir le site (nouvel onglet)" })).toHaveAttribute("href", "https://sdj-elec.jouan.dev/");
  expect(erreurs).toEqual([]);
});

test("« Réalisations » dans l'en-tête et le lien de l'accueil ouvrent /realisations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Réalisations" }).click();
  await expect(page).toHaveURL(/\/realisations$/);
  await page.goto("/");
  await page.getByRole("link", { name: "Toutes les réalisations" }).click();
  await expect(page).toHaveURL(/\/realisations$/);
});

// Budget Lighthouse de l'accueil : le JS de /realisations (démo comprise) ne se
// charge qu'à l'intention (survol, focus, toucher), pas parce que le lien est visible.
test("l'accueil ne précharge pas /realisations", async ({ page }) => {
  const prechargements: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/realisations") prechargements.push(r.url());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Toutes les réalisations" }).scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  expect(prechargements).toEqual([]);
});

test("les anciennes pages d'étude redirigent vers leur ancre", async ({ page, request }) => {
  const reponse = await request.get("/realisations/site-artisan", { maxRedirects: 0 });
  expect(reponse.status()).toBe(308);
  expect(reponse.headers()["location"]).toBe("/realisations#site-vitrine");
  await page.goto("/realisations/suivi-de-marches");
  await expect(page).toHaveURL(/\/realisations#suivi-de-marches$/);
});

test("pas de débordement horizontal", async ({ page }) => {
  await page.goto("/realisations");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
});

test("sans JavaScript, l'aperçu et le lien plein écran restent", async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  await page.goto("/realisations");
  await expect(page.getByRole("img", { name: /Écran des marchés de la démo/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ouvrir la démo en plein écran/ })).toHaveAttribute("href", "/demo/suivi-de-marches/index.html?theme=sombre");
  await contexte.close();
});

test("les en-têtes n'autorisent l'inclusion que de la démo, par le site seulement", async ({ request }) => {
  const demo = await request.get("/demo/suivi-de-marches/index.html");
  expect(demo.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect(demo.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect(demo.headers()["content-security-policy"]).not.toContain("frame-ancestors 'none'");
  const courte = await request.get("/demo/suivi-de-marches");
  expect(courte.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  const etude = await request.get("/realisations");
  expect(etude.headers()["x-frame-options"]).toBe("DENY");
});

import { expect, test, type Page } from "@playwright/test";
import { surveillerErreurs } from "./outils";

const titreMetier = (page: Page) => page.getByRole("heading", { level: 2, name: /suivi des marchés de travaux/ });
const titreVitrine = (page: Page) => page.getByRole("heading", { level: 2, name: /Un site d'artisan rapide/ });

test("depuis l'accueil, l'exemple du site vitrine ouvre l'onglet Site vitrine, à son étude", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Voir l'exemple : Site vitrine d'artisan" }).click();
  await expect(page).toHaveURL(/\/realisations#site-vitrine$/);
  await expect(page.getByRole("tab", { name: "Site vitrine" })).toHaveAttribute("aria-selected", "true");
  await expect(titreVitrine(page)).toBeInViewport();
  await expect(titreMetier(page)).toBeHidden();
  expect(erreurs).toEqual([]);
});

test("« Voir mes réalisations » ouvre l'onglet Application métier ; « Site vitrine » montre l'autre étude", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Voir mes réalisations" }).click();
  await expect(page).toHaveURL(/\/realisations$/);
  await expect(page.getByRole("tab", { name: "Application métier" })).toHaveAttribute("aria-selected", "true");
  await expect(titreMetier(page)).toBeVisible();
  await expect(titreVitrine(page)).toBeHidden();
  await page.getByRole("tab", { name: "Site vitrine" }).click();
  await expect(page).toHaveURL(/\/realisations#site-vitrine$/);
  await expect(titreVitrine(page)).toBeVisible();
  await expect(titreMetier(page)).toBeHidden();
  await expect(page.getByRole("img", { name: /sur ordinateur/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir le site (nouvel onglet)" })).toHaveAttribute("href", "https://sdj-elec.jouan.dev/");
  expect(erreurs).toEqual([]);
});

test("arrivée directe sur #site-vitrine : l'autre étude n'est jamais affichée, même avant l'hydratation", async ({ page }) => {
  // Le script lu avant l'affichage choisit l'onglet : on bloque le JS de Next (pas la feuille de style) pour le vérifier seul.
  await page.route(/\/_next\/static\/chunks\/.*\.js$/, (route) => route.abort());
  await page.goto("/realisations#site-vitrine");
  await expect(page.getByRole("tablist", { name: "Type de projet" })).toBeVisible();
  await expect(titreMetier(page)).toBeHidden();
  await expect(titreVitrine(page)).toBeInViewport();
});

test("l'adresse d'un onglet se partage : #application-metier rouvre l'application métier", async ({ page }) => {
  await page.goto("/realisations#application-metier");
  await expect(page.getByRole("tab", { name: "Application métier" })).toHaveAttribute("aria-selected", "true");
  await expect(titreMetier(page)).toBeVisible();
  await expect(titreVitrine(page)).toBeHidden();
});

test("depuis /realisations, la palette mène à l'étude de l'autre onglet", async ({ page, isMobile }) => {
  test.skip(isMobile, "Raccourci clavier : ordinateur seulement.");
  await page.goto("/realisations");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox").fill("Site vitrine d'artisan");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/realisations#site-vitrine$/);
  await expect(page.getByRole("tab", { name: "Site vitrine" })).toHaveAttribute("aria-selected", "true");
  await expect(titreVitrine(page)).toBeInViewport();
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

test("sans JavaScript, pas d'onglets : les deux études se suivent ; l'aperçu et le lien plein écran restent", async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  await page.goto("/realisations");
  await expect(page.getByRole("tablist")).toBeHidden();
  await expect(titreMetier(page)).toBeVisible();
  await expect(titreVitrine(page)).toBeVisible();
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

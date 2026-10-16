import { expect, test, type Locator, type Page } from "@playwright/test";
import { surveillerErreurs } from "./outils";

const titreMetier = (page: Page) => page.getByRole("heading", { level: 2, name: /suivi des marchés de travaux/ });
const titreVitrine = (page: Page) => page.getByRole("heading", { level: 2, name: /Un site d'artisan rapide/ });

test("depuis l'accueil, l'exemple du site vitrine ouvre l'onglet Site vitrine, à son étude", async ({ page, isMobile }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/");
  // Sur téléphone, les offres sont sous deux onglets : celle du site vitrine est dans le second.
  if (isMobile) await page.locator("#offre label", { hasText: "Site vitrine" }).click();
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
  await expect(page.getByRole("tabpanel", { name: "Site vitrine" }).getByRole("figure")).toBeVisible();
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

for (const onglet of ["Application métier", "Site vitrine"]) {
  test(`${onglet} : la démo d'abord, juste sous le titre de l'étude, puis les explications`, async ({ page, isMobile }) => {
    await page.goto("/realisations");
    await page.getByRole("tab", { name: onglet }).click();
    const panneau = page.getByRole("tabpanel", { name: onglet });
    await expect(panneau.getByRole("figure")).toBeVisible();
    const haut = (element: Locator) => element.evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const titre = await haut(panneau.getByRole("heading", { level: 2 }));
    const demo = await haut(panneau.getByRole("figure"));
    const besoin = await haut(panneau.getByRole("heading", { level: 3, name: "Le besoin" }));
    expect(titre).toBeLessThan(demo);
    expect(demo).toBeLessThan(besoin);
    await expect(panneau.locator("dl")).toHaveCount(0);
    // Sans défiler, on voit au moins 150 px de la fenêtre sur ordinateur ; sur téléphone, son aperçu est à un écran au plus.
    const ecran = page.viewportSize()!.height;
    if (isMobile) expect(demo).toBeLessThan(ecran * 2);
    else expect(demo).toBeLessThan(ecran - 150);
  });
}

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
  await expect(
    page.getByRole("tabpanel", { name: "Application métier" }).getByRole("link", { name: /Ouvrir la démo en plein écran/ }),
  ).toHaveAttribute("href", "/demo/suivi-de-marches/index.html?theme=sombre");
  await expect(page.getByRole("tabpanel", { name: "Site vitrine" }).getByRole("link", { name: /Ouvrir la démo en plein écran/ })).toHaveAttribute(
    "href",
    "/demo/site-artisan",
  );
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

test.describe("copie du site de l'artisan", () => {
  const COPIE = "/demo/site-artisan";
  const PAGES = [
    "",
    "/services",
    "/services/electricite",
    "/services/plomberie",
    "/services/chauffage",
    "/services/domotique",
    "/realisations",
    "/a-propos",
    "/contact",
    "/mentions-legales",
    "/politique-de-confidentialite",
  ];

  test("dans la fenêtre de l'étude : on parcourt le site jusqu'au formulaire, qui n'envoie rien, sans requête externe", async ({
    page,
    isMobile,
    baseURL,
  }) => {
    test.skip(isMobile, "Sous 768 px, la fenêtre garde l'aperçu.");
    const erreurs = surveillerErreurs(page);
    const externes: string[] = [];
    const echecs: string[] = [];
    page.on("request", (r) => {
      const url = new URL(r.url());
      if (url.protocol.startsWith("http") && url.origin !== new URL(baseURL!).origin) externes.push(r.url());
    });
    page.on("response", (r) => {
      if (r.status() >= 400) echecs.push(`${r.status()} ${r.url()}`);
    });
    await page.goto("/realisations#site-vitrine");
    // La fenêtre est en haut de l'étude : la démo s'y charge dès l'arrivée, à la place de l'aperçu.
    await page.getByRole("tabpanel", { name: "Site vitrine" }).getByRole("figure").scrollIntoViewIfNeeded();
    const iframe = page.getByTitle("Démo interactive : site vitrine de l'artisan");
    await expect(iframe).toHaveAttribute("src", COPIE);
    const site = page.frameLocator('iframe[title="Démo interactive : site vitrine de l\'artisan"]');
    await expect(site.getByRole("heading", { level: 1 })).toContainText("électricien-plombier");
    // Dans la fenêtre, pas de bandeau : la barre de titre suffit.
    await expect(site.getByRole("complementary", { name: "Copie de démonstration" })).toBeHidden();

    const nav = site.getByRole("navigation", { name: "Navigation principale" });
    await nav.getByRole("link", { name: "Services" }).click();
    await expect(site.getByRole("heading", { level: 1 })).toBeVisible();
    await expect.poll(() => page.frames().some((f) => f.url().endsWith(`${COPIE}/services`))).toBe(true);
    await site.locator(`a[href="${COPIE}/services/electricite"]`).first().click();
    await expect.poll(() => page.frames().some((f) => f.url().endsWith(`${COPIE}/services/electricite`))).toBe(true);
    await nav.getByRole("link", { name: "Contact" }).click();
    await expect.poll(() => page.frames().some((f) => f.url().endsWith(`${COPIE}/contact`))).toBe(true);

    await site.getByLabel("Nom").fill("Visiteur du portfolio");
    await site.getByLabel("Email").fill("visiteur@exemple.fr");
    await site.getByLabel("Message").fill("Un message d'essai dans la démo.");
    await site.locator('button[type="submit"]').click();
    await expect(site.getByText("Démo : ce message n'est pas envoyé. Pour joindre l'entreprise, passez par son vrai site.")).toBeVisible();

    expect(externes).toEqual([]);
    expect(echecs).toEqual([]);
    expect(erreurs).toEqual([]);
  });

  test("dans la fenêtre, téléphone et e-mail ne font rien : la page reste affichée", async ({ page, isMobile }) => {
    test.skip(isMobile, "Sous 768 px, la fenêtre garde l'aperçu.");
    const erreurs = surveillerErreurs(page);
    await page.goto("/realisations#site-vitrine");
    // La fenêtre est en haut de l'étude : la démo s'y charge dès l'arrivée, à la place de l'aperçu.
    await page.getByRole("tabpanel", { name: "Site vitrine" }).getByRole("figure").scrollIntoViewIfNeeded();
    const site = page.frameLocator('iframe[title="Démo interactive : site vitrine de l\'artisan"]');
    await expect(site.getByRole("heading", { level: 1 })).toContainText("électricien-plombier");
    await site.locator('a[href^="tel:"]:visible').first().click();
    await site.locator('a[href^="mailto:"]:visible').first().click();
    await expect(site.getByRole("heading", { level: 1 })).toContainText("électricien-plombier");
    expect(page.frames().some((f) => f.url().endsWith(COPIE))).toBe(true);
    expect(erreurs).toEqual([]);
  });

  test("ouverte directement : le bandeau dit que c'est une démo, avec le vrai site et le retour au portfolio", async ({ page }) => {
    await page.goto(COPIE);
    const bandeau = page.getByRole("complementary", { name: "Copie de démonstration" });
    await expect(bandeau).toBeVisible();
    await expect(bandeau).toContainText("Démo réalisée par Augustin Jouan");
    await expect(bandeau.getByRole("link", { name: /Le vrai site/ })).toHaveAttribute("href", "https://sdj-elec.jouan.dev/");
    await bandeau.getByRole("link", { name: "Retour au portfolio" }).click();
    await expect(page).toHaveURL(/\/realisations#site-vitrine$/);
  });

  test("ni indexée, ni incluse ailleurs que sur jouan.dev", async ({ request }) => {
    for (const chemin of [COPIE, `${COPIE}/services`, `${COPIE}/services/electricite`]) {
      const reponse = await request.get(chemin);
      expect(reponse.status(), chemin).toBe(200);
      expect(reponse.headers()["x-robots-tag"], chemin).toBe("noindex");
      expect(reponse.headers()["x-frame-options"], chemin).toBe("SAMEORIGIN");
    }
  });

  test("chaque lien et chaque ressource des pages de la copie existe, sous son préfixe", async ({ request }) => {
    const adresses = new Set<string>();
    for (const page of PAGES) {
      const html = await (await request.get(`${COPIE}${page}`)).text();
      for (const [, adresse] of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
        if (adresse === "/realisations#site-vitrine") continue;
        expect(adresse, `${page} → ${adresse}`).toMatch(new RegExp(`^${COPIE}(/|$)`));
        adresses.add(adresse.split("#")[0]!);
      }
    }
    for (const adresse of adresses) expect((await request.get(adresse)).status(), adresse).toBe(200);
  });

  test("sur téléphone, la fenêtre garde l'aperçu et ouvre la copie en plein écran", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Téléphone seulement.");
    await page.goto("/realisations#site-vitrine");
    await expect(page.getByAltText("Page d'accueil du site de la SARL Dufourd Jérôme sur ordinateur")).toBeVisible();
    await expect(page.getByTitle("Démo interactive : site vitrine de l'artisan")).toHaveCount(0);
    const pleinEcran = page.getByRole("tabpanel", { name: "Site vitrine" }).getByRole("link", { name: /Ouvrir la démo en plein écran/ });
    await expect(pleinEcran).toHaveAttribute("href", COPIE);
  });
});

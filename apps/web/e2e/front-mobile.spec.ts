import { expect, test, type Locator, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Intro déjà vue : l'accueil s'affiche tout de suite.
  await page.addInitScript(() => sessionStorage.setItem("jouan.dev:intro-vue", "1"));
});

/** Écart entre le centre d'un élément et le centre de l'écran, en px. */
async function decentrage(page: Page, element: Locator): Promise<number> {
  const boite = (await element.boundingBox())!;
  return Math.abs(boite.x + boite.width / 2 - page.viewportSize()!.width / 2);
}

test("offres : sur téléphone, un onglet à la fois ; sur ordinateur, les deux cartes sans onglets", async ({ page, isMobile }) => {
  await page.goto("/");
  const offre = page.locator("#offre");
  const application = offre.getByRole("heading", { level: 3, name: "Application métier sur mesure" });
  const vitrine = offre.getByRole("heading", { level: 3, name: "Site vitrine" });
  if (!isMobile) {
    await expect(offre.getByRole("radiogroup", { name: "Type d'offre" })).toBeHidden();
    await expect(application).toBeVisible();
    await expect(vitrine).toBeVisible();
    return;
  }
  await expect(offre.getByRole("radio", { name: "Application métier" })).toBeChecked();
  await expect(application).toBeVisible();
  await expect(vitrine).toBeHidden();
  await offre.locator("label", { hasText: "Site vitrine" }).click();
  await expect(vitrine).toBeVisible();
  await expect(application).toBeHidden();
  expect(new URL(page.url()).hash).toBe("");
});

test("contact : sur téléphone, l'e-mail est centré et le deux-points ne passe pas seul à la ligne", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Téléphone seulement.");
  await page.goto("/");
  const bloc = page.locator('[data-trait="signature"]');
  const email = bloc.getByRole("link", { name: "augustin@jouan.dev" });
  await email.scrollIntoViewIfNeeded();
  expect(await decentrage(page, email)).toBeLessThanOrEqual(2);
  expect(await bloc.locator("p").first().textContent()).toMatch(/directement :$/);
});

test("pied de page : sur téléphone, une colonne centrée, les indices en bas ; sur ordinateur, trois colonnes", async ({ page, isMobile }) => {
  await page.goto("/mentions-legales");
  const pied = page.getByRole("contentinfo");
  const titres = pied.getByRole("heading", { level: 2 });
  await titres.first().scrollIntoViewIfNeeded();
  const centres = await Promise.all(["Me joindre", "Site", "Légal"].map((t) => decentrage(page, pied.getByRole("heading", { name: t }))));
  const hauts = await Promise.all(["Me joindre", "Site", "Légal"].map(async (t) => (await pied.getByRole("heading", { name: t }).boundingBox())!.y));
  if (isMobile) {
    for (const c of centres) expect(c).toBeLessThanOrEqual(2);
    expect(hauts[0]!).toBeLessThan(hauts[1]!);
    expect(hauts[1]!).toBeLessThan(hauts[2]!);
    // Les indices sont sous Légal, centrés.
    const copyright = pied.getByText(/^© \d{4} Augustin Jouan$/);
    expect((await copyright.boundingBox())!.y).toBeGreaterThan(hauts[2]!);
    expect(await decentrage(page, copyright)).toBeLessThanOrEqual(2);
    expect(await decentrage(page, pied.getByText("curl -L jouan.dev"))).toBeLessThanOrEqual(2);
  } else {
    expect(hauts[0]).toBe(hauts[1]);
    expect(hauts[1]).toBe(hauts[2]);
  }
});

test("réalisations : sur téléphone, une note sous la démo invite à la tester sur ordinateur, et l'appel final est centré", async ({ page, isMobile }) => {
  await page.goto("/realisations");
  const note = page.getByRole("tabpanel", { name: "Application métier" }).getByText("Pour tester la démo, mieux vaut visiter le site sur un ordinateur.", { exact: false });
  if (!isMobile) {
    await expect(note).toBeHidden();
    return;
  }
  await expect(note).toBeVisible();
  const appel = page.getByText("Un projet similaire ?");
  await appel.scrollIntoViewIfNeeded();
  expect(await decentrage(page, appel)).toBeLessThanOrEqual(2);
  expect(await decentrage(page, page.getByRole("link", { name: "Parlons-en" }))).toBeLessThanOrEqual(2);
});

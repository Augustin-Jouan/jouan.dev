import { expect, test } from "@playwright/test";

test("petit téléphone (350 px) : avec « À propos », le menu du haut tient sur une ligne, aucun lien coupé en deux, sans déborder", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Largeur de téléphone seulement.");
  await page.setViewportSize({ width: 350, height: 800 });
  await page.goto("/a-propos");
  const menu = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(menu.getByRole("link", { name: "À propos" })).toBeVisible();
  const { hauts, lignes, deborde } = await menu.locator("ul").evaluate((ul) => ({
    hauts: [...ul.children].map((li) => (li as HTMLElement).offsetTop),
    // Un lien qui passe à la ligne (« À / propos ») a deux boîtes de texte.
    lignes: [...ul.querySelectorAll("a")].map((a) => a.getClientRects().length),
    deborde: ul.scrollWidth > ul.clientWidth || document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  expect(new Set(hauts).size).toBe(1);
  expect(lignes.every((n) => n === 1)).toBe(true);
  expect(deborde).toBe(false);
});

test("très petit téléphone (320 px) : le menu passe à la ligne entre deux liens, jamais au milieu d'un lien", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Largeur de téléphone seulement.");
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/a-propos");
  const menu = page.getByRole("navigation", { name: "Navigation principale" });
  const { lignes, deborde } = await menu.locator("ul").evaluate((ul) => ({
    lignes: [...ul.querySelectorAll("a")].map((a) => a.getClientRects().length),
    deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  expect(lignes.every((n) => n === 1)).toBe(true);
  expect(deborde).toBe(false);
});

test("la page montre les projets puis le parcours, sans débordement horizontal", async ({ page }) => {
  await page.goto("/a-propos");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Augustin Jouan");
  // Le pied de page commun a ses propres titres : seuls comptent ceux du contenu.
  const titres = await page.getByRole("main").getByRole("heading", { level: 2 }).allTextContents();
  expect(titres).toEqual(["Projets", "Parcours"]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test("une vidéo sous l'écran n'est téléchargée qu'à l'approche, puis joue", async ({ page }) => {
  const videos: string[] = [];
  page.on("request", (requete) => {
    if (/\/a-propos\/epitchat\.(webm|mp4)/.test(requete.url())) videos.push(requete.url());
  });
  await page.goto("/a-propos");
  await page.waitForLoadState("networkidle");
  expect(videos).toEqual([]);
  const video = page.getByLabel(/Démo d'EpitChat/);
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => videos.length).toBeGreaterThan(0);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
});

test.describe("mouvement réduit", () => {
  test.use({ reducedMotion: "reduce" });

  test("défilée jusqu'à elle, la vidéo reste en pause, avec des contrôles pour la lancer", async ({ page }) => {
    await page.goto("/a-propos");
    const video = page.getByLabel(/Démo d'EpitChat/);
    await video.scrollIntoViewIfNeeded();
    await expect(video).toHaveAttribute("controls", "");
    await page.waitForTimeout(800);
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  });
});

for (const [titre, ancre, onglet] of [
  ["Un site d'artisan", "site-vitrine", "Site vitrine"],
  ["Le suivi des marchés", "suivi-de-marches", "Application métier"],
] as const) {
  test(`« Voir l'étude » ouvre /realisations sur l'onglet ${onglet}, à son étude`, async ({ page }) => {
    await page.goto("/a-propos");
    await page.getByRole("link", { name: new RegExp(`Voir l'étude : ${titre}`) }).click();
    await expect(page).toHaveURL(new RegExp(`/realisations#${ancre}$`));
    await expect(page.getByRole("tab", { name: onglet })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(`article#${ancre}`)).toBeVisible();
  });
}

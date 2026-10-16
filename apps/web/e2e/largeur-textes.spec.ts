import { expect, test, type Locator } from "@playwright/test";

test.beforeEach(async ({ page, isMobile }) => {
  test.skip(isMobile, "Sur téléphone, ces textes ont déjà toute la largeur de l'écran.");
  // Intro déjà vue : l'accueil s'affiche tout de suite.
  await page.addInitScript(() => sessionStorage.setItem("jouan.dev:intro-vue", "1"));
});

/** Largeur d'un texte rapportée à la largeur utile de son bloc de page (`max-w-6xl`, marges déduites). */
function partDeLaLargeur(texte: Locator): Promise<number> {
  return texte.evaluate((el) => {
    const bloc = el.closest<HTMLElement>('[class*="max-w-6xl"]')!;
    const style = getComputedStyle(bloc);
    const utile = bloc.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return el.getBoundingClientRect().width / utile;
  });
}

test("sur ordinateur, les paragraphes d'introduction prennent toute la largeur, sans retour à la ligne prématuré", async ({ page }) => {
  await page.goto("/");
  expect(await partDeLaLargeur(page.getByText("Je conçois, développe et héberge vos outils", { exact: false }))).toBeGreaterThan(0.99);

  await page.goto("/coulisses");
  expect(await partDeLaLargeur(page.getByText("Comment ce site est construit, hébergé et mesuré", { exact: false }))).toBeGreaterThan(0.99);

  await page.goto("/realisations");
  const onglets: [string, string[]][] = [
    [
      "Application métier",
      [
        "Une application web pour une entreprise qui pilote des chantiers",
        "Chaque chantier se suivait dans plusieurs tableurs",
        "Chaque mois, les certificats de paiement",
      ],
    ],
    [
      "Site vitrine",
      [
        "La refonte complète du site d'un électricien-plombier",
        "L'artisan dépendait d'un ancien prestataire",
        "Il voulait un site moderne",
      ],
    ],
  ];
  for (const [onglet, debuts] of onglets) {
    await page.getByRole("tab", { name: onglet }).click();
    for (const debut of debuts) {
      const texte = page.getByText(debut, { exact: false });
      await expect(texte).toBeVisible();
      expect(await partDeLaLargeur(texte), debut).toBeGreaterThan(0.99);
    }
  }
});

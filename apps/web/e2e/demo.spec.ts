import { expect, test } from "@playwright/test";
import { surveillerErreurs } from "./outils";

const espaces = (t: string | null) => (t ?? "").replace(/[\u00a0\u202f]/g, " ");

test.describe("ordinateur", () => {
  test.skip(({ isMobile }) => isMobile, "La démo s'ouvre en plein écran sur mobile.");

  test("la démo n'est chargée qu'à l'approche de sa fenêtre", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    const requetes: string[] = [];
    page.on("request", (r) => r.url().includes("/demo/") && requetes.push(r.url()));
    await page.goto("/realisations/suivi-de-marches");
    await page.waitForLoadState("networkidle");
    expect(requetes).toEqual([]);
    await page.getByRole("img", { name: /Écran des marchés de la démo/ }).scrollIntoViewIfNeeded();
    await expect(page.frameLocator('iframe[title^="Démo interactive"]').getByRole("heading", { name: "Suivi de marchés" })).toBeVisible();
  });

  test("dans l'iframe : avenant puis certificat du cas de référence", async ({ page }) => {
    const erreurs = surveillerErreurs(page);
    await page.goto("/realisations/suivi-de-marches");
    await page.locator("figure").first().scrollIntoViewIfNeeded();
    const demo = page.frameLocator('iframe[title^="Démo interactive"]');
    await demo.getByRole("button", { name: "Carrelage — faïence" }).click();
    const panneau = demo.getByRole("dialog", { name: "Lot 07 — Carrelage — faïence" });
    await panneau.getByLabel("Libellé").fill("Plinthes");
    await panneau.getByLabel("Montant HT").fill("1 000");
    await panneau.getByRole("button", { name: "Ajouter" }).click();
    await expect(demo.getByRole("row", { name: /Total du chantier/ })).toContainText(/497\s480,00\s€/);
    await panneau.getByRole("button", { name: "Supprimer l'avenant n° 02" }).click();
    await panneau.getByRole("button", { name: "Certificat de paiement" }).click();
    const apercu = demo.getByRole("dialog", { name: "Certificat de paiement n° 03 — Lot 07" });
    await apercu.getByLabel("Cumul des travaux réalisés HT").fill("9 850,00");
    expect(espaces(await apercu.getByTestId("mandate").textContent())).toBe("3 021,00 €");
    expect(erreurs).toEqual([]);
  });
});

test("en plein écran : onglet Planning et détail d'un lot, sans débordement de page", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/demo/suivi-de-marches/index.html");
  await page.getByRole("tab", { name: "Planning" }).click();
  await page.getByTestId("barre-l7").click();
  await expect(page.getByRole("region", { name: "Détail du lot" })).toContainText("Carrelages Morel");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  expect(erreurs).toEqual([]);
});

test("sur mobile, la page propose d'ouvrir la démo au lieu d'une iframe", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Comportement propre aux petits écrans.");
  await page.goto("/realisations/suivi-de-marches");
  await page.locator("figure").first().scrollIntoViewIfNeeded();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ouvrir la démo en plein écran" })).toBeVisible();
});

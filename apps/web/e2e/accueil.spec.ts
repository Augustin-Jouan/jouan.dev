import { test, expect } from "@playwright/test";
import { accroche, sections } from "../data/accueil";
import { FIN_INTRO_MS, simulerGpu, surveillerErreurs } from "./outils";

test("affiche tous les blocs, sans erreur dans la console", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  // Toute l'intro, jusqu'au nuage, doit se dérouler sans erreur.
  await simulerGpu(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(accroche.titreAccent);
  for (const { titre } of Object.values(sections)) {
    await expect(page.getByRole("heading", { level: 2, name: titre })).toBeAttached();
  }
  await expect(page.locator(".fond-accueil")).toHaveAttribute("data-intro", "terminee", {
    timeout: FIN_INTRO_MS,
  });
  expect(erreurs).toEqual([]);
});

test("le bouton principal mène au formulaire", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: accroche.actionPrincipale.libelle }).click();
  await expect(page.getByLabel("Nom", { exact: true })).toBeInViewport();
});

// Review Focus 4 : petit écran sans défilement horizontal.
test("aucun défilement horizontal à 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  const deborde = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );
  expect(deborde).toBe(false);
});

// Review Focus 5 : les ancres de l'en-tête fonctionnent depuis une page légale.
test("les liens de l'en-tête ramènent aux sections depuis une page légale", async ({ page }) => {
  await page.goto("/mentions-legales");
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Offre" })
    .click();
  await expect(page).toHaveURL(/\/#offre$/);
  await expect(page.getByRole("heading", { level: 2, name: sections.offre.titre })).toBeInViewport();
});

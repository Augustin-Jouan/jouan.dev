import { expect, test } from "@playwright/test";
import { MOT_DE_PASSE_E2E } from "./admin-test";
import { surveillerErreurs } from "./outils";

test.skip(!process.env.DATABASE_URL, "Base de test requise (DATABASE_URL).");
test.describe.configure({ mode: "serial" });

test("l'administration exige une connexion", async ({ page }, info) => {
  // Le compteur de tentatives de connexion est global : un seul projet le sollicite.
  test.skip(info.project.name !== "ordinateur", "Ménage le compteur global de connexion.");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/connexion$/);
  await page.getByLabel("Mot de passe").fill("mauvais");
  await page.getByRole("button", { name: "Se connecter" }).click();
  // Le conteneur d'annonce de route de Next a aussi role="alert" : filtrer sur le texte.
  await expect(page.getByRole("alert").filter({ hasText: "Mot de passe incorrect." })).toBeVisible();
});

test("connexion, création, désactivation et suppression d'un lien", async ({ page }, info) => {
  const erreurs = surveillerErreurs(page);
  const nom = `Essai admin ${info.project.name} ${Date.now()}`;
  await page.goto("/admin/connexion");
  await page.getByLabel("Mot de passe").fill(MOT_DE_PASSE_E2E);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByLabel("Nom du prospect").fill(nom);
  await page.getByLabel("Site vitrine").check();
  await page.getByRole("button", { name: "Créer le lien" }).click();
  await expect(page.getByText(`Lien de ${nom} :`)).toBeVisible();

  const jeton = new URL((await page.locator("code").first().textContent())!).searchParams.get("pour")!;

  const carte = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: nom }) });
  await carte.getByRole("button", { name: "Désactiver" }).click();
  await expect(carte.getByText(/désactivé/)).toBeVisible();

  // Un lien désactivé affiche l'accueil normal.
  await page.goto(`/?pour=${jeton}&apercu=1`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/^Bonjour/)).toHaveCount(0);
  await page.goto("/admin");

  page.once("dialog", (d) => d.accept());
  await carte.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByRole("heading", { name: nom })).toHaveCount(0);

  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/admin\/connexion$/);
  expect(erreurs).toEqual([]);
});

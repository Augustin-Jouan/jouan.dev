import { expect, test, type Page } from "@playwright/test";
import { MOT_DE_PASSE_E2E } from "./admin-test";
import { attendreMail, mailsRecus } from "./boite";
import { surveillerErreurs } from "./outils";

test.skip(!process.env.DATABASE_URL, "Base de test requise (DATABASE_URL).");

async function creerLien(page: Page, nom: string, angle: "Application métier" | "Site vitrine") {
  await page.goto("/admin/connexion");
  await page.getByLabel("Mot de passe").fill(MOT_DE_PASSE_E2E);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.getByLabel("Nom du prospect").fill(nom);
  await page.getByLabel(angle).check();
  await page.getByRole("button", { name: "Créer le lien" }).click();
  const url = await page.locator("code").first().textContent();
  return new URL(url!).searchParams.get("pour")!;
}

test("un prospect voit sa page et Augustin reçoit un mail, une seule fois par demi-heure", async ({ page }, info) => {
  const nom = `Boulangerie ${info.project.name} ${Date.now()}`;
  const jeton = await creerLien(page, nom, "Site vitrine");

  // Même page : le cookie d'administration est limité à /admin, il n'est pas
  // envoyé à l'accueil. Un nouveau contexte perdrait l'agent utilisateur du
  // projet (Chromium sans interface = robot, signal ignoré).
  const prospect = page;
  const erreurs = surveillerErreurs(prospect);
  await prospect.goto(`/?pour=${jeton}`);
  await expect(prospect.getByText(`Bonjour ${nom},`)).toBeVisible();
  await expect(prospect.getByRole("heading", { level: 1 })).toContainText("Un site vitrine");
  const mail = await attendreMail((m) => m.sujet === `${nom} a ouvert son lien — 1re visite`);
  expect(mail.texte).toContain("/admin");

  await prospect.reload();
  await prospect.waitForTimeout(4000);
  expect((await mailsRecus()).filter((m) => m.sujet.startsWith(nom))).toHaveLength(1);
  expect(erreurs).toEqual([]);
});

test("l'aperçu ne compte rien", async ({ page }, info) => {
  const nom = `Apercu ${info.project.name} ${Date.now()}`;
  const jeton = await creerLien(page, nom, "Application métier");
  await page.goto(`/?pour=${jeton}&apercu=1`);
  await expect(page.getByText(`Bonjour ${nom},`)).toBeVisible();
  await page.waitForTimeout(4000);
  expect((await mailsRecus()).filter((m) => m.sujet.startsWith(nom))).toHaveLength(0);
});

test("un lien inconnu affiche l'accueil normal", async ({ page }) => {
  await page.goto("/?pour=inconnu-0000");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Des applications métier");
  await expect(page.getByText(/^Bonjour/)).toHaveCount(0);
});

test("un clic sur « Contact » dans l'en-tête garde la personnalisation", async ({ page }, info) => {
  const nom = `Navigation ${info.project.name} ${Date.now()}`;
  const jeton = await creerLien(page, nom, "Site vitrine");
  await page.goto(`/?pour=${jeton}&apercu=1`);
  await expect(page.getByText(`Bonjour ${nom},`)).toBeVisible();
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Contact" }).click();
  await expect(page).toHaveURL(new RegExp(`\\?pour=${jeton}.*#contact$`));
  await expect(page.getByText(`Bonjour ${nom},`)).toBeVisible();
  await expect(page.locator('input[type="hidden"][name="pour"]')).toHaveValue(jeton);
});

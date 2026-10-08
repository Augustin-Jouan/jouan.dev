import { test, expect, type Page } from "@playwright/test";
import { contact } from "../data/contact";
import { MOT_REFUS } from "./smtp-factice";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ordinateur", "Un envoi suffit : chacun compte dans la limite.");
  // Une adresse par test : la limite de 5 envois par heure et par IP ne doit
  // pas lier les tests entre eux.
  const octet = () => Math.floor(Math.random() * 250) + 1;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.0.${octet()}.${octet()}` });
});

async function envoyer(page: Page, message: string) {
  await page.goto("/#contact");
  await page.getByLabel("Nom", { exact: true }).fill("Client Test");
  await page.getByLabel("Email", { exact: true }).fill("client@exemple.fr");
  await page.getByLabel("Message", { exact: true }).fill(message);
  await page.getByRole("button", { name: "Envoyer" }).click();
}

// Le message de retour est visé par son id : Next insère aussi un élément
// role="alert" (l'annonceur de navigation), qui rendrait getByRole ambigu.
const retour = (page: Page) => page.locator("#contact-retour");

test("un message valide est envoyé", async ({ page }) => {
  await envoyer(page, "Bonjour, je voudrais un devis.");
  await expect(retour(page)).toHaveAttribute("role", "status");
  await expect(retour(page)).toContainText("Merci");
});

test("un refus du serveur d'envoi affiche une erreur avec l'e-mail direct", async ({ page }) => {
  await envoyer(page, `Test ${MOT_REFUS}`);
  await expect(retour(page)).toHaveAttribute("role", "alert");
  await expect(retour(page)).toContainText(contact.email);
  // React vide le formulaire avant chaque action : la saisie doit revenir.
  // Visé par son rôle : le texte rétabli du message entre dans le texte de
  // son <label>, que getByLabel compare.
  await expect(page.getByRole("textbox", { name: "Nom", exact: true })).toHaveValue("Client Test");
  await expect(page.getByRole("textbox", { name: "Email", exact: true })).toHaveValue("client@exemple.fr");
  await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveValue(new RegExp(MOT_REFUS));
});

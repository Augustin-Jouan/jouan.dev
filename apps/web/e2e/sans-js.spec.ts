import { test, expect } from "@playwright/test";
import { accroche, sections } from "../data/accueil";
import { MOT_REFUS } from "./smtp-factice";

test.use({ javaScriptEnabled: false });

test("la page est complète et lisible sans JavaScript", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(accroche.titreAccent);
  for (const { titre } of Object.values(sections)) {
    await expect(page.getByRole("heading", { level: 2, name: titre })).toBeVisible();
  }
  await expect(page.locator(".halo-css")).toBeVisible();
  await expect(page.locator(".fond-accueil canvas")).toHaveCount(0);
});

test("le formulaire s'envoie sans JavaScript (action serveur)", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ordinateur", "Un envoi suffit : chacun compte dans la limite.");
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.1.${Date.now() % 250}.${testInfo.retry + 1}` });
  await page.goto("/#contact");
  await page.getByLabel("Nom", { exact: true }).fill("Client Sans JS");
  await page.getByLabel("Email", { exact: true }).fill("client@exemple.fr");
  await page.getByLabel("Message", { exact: true }).fill("Bonjour, sans JavaScript.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  // Le message de retour est visé par son id : Next insère aussi un élément
  // role="alert" (l'annonceur de navigation), qui rendrait getByRole ambigu.
  await expect(page.locator("#contact-retour")).toContainText("Merci");
});

test("sans JavaScript, un refus du serveur d'envoi garde la saisie", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ordinateur", "Un envoi suffit : chacun compte dans la limite.");
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.2.${Date.now() % 250}.${testInfo.retry + 1}` });
  await page.goto("/#contact");
  await page.getByLabel("Nom", { exact: true }).fill("Client Sans JS");
  await page.getByLabel("Email", { exact: true }).fill("client@exemple.fr");
  await page.getByLabel("Message", { exact: true }).fill(`Bonjour, sans JavaScript. ${MOT_REFUS}`);
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.locator("#contact-retour")).toHaveAttribute("role", "alert");
  // La page renvoyée par le serveur est rendue à partir de l'état de l'action.
  await expect(page.getByRole("textbox", { name: "Nom", exact: true })).toHaveValue("Client Sans JS");
  await expect(page.getByRole("textbox", { name: "Email", exact: true })).toHaveValue("client@exemple.fr");
  await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveValue(new RegExp(MOT_REFUS));
});

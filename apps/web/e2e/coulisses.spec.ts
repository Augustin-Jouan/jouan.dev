import { expect, test } from "@playwright/test";
import { surveillerErreurs } from "./outils";

const MESURE = /\d\sms/;

test("le pied de page mène aux coulisses", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Coulisses" }).click();
  await expect(page).toHaveURL(/\/coulisses$/);
  await expect(page.getByRole("heading", { level: 1, name: "Coulisses" })).toBeVisible();
});

test("l'en-tête mène aux coulisses", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Coulisses" }).click();
  await expect(page).toHaveURL(/\/coulisses$/);
  await expect(page.getByRole("heading", { level: 1, name: "Coulisses" })).toBeVisible();
});

test("les mesures arrivent en direct", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/coulisses");
  await expect(page.getByTestId("mesure-site")).toContainText(MESURE, { timeout: 15_000 });
  if (process.env.DATABASE_URL) {
    await expect(page.getByTestId("mesure-base")).toContainText(MESURE, { timeout: 15_000 });
  }
  if (process.env.NEXT_PUBLIC_DIRECT_URL) {
    await expect(page.getByTestId("mesure-tempsReel")).toContainText(MESURE, { timeout: 15_000 });
  } else {
    await expect(page.getByTestId("mesure-tempsReel")).toContainText("indisponible");
  }
  expect(erreurs).toEqual([]);
});

test("le schéma se parcourt au clavier", async ({ page }) => {
  await page.goto("/coulisses");
  // La variante masquée (display: none) est hors de l'arbre d'accessibilité.
  const schema = page.getByRole("group", { name: "Schéma de l'architecture" });
  await expect(schema).toHaveCount(1);
  const proxy = schema.getByRole("button", { name: /^Proxy/ });
  await proxy.focus();
  await page.keyboard.press("Enter");
  await expect(proxy).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 3, name: "Proxy" })).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press(" ");
  await expect(page.getByRole("heading", { level: 3, name: "Proxy" })).toHaveCount(0);
});

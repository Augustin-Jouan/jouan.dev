import { devices, expect, test } from "@playwright/test";
import { surveillerErreurs } from "./outils";

test.skip(!process.env.NEXT_PUBLIC_DIRECT_URL, "Service temps réel requis (NEXT_PUBLIC_DIRECT_URL au build).");
test.describe.configure({ mode: "serial" });

test("deux visiteurs se voient : compteur et curseur", async ({ browser }) => {
  const a = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const b = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const pageA = await a.newPage();
  const pageB = await b.newPage();
  const erreurs = [...[pageA, pageB].map(surveillerErreurs)];
  await pageA.goto("/");
  await pageB.goto("/");

  await expect(pageA.getByText("2 personnes regardent cette page")).toBeVisible({ timeout: 10_000 });
  await expect(pageB.getByText("2 personnes regardent cette page")).toBeVisible({ timeout: 10_000 });

  const titre = await pageA.getByRole("heading", { level: 1 }).boundingBox();
  for (let i = 0; i < 5; i++) await pageA.mouse.move(titre!.x + 40 + i * 20, titre!.y + 20);
  await expect(pageB.locator("[data-curseur]")).toHaveCount(1);

  await pageA.getByRole("button", { name: "Masquer mon curseur" }).click();
  await expect(pageB.locator("[data-curseur]")).toHaveCount(0);

  await a.close();
  await expect(pageB.getByText(/regardent cette page/)).toHaveCount(0);
  await b.close();
  expect(erreurs.flat()).toEqual([]);
});

test("sur mobile : compteur seul, ni bouton ni curseur envoyé", async ({ browser }) => {
  const ordinateur = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const mobile = await browser.newContext({ ...devices["Pixel 7"] });
  const pageO = await ordinateur.newPage();
  const pageM = await mobile.newPage();
  await pageO.goto("/");
  await pageM.goto("/");
  await expect(pageM.getByText("2 personnes regardent cette page")).toBeVisible({ timeout: 10_000 });
  await expect(pageM.getByRole("button", { name: /mon curseur/ })).toHaveCount(0);
  await pageM.mouse.move(100, 300);
  await pageM.mouse.move(150, 320);
  await pageO.waitForTimeout(500);
  await expect(pageO.locator("[data-curseur]")).toHaveCount(0);
  await ordinateur.close();
  await mobile.close();
});

test("la page personnalisée rejoint la même salle", async ({ browser }) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const pageA = await a.newPage();
  const pageB = await b.newPage();
  await pageA.goto("/");
  await pageB.goto("/?pour=inconnu-0000");
  await expect(pageA.getByText("2 personnes regardent cette page")).toBeVisible({ timeout: 10_000 });
  await a.close();
  await b.close();
});

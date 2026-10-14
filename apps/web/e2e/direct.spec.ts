import { devices, expect, test, type Page } from "@playwright/test";
import { surveillerErreurs } from "./outils";

test.skip(!process.env.NEXT_PUBLIC_DIRECT_URL, "Service temps réel requis (NEXT_PUBLIC_DIRECT_URL au build).");
test.describe.configure({ mode: "serial" });

/** Messages envoyés par la page au service : il ne doit y en avoir aucun. */
function surveillerEnvois(page: Page): string[] {
  const envoyes: string[] = [];
  page.on("websocket", (ws) => ws.on("framesent", (trame) => envoyes.push(String(trame.payload))));
  return envoyes;
}

test("deux visiteurs : chacun voit le compteur, aucun curseur, rien d'envoyé", async ({ browser }) => {
  const a = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const b = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const pageA = await a.newPage();
  const pageB = await b.newPage();
  const erreurs = [...[pageA, pageB].map(surveillerErreurs)];
  const envoyes = surveillerEnvois(pageA);
  await pageA.goto("/");
  await pageB.goto("/");

  await expect(pageA.getByText("2 personnes regardent cette page")).toBeVisible({ timeout: 10_000 });
  await expect(pageB.getByText("2 personnes regardent cette page")).toBeVisible({ timeout: 10_000 });

  const titre = await pageA.getByRole("heading", { level: 1 }).boundingBox();
  for (let i = 0; i < 5; i++) await pageA.mouse.move(titre!.x + 40 + i * 20, titre!.y + 20);
  await pageB.waitForTimeout(500);
  await expect(pageB.locator("[data-curseur]")).toHaveCount(0);
  await expect(pageA.getByRole("button", { name: /curseur/ })).toHaveCount(0);
  expect(envoyes).toEqual([]);

  await a.close();
  await expect(pageB.getByText(/regardent cette page/)).toHaveCount(0);
  await b.close();
  expect(erreurs.flat()).toEqual([]);
});

test("seul, on copie le lien de l'accueil ; la personne invitée arrive et le compteur passe à 2", async ({ browser, baseURL }) => {
  const a = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ["clipboard-read", "clipboard-write"] });
  const pageA = await a.newPage();
  const erreurs = surveillerErreurs(pageA);
  await pageA.goto("/?pour=inconnu-0000");
  await expect(pageA.getByText("Vous êtes seul ici.")).toBeVisible({ timeout: 10_000 });
  await pageA.getByRole("button", { name: "Inviter quelqu'un" }).click();
  await expect(pageA.getByText("Lien copié : envoyez-le, le compteur passera à 2.")).toBeVisible();
  const lien = await pageA.evaluate(() => navigator.clipboard.readText());
  expect(lien).toBe(`${new URL(baseURL!).origin}/`);

  const b = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageB = await b.newPage();
  await pageB.goto(lien);
  await expect(pageA.getByText("2 personnes regardent cette page")).toBeVisible({ timeout: 10_000 });
  await b.close();
  await expect(pageA.getByRole("button", { name: "Inviter quelqu'un" })).toBeVisible({ timeout: 10_000 });
  await a.close();
  expect(erreurs).toEqual([]);
});

test("sur téléphone : compteur et invitation affichés", async ({ browser }) => {
  const mobile = await browser.newContext({ ...devices["Pixel 7"] });
  const pageM = await mobile.newPage();
  await pageM.goto("/");
  await expect(pageM.getByText("Vous êtes seul ici.")).toBeVisible({ timeout: 10_000 });
  await expect(pageM.getByRole("button", { name: "Inviter quelqu'un" })).toBeVisible();

  const ordinateur = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageO = await ordinateur.newPage();
  await pageO.goto("/");
  await expect(pageM.getByText("2 personnes regardent cette page")).toBeVisible({ timeout: 10_000 });
  await ordinateur.close();
  await mobile.close();
});

test("la page personnalisée est comptée avec l'accueil", async ({ browser }) => {
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

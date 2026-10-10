import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { surveillerErreurs } from "./outils";

const ETUDE = "/realisations/suivi-de-marches";
const DEMO = "/demo/suivi-de-marches/index.html";
const CHANTIER = "LEFÈVRE — Rivebourg";

/** Requêtes vers une autre origine que le site (police externe oubliée, etc.). */
function surveillerExternes(page: Page, baseURL: string | undefined) {
  const site = new URL(baseURL!).origin;
  const externes: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.protocol.startsWith("http") && url.origin !== site) externes.push(r.url());
  });
  return externes;
}

/** « 482 310,00 € » → 482310. */
const enNombre = (texte: string | null) => Number(texte!.replace(/[^\d,-]/g, "").replace(",", "."));

/** La carte d'un chantier est un bouton dont le nom commence par sa référence. */
const carteChantier = (page: Page) => page.getByRole("button", { name: new RegExp(`^${CHANTIER}`) });

async function ouvrirChantier(page: Page) {
  await carteChantier(page).click();
  await expect(page.locator("#t-ht")).not.toHaveText("—");
}

/** Ajoute un avenant de 1 000 € HT au lot GROS ŒUVRE ; rend le total HT d'avant. */
async function ajouterAvenant(page: Page) {
  const avant = enNombre(await page.locator("#t-ht").textContent());
  // Un clic sur la ligne (ici la cellule de l'entreprise) ouvre le panneau du lot.
  await page.getByRole("row", { name: /^02 GROS ŒUVRE/ }).getByRole("cell").nth(2).click();
  const panneau = page.getByRole("complementary", { name: "Détail du lot" });
  await panneau.getByRole("button", { name: "Ajouter", exact: true }).click();
  const champ = panneau.getByLabel("Montant HT de l'avenant").last();
  await champ.fill("1000");
  await champ.press("Tab");
  await expect.poll(async () => enNombre(await page.locator("#t-ht").textContent())).toBe(avant + 1000);
  return avant;
}

test.describe("ordinateur", () => {
  test.skip(({ isMobile }) => isMobile, "La démo s'ouvre en plein écran sur mobile.");

  test("la démo n'est chargée qu'à l'approche de sa fenêtre", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    const requetes: string[] = [];
    page.on("request", (r) => r.url().includes("/demo/") && requetes.push(r.url()));
    await page.goto(ETUDE);
    await page.waitForLoadState("networkidle");
    // La fenêtre doit commencer hors de l'écran, marge d'approche (200 px) comprise.
    const apercu = page.getByRole("img", { name: /Écran des marchés de la démo/ });
    expect((await apercu.boundingBox())!.y).toBeGreaterThan(600 + 200);
    await expect(page.locator("iframe")).toHaveCount(0);
    expect(requetes).toEqual([]);
    await apercu.scrollIntoViewIfNeeded();
    await expect(page.frameLocator('iframe[title^="Démo interactive"]').getByRole("heading", { name: "Mes chantiers" })).toBeVisible();
  });

  test("dans l'iframe : thème sombre, connectée d'office, rien hors du site", async ({ page, baseURL }) => {
    const erreurs = surveillerErreurs(page);
    const externes = surveillerExternes(page, baseURL);
    await page.goto(ETUDE);
    await page.getByRole("img", { name: /Écran des marchés de la démo/ }).scrollIntoViewIfNeeded();
    await expect(page.frameLocator('iframe[title^="Démo interactive"]').getByRole("heading", { name: "Mes chantiers" })).toBeVisible();
    const cadre = page.frames().find((f) => f.url().includes("/demo/suivi-de-marches/"))!;
    expect(await cadre.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
    // Fond réellement sombre (luminance relative faible), pas seulement l'attribut.
    const luminance = await cadre.evaluate(() => {
      const [r, g, b] = getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    });
    expect(luminance).toBeLessThan(0.25);
    expect(externes).toEqual([]);
    expect(erreurs).toEqual([]);
  });
});

test("parcours de référence : avenant, total, certificat de paiement", async ({ page, isMobile }) => {
  test.skip(isMobile, "Parcours sur écran d'ordinateur.");
  const erreurs = surveillerErreurs(page);
  await page.goto(DEMO);
  await ouvrirChantier(page);
  await ajouterAvenant(page);
  await page.getByRole("complementary", { name: "Détail du lot" }).getByRole("button", { name: "Certificat de paiement" }).click();
  await expect(page.locator("#cp-sub")).toContainText("GROS ŒUVRE");
  expect(erreurs).toEqual([]);
});

test("les modifications durent le temps de l'onglet, pas plus", async ({ page, isMobile }) => {
  test.skip(isMobile, "Parcours sur écran d'ordinateur.");
  await page.goto(DEMO);
  await ouvrirChantier(page);
  const avant = await ajouterAvenant(page);
  await page.reload();
  await ouvrirChantier(page);
  expect(enNombre(await page.locator("#t-ht").textContent())).toBe(avant + 1000);
  const autre = await page.context().newPage();
  await autre.goto(DEMO);
  await ouvrirChantier(autre);
  expect(enNombre(await autre.locator("#t-ht").textContent())).toBe(avant);
});

test("stockage bloqué : la démo démarre sur le jeu de démonstration", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", { get() { throw new Error("stockage bloqué"); } });
  });
  const erreurs = surveillerErreurs(page);
  await page.goto(DEMO);
  await expect(page.getByRole("heading", { name: "Mes chantiers" })).toBeVisible();
  await expect(carteChantier(page)).toBeVisible();
  expect(erreurs).toEqual([]);
});

test("« Télécharger le tableur » télécharge le récapitulatif en CSV", async ({ page, isMobile }) => {
  test.skip(isMobile, "Parcours sur écran d'ordinateur.");
  await page.goto(DEMO);
  await ouvrirChantier(page);
  await page.getByRole("button", { name: "Exporter le récap" }).click();
  const [fichier] = await Promise.all([page.waitForEvent("download"), page.locator("#r-dl").click()]);
  expect(fichier.suggestedFilename()).toMatch(/\.csv$/);
  // Une seule marque d'ordre des octets (BOM) en tête, pour que les tableurs lisent les accents.
  const contenu = readFileSync((await fichier.path())!, "utf8");
  const bom = String.fromCharCode(0xfeff);
  expect(contenu.startsWith(bom) && !contenu.startsWith(bom + bom)).toBe(true);
  expect(contenu).toContain("RÉCAPITULATIF DES MARCHÉS");
});

test("sur mobile, la page propose d'ouvrir la démo au lieu d'une iframe", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Comportement propre aux petits écrans.");
  await page.goto(ETUDE);
  await page.locator("figure").first().scrollIntoViewIfNeeded();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Ouvrir la démo en plein écran/ })).toBeVisible();
});

test("en plein écran, sur tout écran : la démo s'ouvre sans erreur", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto(DEMO);
  await expect(page.getByRole("heading", { name: "Mes chantiers" })).toBeVisible();
  expect(erreurs).toEqual([]);
});

test("l'adresse courte de la démo (avec ou sans barre finale) sert la démo et ses polices", async ({ page }) => {
  for (const chemin of ["/demo/suivi-de-marches", "/demo/suivi-de-marches/"]) {
    const echecs: string[] = [];
    // Au second passage, les polices peuvent revenir du cache (304) : seul un statut d'erreur compte.
    page.on("response", (r) => r.url().includes("/polices/") && r.status() >= 400 && echecs.push(`${r.status()} ${r.url()}`));
    const reponse = await page.goto(chemin);
    expect(reponse!.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Mes chantiers" })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check("600 16px Outfit"))).toBe(true);
    expect(echecs).toEqual([]);
  }
});

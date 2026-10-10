import { readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { surveillerErreurs } from "./outils";

// Même marqueur que components/commandes/PaletteCommandes.tsx et scripts/verifier-taille-commandes.mjs.
const MARQUEUR = "palette-commandes:v1";
const palette = (page: Page) => page.getByRole("dialog", { name: "Commandes" });

test.describe("ordinateur", () => {
  test.skip(({ isMobile }) => isMobile, "Raccourci clavier : ordinateur seulement.");

  test("Ctrl+K charge la palette à part ; « contact » puis Entrée mène au contact", async ({ page }) => {
    const erreurs = surveillerErreurs(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const charges: string[] = [];
    page.on("response", (r) => {
      if (r.request().resourceType() === "script") charges.push(decodeURIComponent(new URL(r.url()).pathname));
    });
    await page.keyboard.press("Control+k");
    await expect(palette(page)).toBeVisible();
    // Chaque morceau chargé à l'ouverture est celui que compte verifier-taille-commandes.
    expect(charges.length).toBeGreaterThan(0);
    for (const chemin of charges) {
      const fichier = join(process.cwd(), ".next", chemin.replace(/^\/_next\//, ""));
      expect(readFileSync(fichier, "utf8"), `${chemin} n'est pas le morceau de la palette`).toContain(MARQUEUR);
    }
    await page.getByRole("combobox").fill("contact");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/contact$/);
    await expect(palette(page)).toBeHidden();
    expect(erreurs).toEqual([]);
  });

  test("Échap ferme la palette et rend le focus", async ({ page }) => {
    await page.goto("/contact");
    const lien = page.getByRole("link", { name: "Coulisses" });
    await lien.focus();
    await page.keyboard.press("Control+k");
    await expect(palette(page)).toBeVisible();
    await expect(page.getByRole("combobox")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(palette(page)).toBeHidden();
    await expect(lien).toBeFocused();
  });

  test("« Copier l'e-mail » copie l'adresse et l'annonce", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox").fill("copier e-mail");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "E-mail copié" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("contact@jouan.dev");
  });

  test("« Voir l'architecture en 3D » ouvre les coulisses en 3D", async ({ page }) => {
    await page.goto("/");
    const webgl = await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2")));
    test.skip(!webgl, "WebGL indisponible dans ce navigateur de test.");
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox").fill("3d");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/coulisses\?vue=3d$/);
    await expect(page.getByTestId("scene-3d").locator("canvas")).toBeVisible();
  });

  test("palette ouverte : aucune violation WCAG A/AA", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.keyboard.press("Control+k");
    await expect(palette(page)).toBeVisible();
    const resultat = await new AxeBuilder({ page })
      .include("dialog")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(resultat.violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});

test("mobile : le bouton du pied de page ouvre la palette", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Comportement propre aux petits écrans.");
  await page.goto("/");
  await page.getByRole("button", { name: /pour naviguer/ }).click();
  await expect(palette(page)).toBeVisible();
});

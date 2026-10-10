import { test, expect } from "@playwright/test";
import { FIN_INTRO_MS, simulerGpu, surveillerErreurs } from "./outils";

test.describe("mouvement réduit", () => {
  test.use({ reducedMotion: "reduce" });

  test("nuage figé, sans canvas", async ({ page }) => {
    await page.goto("/");
    const fond = page.locator(".fond-accueil");
    await expect(fond).toHaveAttribute("data-mode", "nuage-fige");
    await expect(fond.locator("canvas")).toHaveCount(0);
    await expect(fond.locator(".nuage-fige")).toBeVisible();
  });

  test("nuage figé aux couleurs de la charte", async ({ page }) => {
    await page.goto("/");
    const couleurs = await page.locator(".nuage-fige path").evaluateAll((chemins) => chemins.map((c) => c.getAttribute("stroke")));
    expect(new Set(couleurs)).toEqual(new Set(["#eab595", "#d87f81", "#ae6378", "#b9a3b0"]));
  });
});

test("WebGL2 absent : nuage figé", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).WebGL2RenderingContext;
  });
  await page.goto("/");
  await expect(page.locator(".fond-accueil")).toHaveAttribute("data-mode", "nuage-fige");
  expect(erreurs).toEqual([]);
});

test("rendu WebGL logiciel (sans carte graphique) : nuage figé, sans erreur", async ({ page }) => {
  // Les navigateurs de test n'ont pas de GPU : WebGL y passe par SwiftShader.
  const erreurs = surveillerErreurs(page);
  await page.goto("/");
  const fond = page.locator(".fond-accueil");
  await expect(fond).toHaveAttribute("data-encre", "repli");
  await expect(fond).toHaveAttribute("data-mode", "nuage-fige");
  await expect(fond.locator("canvas")).toHaveCount(0);
  await expect(fond.locator(".nuage-fige")).toBeVisible();
  expect(erreurs).toEqual([]);
});

test("contexte WebGL2 refusé : repli sans erreur", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...reste: unknown[]
    ) {
      if (type === "webgl2") return null;
      return (original as (...args: unknown[]) => unknown).call(this, type, ...reste);
    } as unknown as typeof original;
  });
  await page.goto("/");
  const fond = page.locator(".fond-accueil");
  await expect(fond).toHaveAttribute("data-encre", "repli");
  await expect(fond).toHaveAttribute("data-mode", "nuage-fige");
  await expect(fond.locator(".nuage-fige")).toBeVisible();
  expect(erreurs).toEqual([]);
});

test("shader qui ne compile pas : repli sans erreur", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await simulerGpu(page);
  await page.addInitScript(() => {
    WebGL2RenderingContext.prototype.getShaderParameter = () => false;
  });
  await page.goto("/");
  await expect(page.locator(".fond-accueil")).toHaveAttribute("data-encre", "repli");
  expect(erreurs).toEqual([]);
});

test("stockage inaccessible : l'intro se joue sans erreur", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await simulerGpu(page);
  await page.addInitScript(() => {
    // Navigation privée stricte : les deux stockages refusés (intro : session ; curseur : local).
    for (const nom of ["localStorage", "sessionStorage"]) {
      Object.defineProperty(window, nom, {
        configurable: true,
        get() {
          throw new DOMException("refusé", "SecurityError");
        },
      });
    }
  });
  await page.goto("/");
  await expect(page.locator(".fond-accueil")).toHaveAttribute("data-intro", "terminee", {
    timeout: FIN_INTRO_MS,
  });
  expect(erreurs).toEqual([]);
});

import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Intro déjà vue : l'accueil s'affiche tout de suite.
    sessionStorage.setItem("jouan.dev:intro-vue", "1");
    // Ordre exact des allumages (plusieurs peuvent tomber dans le même pas de défilement).
    const journal: string[] = [];
    Object.assign(window, { journalAllumages: journal });
    new MutationObserver((mutations) => {
      for (const { target } of mutations) {
        if (!(target instanceof Element) || !target.hasAttribute("data-allumee")) continue;
        const nom = target.classList.contains("methode-etape")
          ? `etape${[...document.querySelectorAll(".methode-etape")].indexOf(target)}`
          : target.getAttribute("data-trait") === "logo"
            ? `logo${[...document.querySelectorAll('[data-trait="logo"]')].indexOf(target)}`
            : target.getAttribute("data-trait");
        if (nom && !journal.includes(nom)) journal.push(nom);
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-allumee"] });
  });
});

/** Le calque du trait, chargé au premier défilement : un pixel suffit. */
async function attendreTrait(page: Page) {
  await page.evaluate(() => {
    if (window.scrollY === 0) window.scrollTo({ top: 1, behavior: "instant" });
  });
  await expect(page.locator(".trait-calque")).toBeAttached({ timeout: 10_000 });
}

/** Défile d'un coup jusqu'à `top` (`scroll-behavior: smooth` retarderait les relevés). */
async function defiler(page: Page, top: number) {
  await page.evaluate((t) => window.scrollTo({ top: t, behavior: "instant" }), top);
}

/** Après le prochain rendu : longueur tracée, cibles allumées (étapes, logos, envoi), débordement en largeur. */
async function etat(page: Page) {
  return page.evaluate(async () => {
    await new Promise((fin) => requestAnimationFrame(() => requestAnimationFrame(fin)));
    const ligne = document.querySelector(".trait-ligne")!;
    const allumee = (el: Element) => el.hasAttribute("data-allumee");
    return {
      // Au pixel près : le navigateur arrondit `stroke-dashoffset`.
      longueur: Math.max(0, Math.round(Number(ligne.getAttribute("pathLength")) - Number((ligne as SVGElement).style.strokeDashoffset))),
      allumees: [
        ...[...document.querySelectorAll(".methode-etape")].map((e, i) => (allumee(e) ? `etape${i}` : "")),
        ...[...document.querySelectorAll('[data-trait="logo"]')].map((e, i) => (allumee(e) ? `logo${i}` : "")),
        allumee(document.querySelector('[data-trait="envoi"]')!) ? "envoi" : "",
      ].filter(Boolean),
      debordement: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bas: document.documentElement.scrollHeight - window.innerHeight,
    };
  });
}

/** Parcourt toute la page par pas de `pas` px ; renvoie l'ordre des allumages et les longueurs relevées. */
async function parcourir(page: Page, pas: number) {
  const longueurs: number[] = [];
  const { bas } = await etat(page);
  for (let top = 0; top <= bas + pas; top += pas) {
    await defiler(page, Math.min(top, bas));
    const e = await etat(page);
    expect(e.debordement, `débordement à ${top} px`).toBe(0);
    longueurs.push(e.longueur);
  }
  const ordre = await page.evaluate(() => (window as unknown as { journalAllumages: string[] }).journalAllumages);
  return { ordre, longueurs };
}

test("tant qu'on ne défile pas, le trait n'est pas chargé (budget des scripts de l'accueil)", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("load");
  // Au-delà du délai maximal du temps libre (3 s).
  await page.waitForTimeout(3_500);
  await expect(page.locator(".trait-calque")).toHaveCount(0);
});

test.describe("ordinateur", () => {
  test.skip(({ isMobile }) => isMobile, "Trait dans les marges : ordinateur seulement.");

  test("le trait s'allonge en défilant, allume la Méthode, les logos puis l'envoi, et recule en remontant", async ({ page }) => {
    await page.goto("/");
    await attendreTrait(page);
    await expect(page.locator(".trait-calque")).toHaveAttribute("data-variante", "marges");
    expect((await etat(page)).longueur).toBe(0);

    const { ordre, longueurs } = await parcourir(page, 150);
    // La Méthode d'abord, puis le ∞ (logo de droite, puis de gauche), enfin le bouton d'envoi.
    expect(ordre).toEqual(["etape0", "etape1", "etape2", "etape3", "etape4", "logo1", "logo0", "envoi"]);
    longueurs.slice(1).forEach((l, i) => expect(l).toBeGreaterThanOrEqual(longueurs[i]!));
    expect(longueurs.at(-1)).toBeGreaterThan(1_000);

    // En remontant, le trait recule ; ce qu'il a allumé le reste.
    await defiler(page, 0);
    const enHaut = await etat(page);
    expect(enHaut.longueur).toBe(0);
    expect(enHaut.allumees).toHaveLength(8);
    await expect(page.locator(".methode-frise")).toHaveAttribute("data-trait", "");
  });

  test("page de prospect : le trait mène aussi jusqu'au bouton d'envoi", async ({ page }) => {
    await page.goto("/?pour=exemple-0000");
    await attendreTrait(page);
    await defiler(page, (await etat(page)).bas);
    expect((await etat(page)).allumees).toContain("envoi");
  });

  test("arrivée directe sur #contact : le trait est déjà tracé, ce qu'il a dépassé est allumé", async ({ page }) => {
    await page.goto("/#contact");
    await attendreTrait(page);
    await expect.poll(async () => (await etat(page)).allumees, { timeout: 5_000 }).toEqual(
      expect.arrayContaining(["etape0", "etape4", "logo0", "logo1"]),
    );
    expect((await etat(page)).longueur).toBeGreaterThan(1_000);
  });
});

test("téléphone : un trait fin le long du bord, qui allume la Méthode et l'envoi, sans détour par les logos", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Variante « bord » : téléphone seulement.");
  await page.goto("/");
  await attendreTrait(page);
  await expect(page.locator(".trait-calque")).toHaveAttribute("data-variante", "bord");
  const { ordre } = await parcourir(page, 200);
  expect(ordre).toEqual(["etape0", "etape1", "etape2", "etape3", "etape4", "envoi"]);
});

test.describe("mouvement réduit", () => {
  test.use({ reducedMotion: "reduce" });

  test("pas de trait, même en défilant : la page est celle d'avant, Méthode affichée finie", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    await defiler(page, 400);
    // Au-delà du délai maximal du temps libre (3 s) : le trait se serait chargé.
    await page.waitForTimeout(3_500);
    await expect(page.locator(".trait-calque")).toHaveCount(0);
    await expect(page.locator(".methode-frise")).not.toHaveAttribute("data-trait");
    const opacites = await page.locator("#methode li h3").evaluateAll((h) => h.map((e) => getComputedStyle(e).opacity));
    expect(opacites).toEqual(["1", "1", "1", "1", "1"]);
  });
});

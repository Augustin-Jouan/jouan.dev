# Tâche 04 — L'apparence du trait et les tests de bout en bout

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **medium** (seule dans sa conversation).
> Commandes depuis la racine du dépôt. Termine par le compte rendu de `contexte.md`.

Spec : sections 4.2 (halos des logos, pulsation de l'envoi), 5 (rendu), 9 (tests) et 11 (révisions).

- Le CSS du calque, du trait (un tracé fin et un halo plus large, **sans filtre**), de la tête, de la Méthode en mode trait, des halos des logos et de la pulsation du bouton d'envoi.
- Les e2e du trait (`trait.spec.ts`).
- Dans `methode.spec.ts`, la cascade et l'étape par étape deviennent les tests du **repli** : on bloque le morceau du trait.

Prérequis : les tâches 01 à 03 sont commitées.

**Files:**
- Modify: `apps/web/lib/methode-css.test.ts` (ajout en fin de fichier), `apps/web/app/globals.css` (ajout en fin de fichier)
- Create: `apps/web/e2e/trait.spec.ts`
- Modify: `apps/web/e2e/methode.spec.ts`

**Interfaces:**
- Consumes : les classes et attributs posés par les tâches 02 et 03 (`.trait-calque[data-variante]`, `.trait-halo`, `.trait-ligne`, `.trait-tete`, `.methode-frise[data-trait]`, `[data-trait="logo"][data-allumee]`, `[data-trait="envoi"][data-allumee]`) ; le marqueur `trait-conducteur:v1`.

- [ ] **Step 1: Tests du CSS (échouent)**

Ajouter **à la fin** de `apps/web/lib/methode-css.test.ts` (après la dernière ligne, en gardant une ligne vide avant) :

```ts
describe("trait conducteur (app/globals.css)", () => {
  it("ne masque la ligne et le paquet de la frise que quand le trait a pris la main (`data-trait`)", () => {
    const masquees = regles(css).filter((r) => /display:\s*none/.test(r));
    expect(masquees.length).toBeGreaterThan(0);
    for (const regle of masquees) {
      expect(regle.slice(0, regle.indexOf("{")), regle).toContain("[data-trait]");
    }
  });

  it("n'anime le bouton d'envoi que sans mouvement réduit", () => {
    const pulsations = css.match(/[^{}]*\{[^{}]*animation:[^{}]*trait-pulsation[^{}]*\}/g) ?? [];
    expect(pulsations.length).toBe(1);
    const debut = css.indexOf(pulsations[0]!);
    const blocMouvement = css.lastIndexOf(MOUVEMENT, debut);
    expect(blocMouvement).toBeGreaterThanOrEqual(0);
    expect(bloc(blocMouvement)).toContain(pulsations[0]);
  });

  it("masque le calque à l'impression", () => {
    const impression = css.indexOf("@media print");
    expect(impression).toBeGreaterThanOrEqual(0);
    expect(bloc(impression)).toMatch(/\.trait-calque\s*\{[^}]*display:\s*none/);
  });
});

describe("trait conducteur : fluidité (app/globals.css)", () => {
  it("aucun filtre sur les tracés : un flou de toute la hauteur de la page, redessiné à chaque image, la ferait tomber", () => {
    const traces = css.match(/[^{}]*\.trait-(?:ligne|halo)[^{}]*\{[^{}]*\}/g) ?? [];
    expect(traces.length).toBeGreaterThan(0);
    for (const regle of traces) expect(regle, regle).not.toMatch(/filter\s*:/);
  });
});
```

Run: `./docs/superpowers/plans/trait-conducteur/court.sh pnpm --filter web exec vitest run lib/methode-css.test.ts --reporter=dot`
Expected: FAIL — 4 tests (les trois du bloc « trait conducteur » et celui de « fluidité ») ; les 3 tests existants passent.

- [ ] **Step 2: Le CSS**

Ajouter **à la fin** de `apps/web/app/globals.css` (après la dernière ligne, en gardant une ligne vide avant) :

```css
/*
 * Trait conducteur de l'accueil (lib/trait/trait-conducteur.ts) : un calque posé par le script
 * par-dessus la page, qui ne capte aucun clic. Sans JS ou en mouvement réduit, il n'existe pas.
 */
.trait-calque {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  width: 100%;
  overflow: hidden;
  pointer-events: none;
  transition: opacity 0.4s ease-out;
}
.trait-calque svg {
  display: block;
  overflow: hidden;
}
/* Pas de filtre sur les tracés : redessiner un flou de toute la hauteur de la page à chaque image
   ferait tomber la fluidité. Le halo est un second tracé, plus large et translucide. */
.trait-ligne,
.trait-halo {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.trait-ligne {
  stroke: var(--color-accent);
  stroke-width: 2;
}
.trait-halo {
  stroke: color-mix(in srgb, var(--color-lueur) 28%, transparent);
  stroke-width: 7;
}
.trait-calque[data-variante="bord"] .trait-ligne {
  stroke-width: 1.5;
}
.trait-calque[data-variante="bord"] .trait-halo {
  stroke-width: 5;
}
.trait-tete {
  fill: var(--color-texte);
  filter: drop-shadow(0 0 3px var(--color-accent)) drop-shadow(0 0 8px color-mix(in srgb, var(--color-lueur) 70%, transparent));
}
/* Méthode prise en main par le trait : c'est lui le fil ; la ligne pêche et le paquet de la frise s'effacent. */
.methode-frise[data-trait] .methode-fil__plein,
.methode-frise[data-trait] .methode-paquet {
  display: none;
}
/* Logos touchés et bouton d'envoi atteint : un halo qui reste. Animations et non transitions : les
   classes Tailwind de ces éléments ont déjà leurs propres transitions. */
[data-trait="logo"][data-allumee] img {
  filter: drop-shadow(0 0 14px color-mix(in srgb, var(--color-lueur) 60%, transparent));
}
[data-trait="envoi"][data-allumee] {
  box-shadow: 0 0 18px 2px color-mix(in srgb, var(--color-lueur) 45%, transparent);
}
@media (prefers-reduced-motion: no-preference) {
  /* Chaque étape s'allume à l'instant où le trait la touche, sans le décalage de la cascade. */
  .methode-frise[data-animation][data-trait] .methode-etape {
    --delai: 0s;
  }
  [data-trait="logo"][data-allumee] img {
    animation: trait-halo 0.6s ease-out;
  }
  [data-trait="envoi"][data-allumee] {
    animation: trait-pulsation 1.2s ease-out;
  }
}
@keyframes trait-halo {
  from {
    filter: drop-shadow(0 0 0 transparent);
  }
}
@keyframes trait-pulsation {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-accent) 70%, transparent);
  }
  35% {
    box-shadow:
      0 0 0 10px color-mix(in srgb, var(--color-accent) 0%, transparent),
      0 0 32px 8px color-mix(in srgb, var(--color-lueur) 60%, transparent);
  }
}
@media print {
  .trait-calque {
    display: none;
  }
}
```

Run: `./docs/superpowers/plans/trait-conducteur/court.sh pnpm --filter web exec vitest run lib/methode-css.test.ts lib/charte.test.ts --reporter=dot`
Expected: PASS — 2 fichiers (7 tests dans `methode-css.test.ts`).

- [ ] **Step 3: Les e2e du trait**

`apps/web/e2e/trait.spec.ts` :

```ts
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
```

- [ ] **Step 4: La Méthode sans trait (repli)**

Dans `apps/web/e2e/methode.spec.ts`, remplacer :

```ts
/** Jamais une étape allumée après une éteinte : toujours un début de liste. */
```

par :

```ts
/**
 * Sans le trait conducteur : son morceau de JS (repéré par `MARQUEUR_TRAIT`) ne se charge pas, la Méthode
 * s'allume par son repli (FriseMethode). Avec le trait, voir e2e/trait.spec.ts.
 */
async function sansTrait(page: Page) {
  await page.route("**/*.js", async (route) => {
    const reponse = await route.fetch();
    if ((await reponse.text()).includes("trait-conducteur:v1")) await route.abort();
    else await route.fulfill({ response: reponse });
  });
}

/** Jamais une étape allumée après une éteinte : toujours un début de liste. */
```

puis remplacer :

```ts
test("ordinateur : la frise s'allume d'une traite en cascade, même si l'on cesse de défiler", async ({ page, isMobile }) => {
  test.skip(isMobile, "Cascade : ordinateur seulement.");
  await page.goto("/");
```

par :

```ts
test("sans trait, ordinateur : la frise s'allume d'une traite en cascade, même si l'on cesse de défiler", async ({ page, isMobile }) => {
  test.skip(isMobile, "Cascade : ordinateur seulement.");
  await sansTrait(page);
  await page.goto("/");
```

puis remplacer :

```ts
test("téléphone : chaque étape s'allume en arrivant à l'écran, et le reste", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Étape par étape : téléphone seulement.");
```

par :

```ts
test("sans trait, téléphone : chaque étape s'allume en arrivant à l'écran, et le reste", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Étape par étape : téléphone seulement.");
  await sansTrait(page);
```

- [ ] **Step 5: Lint et types**

Run: `./docs/superpowers/plans/trait-conducteur/court.sh bash -c 'pnpm lint && pnpm typecheck'`
Expected: `→ code de sortie 0`.

- [ ] **Step 6: Build, e2e ciblés et taille**

Le conteneur Postgres local doit tourner (`docker ps | grep postgres`).

Run: `LIGNES=40 ./docs/superpowers/plans/trait-conducteur/court.sh bash -c 'pnpm build && pnpm --filter web verifier-taille-defilement && pnpm --filter web verifier-accueil-statique && pnpm --filter web exec playwright test e2e/trait.spec.ts e2e/methode.spec.ts e2e/defilement.spec.ts --reporter=line'`
Expected: `→ code de sortie 0`, avec :
- `Trait conducteur (…) : 4.0 Ko compressés, limite 6 Ko.` (à 0,1 Ko près) ;
- `Pages prérendues : /, /coulisses : OK.` ;
- e2e : 20 passés, 10 ignorés (ceux propres au téléphone ou à l'ordinateur).

`e2e/defilement.spec.ts` est là exprès : son test « à la molette, la page glisse » échoue si le trait ralentit l'affichage (c'est ce qui a fait retirer le filtre du trait).

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/methode-css.test.ts apps/web/app/globals.css apps/web/e2e/trait.spec.ts apps/web/e2e/methode.spec.ts
git commit -m "Trait conducteur : apparence (tracé et halo sans filtre, tête, halos des logos, pulsation de l'envoi) et tests de bout en bout ; la Méthode sans trait testée comme repli"
```

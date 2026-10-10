# Nuage de traits — plan d'implémentation

> **Pour l'exécutant :** SOUS-SKILL REQUIS : superpowers:executing-plans (ou subagent-driven-development).
> Étapes à cocher (`- [ ]`).

**But :** remplacer le halo corail de l'accueil par un nuage de petits traits orientés en rayons autour de la
souris (ou du doigt), né de l'éclatement de la goutte de l'intro, avec un nuage figé en SVG pour repli.

**Architecture :** un module pur `lib/encre/nuage.ts` sème les traits (et calcule le nuage figé) ; la
chronologie remplace la phase « halo » par rétractation puis éclatement ; le moteur WebGL garde la goutte
(shader actuel allégé) et dessine les traits en un appel instancié ; `NuageFige` (composant serveur) remplace
`HaloCss`, passé en prop à `IntroEncre` pour ne pas être recalculé à l'hydratation.

**Technique :** Next 16, React 19, WebGL2 (GLSL ES 3.0), Vitest (jsdom 29), Playwright.

**Spec :** `docs/superpowers/specs/2026-10-10-nuage-traits-design.md`

## Contraintes globales

- Français partout (code, commentaires, commits, tests) ; insécables en échappements ` ` / ` `.
- Couleurs : uniquement des **rôles** de `lib/charte.ts` (`goutte`, `lueur`, `lueur-chaude`, `texte-doux`).
- Traits : 2 px d'épaisseur, 4 à 8 px de long, un par carré de 28 px, **1 600 au plus**.
- Intro : durée totale **3,2 s** inchangée ; éclatement de **2,7 s à 3,2 s**.
- Moteur de l'encre : **10 Ko compressés** au plus (`pnpm --filter web verifier-taille-encre`).
- Accueil prérendu (`verifier-accueil-statique`) ; Lighthouse inchangé.
- Tests : Vitest `--reporter=dot`, Playwright `--reporter=line`, via `./docs/superpowers/plans/easter-eggs/court.sh`
  (charge l'environnement de test, garde le journal, rend le code de sortie).
- Ne pas tuer le `next dev` d'Augustin (port 3000) ; e2e sur 3100/3201 (config existante).
- Commits ciblés (fichiers nommés un par un), messages en français, pas de push sans accord.

## Points d'attention (Review Focus)

1. **Redimensionnement / rotation** pendant le nuage : le semis suit la nouvelle taille (pas de zone vide, pas de
   trait hors écran) — test « ressème quand la taille change » (tâche 2).
2. **Défilement au doigt** : le nuage suit le doigt pendant qu'il fait défiler, et revient au lâcher — tests
   `touchmove` / `touchend` (tâche 3).
3. **Souris qui quitte la fenêtre** : le nuage revient à sa place — test `mouseleave` (tâche 3).
4. **Écran très dense** (densité 3) : résolution plafonnée à 2 — test `tailleRendu` (tâche 2).
5. **Hydratation du nuage figé** : rendu au serveur, passé en prop, jamais recalculé au client — aucune erreur
   console à l'accueil (e2e existant) et SVG présent sans JavaScript (tâche 4).

---

### Tâche 1 : semis des traits et nuage figé (`lib/encre/nuage.ts`)

**Fichiers :** créer `apps/web/lib/encre/nuage.ts`, `apps/web/lib/encre/nuage.test.ts` ; modifier
`apps/web/lib/encre/chronologie.ts` (exporter `rvb`, une ligne).

**Interfaces produites :**
- `PAS = 28`, `TRAITS_MAX = 1600`, `COULEURS_NUAGE: string[]` (4 hex), `RAYON_FIGE = 100`
- `type Trait = { x: number; y: number; longueur: number; phase: number }` (px CSS, radians)
- `semerTraits(largeur: number, hauteur: number, graine = 9): Trait[]`
- `opaciteTrait(d: number, rayon: number): number` — même formule que le shader des traits
- `type GroupeFige = { couleur: string; opacite: number; chemin: string }` ; `nuageFige(): GroupeFige[]`
  (repère du SVG : viewBox `-200 -200 400 400`, rayon du nuage = `RAYON_FIGE`)

- [ ] **Étape 1 : tests**

```ts
// apps/web/lib/encre/nuage.test.ts
import { describe, it, expect } from "vitest";
import { COULEURS_NUAGE, PAS, TRAITS_MAX, nuageFige, opaciteTrait, semerTraits } from "./nuage";
import { couleur } from "../charte";

describe("semerTraits", () => {
  it("donne le même nuage pour la même taille", () => {
    expect(semerTraits(1280, 800)).toEqual(semerTraits(1280, 800));
  });

  it("sème environ un trait par carré de 28 px", () => {
    const n = semerTraits(1280, 800).length;
    expect(n).toBeGreaterThan(0.9 * ((1280 * 800) / (PAS * PAS)));
    expect(n).toBeLessThanOrEqual(TRAITS_MAX);
    expect(semerTraits(390, 844).length).toBeGreaterThan(350);
  });

  it("ne dépasse jamais 1 600 traits, même sur un très grand écran", () => {
    expect(semerTraits(3840, 2160).length).toBeLessThanOrEqual(TRAITS_MAX);
    expect(semerTraits(3840, 2160).length).toBeGreaterThan(1400);
  });

  it("garde chaque trait dans l'écran, de 4 à 8 px de long", () => {
    for (const t of semerTraits(844, 390)) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThanOrEqual(844);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThanOrEqual(390);
      expect(t.longueur).toBeGreaterThanOrEqual(4);
      expect(t.longueur).toBeLessThanOrEqual(8);
    }
  });

  it("ne sème rien sur une surface vide", () => {
    expect(semerTraits(0, 0)).toEqual([]);
  });
});

describe("opaciteTrait", () => {
  it("laisse un vide au centre, culmine autour du rayon et s'éteint au double", () => {
    expect(opaciteTrait(0, 160)).toBe(0);
    expect(opaciteTrait(160, 160)).toBeGreaterThan(0.6);
    expect(opaciteTrait(2 * 160, 160)).toBe(0);
  });
});

describe("nuageFige", () => {
  it("emploie les rôles de la charte", () => {
    expect(COULEURS_NUAGE).toEqual([couleur("goutte"), couleur("lueur"), couleur("lueur-chaude"), couleur("texte-doux")]);
    for (const g of nuageFige()) expect(COULEURS_NUAGE).toContain(g.couleur);
  });

  it("regroupe les traits en peu de chemins, avec un nombre de traits borné", () => {
    const groupes = nuageFige();
    expect(groupes.length).toBeLessThanOrEqual(16);
    const traits = groupes.reduce((n, g) => n + (g.chemin.match(/M/g)?.length ?? 0), 0);
    expect(traits).toBeGreaterThan(150);
    expect(traits).toBeLessThan(450);
  });

  it("reste dans le repère du SVG", () => {
    for (const g of nuageFige()) {
      for (const n of g.chemin.match(/-?\d+(\.\d+)?/g)!.map(Number)) expect(Math.abs(n)).toBeLessThanOrEqual(200);
    }
  });
});
```

- [ ] **Étape 2 : lancer, constater l'échec** — `pnpm --filter web exec vitest run lib/encre/nuage.test.ts --reporter=dot`
  → échec : module `./nuage` introuvable.

- [ ] **Étape 3 : implémentation**

Dans `chronologie.ts`, `const rvb = …` devient `export const rvb = …` (rien d'autre dans cette tâche).

```ts
// apps/web/lib/encre/nuage.ts
/**
 * Nuage de traits de l'accueil (sous-projet 9) : semis des traits et nuage au
 * repos, sans WebGL ni DOM. Le moteur (lib/encre/moteur.ts) envoie le semis à
 * la carte graphique, qui applique les mêmes formules (SOURCE_TRAITS_SOMMET,
 * lib/encre/shader.ts) ; le nuage figé (components/accueil/NuageFige.tsx) les
 * applique ici, une fois, au rendu serveur.
 *
 * Unités : pixels CSS.
 */
import { couleur } from "../charte";

/** Un trait par carré de PAS px de côté, TRAITS_MAX au plus. */
export const PAS = 28;
export const TRAITS_MAX = 1600;

/** Rôles de la charte, répartis selon l'angle autour du centre du nuage. */
export const COULEURS_NUAGE = [couleur("goutte"), couleur("lueur"), couleur("lueur-chaude"), couleur("texte-doux")];

export type Trait = { x: number; y: number; longueur: number; phase: number };

/** Tirage pseudo-aléatoire reproductible (mulberry32) : même graine, même nuage. */
function hasard(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Traits d'une surface de `largeur` × `hauteur` px : une grille de pas PAS (élargi au-delà de TRAITS_MAX), chaque trait décalé au hasard dans sa case. */
export function semerTraits(largeur: number, hauteur: number, graine = 9): Trait[] {
  if (largeur <= 0 || hauteur <= 0) return [];
  const pas = Math.max(PAS, Math.sqrt((largeur * hauteur) / TRAITS_MAX));
  const tirer = hasard(graine);
  const borner = (v: number, max: number) => Math.min(max, Math.max(0, v));
  const traits: Trait[] = [];
  for (let y = pas / 2; y < hauteur; y += pas) {
    for (let x = pas / 2; x < largeur; x += pas) {
      traits.push({
        x: borner(x + (tirer() - 0.5) * pas * 0.9, largeur),
        y: borner(y + (tirer() - 0.5) * pas * 0.9, hauteur),
        longueur: 4 + tirer() * 4,
        phase: tirer() * Math.PI * 2,
      });
    }
  }
  return traits.slice(0, TRAITS_MAX);
}

/** Opacité d'un trait à la distance `d` du centre d'un nuage de rayon `rayon` : vide au centre, estompe au loin (nulle au-delà de 1,95 rayon). */
export function opaciteTrait(d: number, rayon: number): number {
  const vide = Math.min(1, Math.max(0, (d - 0.14 * rayon) / (0.25 * rayon)));
  const loin = Math.max(0, 1 - Math.pow(Math.max(0, d - 0.35 * rayon) / (1.6 * rayon), 1.4));
  return vide * loin;
}

/** Rayon du nuage dans le repère du nuage figé (viewBox de -200 à 200). */
export const RAYON_FIGE = 100;

export type GroupeFige = { couleur: string; opacite: number; chemin: string };

/**
 * Le nuage au repos, tel que le moteur le dessine sur un écran de 800 px de
 * haut (rayon 160 px), ramené au repère du SVG. Les traits sont regroupés par
 * couleur et par palier d'opacité : un `<path>` par groupe, pour un HTML léger.
 */
export function nuageFige(): GroupeFige[] {
  const rayon = 160;
  const echelle = RAYON_FIGE / rayon;
  const cote = 400 / echelle;
  const groupes = new Map<string, GroupeFige>();
  const arrondi = (v: number) => Math.round(v * 10) / 10;
  for (const t of semerTraits(cote, cote)) {
    const dx = t.x - cote / 2;
    const dy = t.y - cote / 2;
    const d = Math.hypot(dx, dy) || 0.001;
    const opacite = opaciteTrait(d, rayon);
    if (opacite < 0.1) continue;
    const proche = Math.exp(-d / rayon);
    const [ux, uy] = [dx / d, dy / d];
    const longueur = t.longueur * (0.6 + 0.6 * proche);
    const cx = dx + ux * 14 * proche;
    const cy = dy + uy * 14 * proche;
    const angle = (((Math.atan2(dy, dx) / (2 * Math.PI)) % 1) + 1) % 1;
    const teinte = COULEURS_NUAGE[Math.floor(angle * COULEURS_NUAGE.length + 0.5) % COULEURS_NUAGE.length]!;
    const palier = Math.ceil(opacite * 4) / 4;
    const cle = `${teinte}-${palier}`;
    const groupe = groupes.get(cle) ?? { couleur: teinte, opacite: arrondi(palier * 0.9), chemin: "" };
    groupe.chemin +=
      `M${arrondi((cx - (ux * longueur) / 2) * echelle)} ${arrondi((cy - (uy * longueur) / 2) * echelle)}` +
      `l${arrondi(ux * longueur * echelle)} ${arrondi(uy * longueur * echelle)}`;
    groupes.set(cle, groupe);
  }
  return [...groupes.values()];
}
```

- [ ] **Étape 4 : lancer, constater le succès** — même commande → tous verts.
- [ ] **Étape 5 : commit**

```bash
git add apps/web/lib/encre/nuage.ts
git add apps/web/lib/encre/nuage.test.ts
git add apps/web/lib/encre/chronologie.ts
git commit -m "Nuage : semis déterministe des traits et nuage figé, aux couleurs de la charte"
```

---

### Tâche 2 : chronologie, shaders et moteur

**Fichiers :** réécrire `apps/web/lib/encre/chronologie.ts` (sauf `rvb`, `rayonCouverture`),
`apps/web/lib/encre/chronologie.test.ts`, `apps/web/lib/encre/shader.ts` ; modifier `apps/web/lib/encre/moteur.ts`,
`apps/web/lib/encre/moteur.test.ts`, `apps/web/components/accueil/IntroEncre.tsx` (renommage, 3 lignes).

**Interfaces consommées :** tâche 1 (`semerTraits`, `COULEURS_NUAGE`, `rvb`).

**Interfaces produites :**
- `PLACE = { x: 0.8, y: 0.24, rayon: 0.2 }`, `COLONNE_MAX`, `HAUTEUR_MAX`, `DEBUT_ECLAT = 2700`, `DUREE_INTRO = 3200`
- `type Repos = { centre: Point; rayon: number }` ; `reposNuage(largeur, hauteur): Repos`
- `type EtatEncre = { centre: Point; rayon: number; opaciteNom: number; eclat: number; terminee: boolean }`
- `etatEncre(t, couverture, repos): EtatEncre` ; `etatNuage(repos): EtatEncre`
- `cibleNuage(pointeur: Point | null, repos: Point): Point` ; `suivre(actuel, cible, facteur = 0.07): Point`
- `OptionsMoteur` sans `tactile` ; `Moteur.suivrePointeur(point: Point | null)` (remplace `suivreSouris`)
- `tailleRendu(largeurCss, hauteurCss, densite = 1)`

- [ ] **Étape 1 : tests de la chronologie** — remplacer `chronologie.test.ts` par :

```ts
import { describe, it, expect } from "vitest";
import {
  COLONNE_MAX,
  DEBUT_ECLAT,
  DUREE_INTRO,
  GOUTTE,
  HAUTEUR_MAX,
  PLACE,
  cibleNuage,
  etatEncre,
  etatNuage,
  rayonCouverture,
  reposNuage,
  suivre,
} from "./chronologie";

const COUVERTURE = 1.2;
/** Écran d'ordinateur portable : plus petit que le cadre de référence. */
const REPOS = reposNuage(1280, 800);

describe("etatEncre", () => {
  it("part d'une goutte invisible au centre, sans nom ni traits", () => {
    const etat = etatEncre(0, COUVERTURE, REPOS);
    expect(etat.centre).toEqual({ x: 0.5, y: 0.5 });
    expect(etat.rayon).toBe(0);
    expect(etat.opaciteNom).toBe(0);
    expect(etat.eclat).toBe(0);
    expect(etat.terminee).toBe(false);
  });

  it("s'étale encore à 600 ms et couvre l'écran à 900 ms", () => {
    expect(etatEncre(600, COUVERTURE, REPOS).rayon).toBeLessThan(COUVERTURE);
    expect(etatEncre(900, COUVERTURE, REPOS).rayon).toBeCloseTo(COUVERTURE);
  });

  it("affiche le nom en 300 ms puis le laisse lisible jusqu'à 2000 ms", () => {
    expect(etatEncre(1050, COUVERTURE, REPOS).opaciteNom).toBeCloseTo(0.5);
    for (let t = 1200; t < 2000; t += 100) {
      expect(etatEncre(t, COUVERTURE, REPOS).opaciteNom).toBe(1);
      expect(etatEncre(t, COUVERTURE, REPOS).rayon).toBe(COUVERTURE);
    }
  });

  it("se rétracte vers la place du nuage entre 2000 et 2700 ms, sans traits", () => {
    expect(etatEncre(2200, COUVERTURE, REPOS).opaciteNom).toBeCloseTo(0.5);
    const milieu = etatEncre(2350, COUVERTURE, REPOS);
    expect(milieu.rayon).toBeLessThan(COUVERTURE);
    expect(milieu.centre.x).toBeGreaterThan(0.5);
    expect(milieu.centre.y).toBeLessThan(0.5);
    expect(milieu.eclat).toBe(0);
    const fin = etatEncre(DEBUT_ECLAT - 1, COUVERTURE, REPOS);
    expect(fin.centre.x).toBeCloseTo(REPOS.centre.x, 2);
    expect(fin.centre.y).toBeCloseTo(REPOS.centre.y, 2);
    expect(fin.rayon).toBeLessThan(REPOS.rayon);
  });

  it("éclate en traits de 2700 à 3200 ms, pendant que la goutte disparaît", () => {
    expect(DEBUT_ECLAT).toBe(2700);
    const debut = etatEncre(2700, COUVERTURE, REPOS);
    expect(debut.eclat).toBe(0);
    const milieu = etatEncre(2950, COUVERTURE, REPOS);
    expect(milieu.eclat).toBeCloseTo(0.5);
    expect(milieu.centre).toEqual(REPOS.centre);
    expect(etatEncre(2950, COUVERTURE, REPOS).rayon).toBe(0);
    expect(etatEncre(3150, COUVERTURE, REPOS).terminee).toBe(false);
  });

  it("a un rayon qui ne fait que décroître de 2000 ms à la fin", () => {
    let precedent = Infinity;
    for (let t = 2000; t <= 3200; t += 50) {
      const { rayon } = etatEncre(t, COUVERTURE, REPOS);
      expect(rayon).toBeLessThanOrEqual(precedent);
      precedent = rayon;
    }
  });

  it("se termine à 3200 ms : nuage posé, plus de goutte", () => {
    expect(DUREE_INTRO).toBe(3200);
    const fin = etatEncre(DUREE_INTRO, COUVERTURE, REPOS);
    expect(fin).toEqual(etatNuage(REPOS));
    expect(fin).toMatchObject({ rayon: 0, eclat: 1, opaciteNom: 0, terminee: true });
    expect(etatEncre(60_000, COUVERTURE, REPOS).terminee).toBe(true);
  });

  it("traite un temps négatif comme le début", () => {
    expect(etatEncre(-20, COUVERTURE, REPOS).rayon).toBe(0);
  });

  it("garde la goutte pêche de la charte", () => {
    expect(GOUTTE).toEqual([0xea / 255, 0xb5 / 255, 0x95 / 255]);
  });
});

describe("rayonCouverture", () => {
  // Review Focus 2 (sous-projet 1) : l'encre doit couvrir les coins en paysage comme en portrait.
  it.each([
    [1920, 1080],
    [390, 844],
    [844, 390],
    [3440, 1440],
  ])("couvre les quatre coins d'un écran %i × %i", (largeur, hauteur) => {
    const demiDiagonale = Math.hypot(largeur / hauteur / 2, 0.5);
    expect(rayonCouverture(largeur, hauteur)).toBeGreaterThan(demiDiagonale * 1.15);
  });
});

describe("reposNuage", () => {
  it("se pose à la place de l'ancien halo, en fractions de l'écran quand il tient dans le cadre", () => {
    expect(REPOS).toEqual({ centre: { x: 0.8, y: 0.24 }, rayon: 0.2 });
    expect(PLACE).toEqual({ x: 0.8, y: 0.24, rayon: 0.2 });
    expect(reposNuage(390, 844).centre.x).toBeCloseTo(0.8);
  });

  it("reste au-dessus de la colonne de contenu sur un très grand écran", () => {
    const repos = reposNuage(2560, 1300);
    const marge = (2560 - COLONNE_MAX) / 2;
    expect(repos.centre.x * 2560).toBeCloseTo(marge + PLACE.x * COLONNE_MAX);
    expect(repos.rayon * 1300).toBeCloseTo(PLACE.rayon * HAUTEUR_MAX);
    expect(repos.centre.y * 1300).toBeCloseTo(PLACE.y * HAUTEUR_MAX);
  });
});

describe("nuage", () => {
  const place = { x: 0.8, y: 0.24 };

  it("vise le pointeur (souris ou doigt), sinon sa place", () => {
    expect(cibleNuage({ x: 0.1, y: 0.9 }, place)).toEqual({ x: 0.1, y: 0.9 });
    expect(cibleNuage(null, place)).toEqual(place);
  });

  it("rejoint sa cible avec un léger retard", () => {
    let point = { x: 0, y: 0 };
    const cible = { x: 1, y: 0 };
    point = suivre(point, cible);
    expect(point.x).toBeCloseTo(0.07);
    for (let i = 0; i < 200; i += 1) point = suivre(point, cible);
    expect(point.x).toBeCloseTo(1, 3);
  });
});
```

- [ ] **Étape 2 : tests du moteur** — dans `moteur.test.ts`, remplacer le bloc `describe("tailleRendu", …)` et
  ajouter le test de dessin ; retirer `tactile: false` des options de tous les appels à `creerMoteur` :

```ts
describe("tailleRendu", () => {
  it("dessine à la densité de l'écran, pour des traits de 2 px nets", () => {
    expect(tailleRendu(1440, 900, 1)).toEqual({ largeur: 1440, hauteur: 900 });
    expect(tailleRendu(1440, 900, 2)).toEqual({ largeur: 2880, hauteur: 1800 });
  });

  it("plafonne la densité à 2", () => {
    expect(tailleRendu(1440, 900, 3)).toEqual({ largeur: 2880, hauteur: 1800 });
  });

  it("garde au moins un pixel", () => {
    expect(tailleRendu(0, 0)).toEqual({ largeur: 1, hauteur: 1 });
  });
});

describe("dessin du nuage", () => {
  /** Faux contexte qui note les appels de dessin ; tout le reste réussit sans rien faire. */
  function fauxContexte() {
    const appels = { drawArrays: vi.fn(), drawArraysInstanced: vi.fn(), bufferData: vi.fn() };
    const fixes: Record<string, unknown> = {
      ...appels,
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      isContextLost: () => false,
      getExtension: () => null,
    };
    const gl = new Proxy(fixes, { get: (cible, cle: string) => cible[cle] ?? (() => ({})) });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl as unknown as WebGL2RenderingContext);
    return appels;
  }

  function canvasDe(largeur: number, hauteur: number) {
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "clientWidth", { configurable: true, get: () => largeur });
    Object.defineProperty(canvas, "clientHeight", { configurable: true, get: () => hauteur });
    return canvas;
  }

  const image = () => new Promise((resoudre) => requestAnimationFrame(() => resoudre(null)));

  it("sans intro, dessine le nuage posé en un seul appel, un exemplaire par trait, sans goutte", async () => {
    const appels = fauxContexte();
    const moteur = creerMoteur({ canvas: canvasDe(1280, 800), intro: false })!;
    moteur.demarrer();
    await image();
    expect(appels.drawArraysInstanced).toHaveBeenCalledWith(expect.anything(), 0, 6, semerTraits(1280, 800).length);
    expect(appels.drawArrays).not.toHaveBeenCalled();
    moteur.arreter();
  });

  // Review Focus 1 : rotation ou redimensionnement pendant le nuage.
  it("ressème quand la taille change", async () => {
    const appels = fauxContexte();
    let largeur = 1280;
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "clientWidth", { configurable: true, get: () => largeur });
    Object.defineProperty(canvas, "clientHeight", { configurable: true, get: () => 800 });
    const moteur = creerMoteur({ canvas, intro: false })!;
    moteur.demarrer();
    await image();
    largeur = 390;
    moteur.suivrePointeur({ x: 0.5, y: 0.5 });
    await image();
    expect(appels.drawArraysInstanced).toHaveBeenLastCalledWith(expect.anything(), 0, 6, semerTraits(390, 800).length);
    moteur.arreter();
  });
});
```

Ajouter `import { semerTraits } from "./nuage";` en tête de `moteur.test.ts`.

- [ ] **Étape 3 : lancer, constater l'échec** — `pnpm --filter web exec vitest run lib/encre --reporter=dot`
  → échecs (exports `reposNuage`, `etatNuage`, `cibleNuage`, `DEBUT_ECLAT` absents ; `tailleRendu` à
  demi-résolution ; `suivrePointeur` absent).

- [ ] **Étape 4 : chronologie** — remplacer tout le contenu de `chronologie.ts` **après** la fonction `rvb` et
  jusqu'à la fin, en gardant `rayonCouverture` tel quel :

```ts
/** Goutte pêche de l'intro : rôle de lib/charte.ts. */
export const GOUTTE = rvb(couleur("goutte"));

/**
 * Place de repos du nuage de traits (celle de l'ancien halo), dans un cadre de
 * référence : la colonne de contenu (au plus `COLONNE_MAX` px de large,
 * centrée) sur le premier écran (au plus `HAUTEUR_MAX` px de haut). `x` est
 * une fraction de la colonne ; `y` et `rayon` (rayon du nuage) des fractions de
 * cette hauteur. Sur un écran plus petit que le cadre, ce sont simplement des
 * fractions de l'écran. `.nuage-fige` (app/globals.css) fait le même calcul.
 */
export const PLACE = { x: 0.8, y: 0.24, rayon: 0.2 } as const;
/** `--container-page` (90rem) de app/globals.css. */
export const COLONNE_MAX = 1440;
/** Hauteur maximale de l'accroche et de l'en-tête (56rem + 5rem, components/accueil/Accroche.tsx). */
export const HAUTEUR_MAX = 976;

/** Nuage au repos, dans les unités du shader. */
export type Repos = { centre: Point; rayon: number };

/** Place et rayon du nuage au repos sur un écran de `largeur` × `hauteur` px (CSS). */
export function reposNuage(largeur: number, hauteur: number): Repos {
  const colonne = Math.min(largeur, COLONNE_MAX);
  const reference = Math.min(hauteur, HAUTEUR_MAX) / hauteur;
  return {
    centre: { x: ((largeur - colonne) / 2 + PLACE.x * colonne) / largeur, y: PLACE.y * reference },
    rayon: PLACE.rayon * reference,
  };
}

const FIN_ETALEMENT = 900;
/** Le nom apparaît en 300 ms, reste lisible jusqu'à FIN_NOM, puis s'efface en 400 ms. */
const FONDU_NOM = 300;
const EFFACEMENT_NOM = 400;
const FIN_NOM = 2000;
/** La goutte rétractée éclate en traits de DEBUT_ECLAT à DUREE_INTRO. */
export const DEBUT_ECLAT = 2700;
export const DUREE_INTRO = 3200;
/** Rayon de la goutte rétractée, en part du rayon du nuage. */
const RAPPORT_GOUTTE = 0.3;
/** Part de l'éclatement pendant laquelle la goutte achève de disparaître. */
const DISPARITION_GOUTTE = 0.4;
const CENTRE: Point = { x: 0.5, y: 0.5 };

export type EtatEncre = {
  /** Centre et rayon de la goutte (rayon nul : plus de goutte). */
  centre: Point;
  rayon: number;
  opaciteNom: number;
  /** Avancée de l'éclatement : 0, pas encore de traits ; 1, nuage posé. */
  eclat: number;
  terminee: boolean;
};

const borner = (t: number) => Math.min(1, Math.max(0, t));
const lisser = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/** Le nuage posé, l'intro finie. */
export function etatNuage(repos: Repos): EtatEncre {
  return { centre: { ...repos.centre }, rayon: 0, opaciteNom: 0, eclat: 1, terminee: true };
}

/**
 * État de l'encre `t` ms après le début de l'intro. `couverture` est le rayon
 * qui couvre tout l'écran depuis son centre (voir `rayonCouverture`).
 */
export function etatEncre(t: number, couverture: number, repos: Repos): EtatEncre {
  if (t >= DUREE_INTRO) return etatNuage(repos);
  if (t < FIN_ETALEMENT) {
    return { centre: CENTRE, rayon: couverture * lisser(borner(t / FIN_ETALEMENT)), opaciteNom: 0, eclat: 0, terminee: false };
  }
  if (t < FIN_NOM) {
    return { centre: CENTRE, rayon: couverture, opaciteNom: borner((t - FIN_ETALEMENT) / FONDU_NOM), eclat: 0, terminee: false };
  }
  const rayonRetracte = repos.rayon * RAPPORT_GOUTTE;
  if (t < DEBUT_ECLAT) {
    const k = lisser(borner((t - FIN_NOM) / (DEBUT_ECLAT - FIN_NOM)));
    return {
      centre: { x: mix(CENTRE.x, repos.centre.x, k), y: mix(CENTRE.y, repos.centre.y, k) },
      rayon: mix(couverture, rayonRetracte, k),
      opaciteNom: 1 - borner((t - FIN_NOM) / EFFACEMENT_NOM),
      eclat: 0,
      terminee: false,
    };
  }
  const eclat = borner((t - DEBUT_ECLAT) / (DUREE_INTRO - DEBUT_ECLAT));
  return {
    centre: { ...repos.centre },
    rayon: rayonRetracte * (1 - lisser(borner(eclat / DISPARITION_GOUTTE))),
    opaciteNom: 0,
    eclat,
    terminee: false,
  };
}
```

puis, après `rayonCouverture` (inchangée) :

```ts
/** Centre visé par le nuage : le pointeur (souris ou doigt), sinon sa place de repos. */
export function cibleNuage(pointeur: Point | null, repos: Point): Point {
  return pointeur ? { x: pointeur.x, y: pointeur.y } : { x: repos.x, y: repos.y };
}

/** Rapproche `actuel` de `cible` d'une fraction par image : l'inertie du nuage. */
export function suivre(actuel: Point, cible: Point, facteur = 0.07): Point {
  return {
    x: actuel.x + (cible.x - actuel.x) * facteur,
    y: actuel.y + (cible.y - actuel.y) * facteur,
  };
}
```

Supprimés : `LUEUR`, `LUEUR_CHAUDE`, `HALO`, `reposHalo`, `etatHalo`, `cibleHalo`, `FLOU_NET`, `melange`, `flou`,
`couleur` de l'état. Le commentaire d'en-tête du fichier devient :

```ts
/**
 * Chronologie de l'intro « goutte de lumière » et du nuage de traits qui lui
 * succède, sans WebGL ni DOM : le moteur l'interroge à chaque image et
 * transmet le résultat aux shaders.
 *
 * Unités : positions en fractions de l'écran (y depuis le haut) ; rayons en
 * hauteurs d'écran.
 */
```

- [ ] **Étape 5 : shaders** — remplacer tout `shader.ts` par :

```ts
/**
 * Shaders de l'encre (GLSL ES 3.0).
 * - La goutte : un seul triangle couvre l'écran ; le fragment shader dessine
 *   une forme ronde au bord organique (distance au centre, déformée par un
 *   bruit fractal qui ondule lentement).
 * - Les traits du nuage : un rectangle répété une fois par trait (rendu
 *   instancié). Mêmes formules que lib/encre/nuage.ts (`opaciteTrait`,
 *   `nuageFige`).
 */

export const SOURCE_SOMMET = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const SOURCE_FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 uResolution;     // pixels
uniform vec2 uCentre;         // fractions de l'écran, y depuis le haut
uniform float uRayon;         // hauteurs d'écran
uniform vec3 uCouleur;
uniform float uTemps;         // secondes

out vec4 fragColor;

// Bord net de la goutte (demi-largeur, hauteurs d'écran).
const float FLOU = 0.004;

float hachage(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float bruit(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hachage(i), hachage(i + vec2(1.0, 0.0)), u.x),
    mix(hachage(i + vec2(0.0, 1.0)), hachage(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float valeur = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    valeur += amplitude * bruit(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return valeur;
}

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 p = (pixel - uCentre * uResolution) / uResolution.y;
  float d = length(p);
  // Bruit lu le long du contour (direction), donc sans couture.
  vec2 direction = p / max(d, 1e-4);
  float ondulation = (fbm(direction * 1.8 + uTemps * 0.25) - 0.5) * 0.22 * uRayon;
  float bord = d - (uRayon + ondulation);
  float alpha = 1.0 - smoothstep(-FLOU, FLOU + 0.002, bord);
  fragColor = vec4(uCouleur * alpha, alpha);
}
`;

export const SOURCE_TRAITS_SOMMET = `#version 300 es
in vec2 aCoin;            // coin du rectangle : x le long du trait, y en travers (de -0,5 à 0,5)
in vec4 aTrait;           // place (px CSS), longueur (px), phase (radians)

uniform vec2 uTaille;     // surface (px CSS)
uniform vec2 uCentre;     // centre du nuage (px CSS)
uniform vec2 uOrigine;    // centre de la goutte qui éclate (px CSS)
uniform float uRayon;     // rayon du nuage (px CSS)
uniform float uEclat;     // 0 : traits dans la goutte ; 1 : à leur place
uniform float uTemps;     // secondes
uniform vec3 uCouleurs[4];

out vec4 vCouleur;
out vec2 vPoint;          // position dans le trait (px), le long et en travers
out float vDemi;          // demi-longueur du trait (px), sans les bouts arrondis

void main() {
  float rayon = uRayon * (1.0 + 0.08 * sin(uTemps * 0.8));
  vec2 ecart = aTrait.xy - uCentre;
  float d = max(length(ecart), 0.001);
  vec2 rayonVers = ecart / d;
  // Vide au centre, estompe au loin : opaciteTrait de lib/encre/nuage.ts.
  float vide = clamp((d - 0.14 * rayon) / (0.25 * rayon), 0.0, 1.0);
  float loin = max(0.0, 1.0 - pow(max(0.0, d - 0.35 * rayon) / (1.6 * rayon), 1.4));
  float proche = exp(-d / rayon);
  vec2 place = aTrait.xy + rayonVers * 14.0 * proche
    + vec2(cos(uTemps * 0.7 + aTrait.w), sin(uTemps * 0.9 + aTrait.w)) * 1.5;
  // Éclatement : chaque trait part du centre de la goutte et ralentit en arrivant.
  float e = 1.0 - pow(1.0 - uEclat, 3.0);
  place = mix(uOrigine, place, e);
  float longueur = aTrait.z * (0.6 + 0.6 * proche);
  vec2 travers = vec2(-rayonVers.y, rayonVers.x);
  vec2 point = place + rayonVers * aCoin.x * (longueur + 2.0) + travers * aCoin.y * 2.0;
  gl_Position = vec4(point / uTaille * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);

  float angle = fract(atan(rayonVers.y, rayonVers.x) / 6.2831853 + 0.1 * sin(uTemps * 0.2)) * 4.0;
  int i = int(angle);
  vec3 c = mix(uCouleurs[i], uCouleurs[(i + 1) % 4], fract(angle));
  vCouleur = vec4(c, vide * loin * 0.9 * smoothstep(0.0, 0.25, uEclat));
  vPoint = vec2(aCoin.x * (longueur + 2.0), aCoin.y * 2.0);
  vDemi = longueur / 2.0;
}
`;

export const SOURCE_TRAITS_FRAGMENT = `#version 300 es
precision highp float;

in vec4 vCouleur;
in vec2 vPoint;
in float vDemi;

out vec4 fragColor;

void main() {
  // Distance au segment central : bouts arrondis, 1 px de rayon.
  float d = length(vec2(max(abs(vPoint.x) - vDemi, 0.0), vPoint.y));
  float alpha = vCouleur.a * (1.0 - smoothstep(0.5, 1.0, d));
  fragColor = vec4(vCouleur.rgb * alpha, alpha);
}
`;
```

- [ ] **Étape 6 : moteur** — dans `moteur.ts` :

En-tête des imports :

```ts
import { GOUTTE, cibleNuage, etatEncre, etatNuage, rayonCouverture, reposNuage, rvb, suivre, type EtatEncre, type Point } from "./chronologie";
import { COULEURS_NUAGE, semerTraits } from "./nuage";
import { SOURCE_FRAGMENT, SOURCE_SOMMET, SOURCE_TRAITS_FRAGMENT, SOURCE_TRAITS_SOMMET } from "./shader";
```

Remplacer `ECHELLE_RENDU` et `REPOS` (et leurs commentaires) par :

```ts
/**
 * Pixels du canvas par pixel CSS : la densité de l'écran, plafonnée. Les
 * traits du nuage font 2 px de large : à demi-résolution, ils seraient flous.
 */
const DENSITE_MAX = 2;
```

`OptionsMoteur` : supprimer `tactile` ; le commentaire de `intro` devient « Joue l'intro avant de poser le nuage ;
sinon, nuage directement. » ; celui de `surPret` devient « Première image dessinée : le canvas peut remplacer le
nuage figé. ».

`Moteur` :

```ts
export type Moteur = {
  demarrer(): void;
  /** Termine l'intro immédiatement : le nuage se pose. */
  sauter(): void;
  /** Position du pointeur (souris ou doigt) en fractions du canvas (y depuis le haut), ou null. */
  suivrePointeur(point: Point | null): void;
  arreter(): void;
};

/** Taille du canvas, en pixels, pour une surface affichée de `largeurCss` × `hauteurCss` sur un écran de densité `densite`. */
export function tailleRendu(largeurCss: number, hauteurCss: number, densite = 1) {
  const echelle = Math.min(densite, DENSITE_MAX);
  return {
    largeur: Math.max(1, Math.round(largeurCss * echelle)),
    hauteur: Math.max(1, Math.round(hauteurCss * echelle)),
  };
}
```

Dans `creerMoteur`, le commentaire du rendu logiciel dit « on garde le nuage figé » au lieu de « le halo CSS ».
Remplacer tout le bloc qui va de `const programme = compiler(gl);` jusqu'à la fonction `boucle` incluse par :

```ts
  const goutte = compiler(gl, SOURCE_SOMMET, SOURCE_FRAGMENT);
  const traits = goutte && compiler(gl, SOURCE_TRAITS_SOMMET, SOURCE_TRAITS_FRAGMENT);
  if (!goutte || !traits) {
    options.surEchec?.("shader");
    return null;
  }
  canvas.dataset.moteur = MARQUEUR_MOTEUR;
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // couleurs prémultipliées

  // Goutte : un triangle qui déborde de l'écran le couvre entièrement.
  const vaoGoutte = gl.createVertexArray();
  gl.bindVertexArray(vaoGoutte);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  attribut(gl, goutte, "aPosition", 2, 0);

  // Traits : un rectangle (deux triangles), répété une fois par trait.
  const vaoTraits = gl.createVertexArray();
  gl.bindVertexArray(vaoTraits);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5]),
    gl.STATIC_DRAW
  );
  attribut(gl, traits, "aCoin", 2, 0);
  const tamponTraits = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tamponTraits);
  attribut(gl, traits, "aTrait", 4, 1);
  gl.bindVertexArray(null);

  const ug = (nom: string) => gl.getUniformLocation(goutte, nom);
  const ut = (nom: string) => gl.getUniformLocation(traits, nom);
  const uGoutte = { resolution: ug("uResolution"), centre: ug("uCentre"), rayon: ug("uRayon"), temps: ug("uTemps") };
  const uTraits = {
    taille: ut("uTaille"),
    centre: ut("uCentre"),
    origine: ut("uOrigine"),
    rayon: ut("uRayon"),
    eclat: ut("uEclat"),
    temps: ut("uTemps"),
  };
  gl.useProgram(goutte);
  gl.uniform3fv(ug("uCouleur"), GOUTTE);
  gl.useProgram(traits);
  gl.uniform3fv(ut("uCouleurs"), COULEURS_NUAGE.flatMap(rvb));

  /** Instant (horloge rAF) de la première image d'intro ; posé à ce moment-là. */
  let debut: number | null = null;
  let demarre = false;
  /** Horloge des shaders (ms) : n'avance que sur les images dessinées, sans saut après une pause. */
  let horloge = 0;
  let precedent: number | null = null;
  let introFinie = !options.intro;
  let repos = reposNuage(canvas.clientWidth || 1, canvas.clientHeight || 1);
  /** Centre du nuage, en fractions du canvas. */
  let nuage: Point = repos.centre;
  let pointeur: Point | null = null;
  /** Surface (px CSS) du semis envoyé à la carte graphique, et nombre de traits. */
  let semis = { largeur: 0, hauteur: 0, nombre: 0 };
  let image = 0;
  let pret = false;
  let arrete = false;
  /** Le haut de page est à l'écran ; sinon, inutile de dessiner. */
  let aLEcran = true;

  function redimensionner() {
    const largeurCss = canvas.clientWidth || 1;
    const hauteurCss = canvas.clientHeight || 1;
    const { largeur, hauteur } = tailleRendu(largeurCss, hauteurCss, window.devicePixelRatio || 1);
    if (canvas.width !== largeur || canvas.height !== hauteur) {
      canvas.width = largeur;
      canvas.height = hauteur;
    }
    gl!.viewport(0, 0, canvas.width, canvas.height);
    repos = reposNuage(largeurCss, hauteurCss);
    if (semis.largeur !== largeurCss || semis.hauteur !== hauteurCss) {
      const liste = semerTraits(largeurCss, hauteurCss);
      gl!.bindBuffer(gl!.ARRAY_BUFFER, tamponTraits);
      gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(liste.flatMap((t) => [t.x, t.y, t.longueur, t.phase])), gl!.STATIC_DRAW);
      semis = { largeur: largeurCss, hauteur: hauteurCss, nombre: liste.length };
    }
  }

  /** Dessine la goutte (si elle a encore un rayon) puis les traits (dès l'éclatement), autour de `centreNuage`. */
  function dessiner(etat: EtatEncre, centreNuage: Point, maintenant: number) {
    horloge += precedent === null ? 0 : Math.min(maintenant - precedent, 50);
    precedent = maintenant;
    const temps = (horloge / 1000) % 1000;
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    if (etat.rayon > 0) {
      gl!.useProgram(goutte);
      gl!.bindVertexArray(vaoGoutte);
      gl!.uniform2f(uGoutte.resolution, canvas.width, canvas.height);
      gl!.uniform2f(uGoutte.centre, etat.centre.x, etat.centre.y);
      gl!.uniform1f(uGoutte.rayon, etat.rayon);
      gl!.uniform1f(uGoutte.temps, temps);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }
    if (etat.eclat > 0) {
      const { largeur, hauteur, nombre } = semis;
      gl!.useProgram(traits);
      gl!.bindVertexArray(vaoTraits);
      gl!.uniform2f(uTraits.taille, largeur, hauteur);
      gl!.uniform2f(uTraits.centre, centreNuage.x * largeur, centreNuage.y * hauteur);
      gl!.uniform2f(uTraits.origine, etat.centre.x * largeur, etat.centre.y * hauteur);
      gl!.uniform1f(uTraits.rayon, repos.rayon * hauteur);
      gl!.uniform1f(uTraits.eclat, etat.eclat);
      gl!.uniform1f(uTraits.temps, temps);
      gl!.drawArraysInstanced(gl!.TRIANGLES, 0, 6, nombre);
    }
    if (!pret) {
      pret = true;
      options.surPret?.();
    }
  }

  function terminerIntro() {
    introFinie = true;
    nuage = repos.centre;
    if (options.nom) options.nom.style.opacity = "0";
    options.surFinIntro?.();
  }

  function boucle(maintenant: number) {
    image = 0;
    if (arrete) return;
    redimensionner();

    if (!introFinie) {
      const etat = etatEncre(maintenant - (debut ??= maintenant), rayonCouverture(canvas.width, canvas.height), repos);
      if (options.nom) options.nom.style.opacity = String(etat.opaciteNom);
      // Pendant l'éclatement, le nuage naît à sa place de repos.
      dessiner(etat, repos.centre, maintenant);
      if (etat.terminee) terminerIntro();
      demanderImage();
      return;
    }

    nuage = suivre(nuage, cibleNuage(pointeur, repos.centre));
    dessiner(etatNuage(repos), nuage, maintenant);
    // Le nuage respire : on dessine tant que le haut de page est à l'écran et l'onglet visible.
    demanderImage();
  }
```

Dans l'objet renvoyé, `suivreSouris(point) { … souris = point; … }` devient :

```ts
    suivrePointeur(point) {
      if (arrete) return;
      pointeur = point;
      demanderImage();
    },
```

Remplacer la fonction `compiler` par une version paramétrée, et ajouter `attribut` à côté :

```ts
function compiler(gl: WebGL2RenderingContext, sourceSommet: string, sourceFragment: string): WebGLProgram | null {
  const sommet = shader(gl, gl.VERTEX_SHADER, sourceSommet);
  const fragment = shader(gl, gl.FRAGMENT_SHADER, sourceFragment);
  if (!sommet || !fragment) return null;

  const programme = gl.createProgram();
  gl.attachShader(programme, sommet);
  gl.attachShader(programme, fragment);
  gl.linkProgram(programme);
  if (!gl.getProgramParameter(programme, gl.LINK_STATUS)) {
    // Avertissement et non erreur : le repli prend le relais.
    console.warn("[encre] Édition des liens du shader impossible :", gl.getProgramInfoLog(programme));
    return null;
  }
  return programme;
}

/** Branche l'attribut `nom` sur le tampon courant : `diviseur` 1, une valeur par trait (instance). */
function attribut(gl: WebGL2RenderingContext, programme: WebGLProgram, nom: string, taille: number, diviseur: number) {
  const position = gl.getAttribLocation(programme, nom);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, taille, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(position, diviseur);
}
```

- [ ] **Étape 7 : `IntroEncre.tsx` (renommage seul)** — `moteur?.suivreSouris({` devient
  `moteur?.suivrePointeur({` ; supprimer la ligne `tactile: window.matchMedia("(pointer: coarse)").matches,`. Dans
  `IntroEncre.test.tsx`, le faux moteur `suivreSouris: vi.fn()` devient `suivrePointeur: vi.fn()`, et
  `expect(moteur.suivreSouris)` devient `expect(moteur.suivrePointeur)` ; l'attente
  `toMatchObject({ intro: true, tactile: false })` devient `toMatchObject({ intro: true })`.

- [ ] **Étape 8 : lancer, constater le succès** — `pnpm --filter web exec vitest run lib/encre components/accueil --reporter=dot`
  puis `pnpm --filter web typecheck` → verts, aucune erreur de type.

- [ ] **Étape 9 : commit**

```bash
git add apps/web/lib/encre/chronologie.ts
git add apps/web/lib/encre/chronologie.test.ts
git add apps/web/lib/encre/shader.ts
git add apps/web/lib/encre/moteur.ts
git add apps/web/lib/encre/moteur.test.ts
git add apps/web/components/accueil/IntroEncre.tsx
git add apps/web/components/accueil/IntroEncre.test.tsx
git commit -m "Encre : la goutte éclate en un nuage de traits qui suit le pointeur (rendu instancié)"
```

---

### Tâche 3 : suivre le doigt, oublier le pointeur

**Fichiers :** modifier `apps/web/components/accueil/IntroEncre.tsx`, `apps/web/components/accueil/IntroEncre.test.tsx`.

**Interfaces consommées :** `Moteur.suivrePointeur` (tâche 2).

- [ ] **Étape 1 : tests** — ajouter dans `describe("IntroEncre", …)` de `IntroEncre.test.tsx` :

```ts
  describe("pointeur", () => {
    beforeEach(() => {
      vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
        left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);
    });

    async function monter() {
      navigateur();
      render(<IntroEncre />);
      await waitFor(() => expect(creerMoteur).toHaveBeenCalled());
    }

    function pointeur(type: string, x: number, y: number) {
      const evenement = new MouseEvent("pointermove", { clientX: x, clientY: y });
      Object.defineProperty(evenement, "pointerType", { value: type });
      window.dispatchEvent(evenement);
    }

    it("suit la souris en fractions du canvas", async () => {
      await monter();
      pointeur("mouse", 50, 25);
      expect(moteur.suivrePointeur).toHaveBeenLastCalledWith({ x: 0.25, y: 0.25 });
    });

    // Review Focus 3
    it("oublie la souris quand elle quitte la fenêtre : le nuage revient à sa place", async () => {
      await monter();
      pointeur("mouse", 50, 25);
      fireEvent.mouseLeave(document.documentElement);
      expect(moteur.suivrePointeur).toHaveBeenLastCalledWith(null);
    });

    // Review Focus 2
    it("suit le doigt pendant le toucher et le glisser, puis revient au lâcher", async () => {
      await monter();
      fireEvent.touchStart(window, { touches: [{ clientX: 100, clientY: 50 }] });
      expect(moteur.suivrePointeur).toHaveBeenLastCalledWith({ x: 0.5, y: 0.5 });
      fireEvent.touchMove(window, { touches: [{ clientX: 150, clientY: 75 }] });
      expect(moteur.suivrePointeur).toHaveBeenLastCalledWith({ x: 0.75, y: 0.75 });
      fireEvent.touchEnd(window, { touches: [] });
      expect(moteur.suivrePointeur).toHaveBeenLastCalledWith(null);
    });

    it("ignore les événements de pointeur tactiles (le doigt passe par les événements touch)", async () => {
      await monter();
      pointeur("touch", 50, 25);
      expect(moteur.suivrePointeur).not.toHaveBeenCalled();
    });
  });
```

(`vi.restoreAllMocks()` dans le `afterEach` existant défait l'espion ; sinon l'y ajouter.)

- [ ] **Étape 2 : lancer, constater l'échec** — `pnpm --filter web exec vitest run components/accueil/IntroEncre.test.tsx --reporter=dot`
  → 3 échecs (sortie de fenêtre, doigt, pointeur tactile) ; « suit la souris » passe déjà.

- [ ] **Étape 3 : implémentation** — dans l'effet `[mode, tour]` d'`IntroEncre.tsx`, remplacer `suivre` par :

```ts
    /** Pointeur en (x, y) px de la fenêtre, transmis en fractions du canvas. */
    const viser = (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cadre = canvas.getBoundingClientRect();
      moteur?.suivrePointeur({ x: (x - cadre.left) / cadre.width, y: (y - cadre.top) / cadre.height });
    };
    // Le doigt passe par `touchstart` / `touchmove`, qui continuent pendant le
    // défilement (les événements de pointeur s'y arrêtent : `pointercancel`).
    const suivreSouris = (evenement: PointerEvent) => {
      if (evenement.pointerType !== "touch") viser(evenement.clientX, evenement.clientY);
    };
    const suivreDoigt = (evenement: TouchEvent) => {
      const doigt = evenement.touches[0];
      if (doigt) viser(doigt.clientX, doigt.clientY);
    };
    /** Souris sortie de la fenêtre, doigt levé : le nuage revient à sa place. */
    const oublier = () => moteur?.suivrePointeur(null);
```

et les abonnements / désabonnements :

```ts
    window.addEventListener("pointermove", suivreSouris, { passive: true });
    window.addEventListener("touchstart", suivreDoigt, { passive: true });
    window.addEventListener("touchmove", suivreDoigt, { passive: true });
    window.addEventListener("touchend", oublier);
    window.addEventListener("touchcancel", oublier);
    document.documentElement.addEventListener("mouseleave", oublier);
```

```ts
      window.removeEventListener("pointermove", suivreSouris);
      window.removeEventListener("touchstart", suivreDoigt);
      window.removeEventListener("touchmove", suivreDoigt);
      window.removeEventListener("touchend", oublier);
      window.removeEventListener("touchcancel", oublier);
      document.documentElement.removeEventListener("mouseleave", oublier);
```

- [ ] **Étape 4 : lancer, constater le succès** — même commande → verts.
- [ ] **Étape 5 : commit**

```bash
git add apps/web/components/accueil/IntroEncre.tsx
git add apps/web/components/accueil/IntroEncre.test.tsx
git commit -m "Encre : le nuage suit aussi le doigt, et revient à sa place quand le pointeur s'en va"
```

---

### Tâche 4 : nuage figé en repli, fin du halo CSS

**Fichiers :** créer `apps/web/components/accueil/NuageFige.tsx`, `apps/web/components/accueil/NuageFige.test.tsx` ;
supprimer `apps/web/components/accueil/HaloCss.tsx` ; modifier `IntroEncre.tsx`, `Accueil.tsx`, `app/globals.css`,
`lib/encre/decision.ts` (+ test), `lib/commandes/contexte.ts`, `components/commandes/PaletteCommandes.test.tsx`,
`components/accueil/IntroEncre.test.tsx`, `components/accueil/IntroEncre.import.test.tsx`, `e2e/replis.spec.ts`,
`e2e/sans-js.spec.ts`, `e2e/intro.spec.ts`, `e2e/outils.ts` (commentaire).

**Interfaces produites :** `NuageFige()` ; `IntroEncre({ repli }: { repli?: ReactNode })` ;
`ModeEncre = "intro" | "nuage-anime" | "nuage-fige"`.

- [ ] **Étape 1 : test du composant**

```tsx
// apps/web/components/accueil/NuageFige.test.tsx
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NuageFige } from "./NuageFige";
import { COULEURS_NUAGE } from "@/lib/encre/nuage";

describe("NuageFige", () => {
  it("dessine le nuage au repos en SVG décoratif, en quelques chemins", () => {
    const { container } = render(<NuageFige />);
    const svg = container.querySelector("svg.nuage-fige")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox", "-200 -200 400 400");
    const chemins = svg.querySelectorAll("path");
    expect(chemins.length).toBeGreaterThan(0);
    expect(chemins.length).toBeLessThanOrEqual(16);
    for (const chemin of chemins) expect(COULEURS_NUAGE).toContain(chemin.getAttribute("stroke"));
  });
});
```

- [ ] **Étape 2 : lancer, constater l'échec** — `pnpm --filter web exec vitest run components/accueil/NuageFige.test.tsx --reporter=dot`
  → module introuvable.

- [ ] **Étape 3 : composant**

```tsx
// apps/web/components/accueil/NuageFige.tsx
import { nuageFige } from "@/lib/encre/nuage";

/**
 * Nuage de traits figé (`.nuage-fige` dans app/globals.css) : rendu au serveur,
 * présent dans le HTML dès la première réponse. Il suffit sans JavaScript, avec
 * le mouvement réduit ou quand WebGL échoue, et sert d'image d'attente avant le
 * moteur. Passé en prop à IntroEncre (composant client), il n'est jamais
 * recalculé dans le navigateur.
 */
export function NuageFige() {
  return (
    <svg className="nuage-fige" viewBox="-200 -200 400 400" aria-hidden="true" focusable="false">
      {nuageFige().map((groupe) => (
        <path
          key={`${groupe.couleur}-${groupe.opacite}`}
          d={groupe.chemin}
          fill="none"
          stroke={groupe.couleur}
          strokeOpacity={groupe.opacite}
          strokeWidth={1.25}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
```

`strokeWidth` 1,25 = 2 px CSS dans ce repère (rayon 100 pour 160 px).

- [ ] **Étape 4 : branchement**
  - `Accueil.tsx` : `import { NuageFige } from "./NuageFige";` et `<IntroEncre />` devient `<IntroEncre repli={<NuageFige />} />`.
  - `IntroEncre.tsx` : supprimer `import { HaloCss } from "./HaloCss";` ; ajouter `import { type ReactNode, useEffect, useRef, useState } from "react";`
    (à la place de l'import React existant) ; `export function IntroEncre() {` devient
    `export function IntroEncre({ repli }: { repli?: ReactNode }) {` ; `<HaloCss />` devient `{repli}` ; dans le
    commentaire du composant, « c'est un simple halo CSS » devient « c'est le nuage figé (`repli`) », et la liste
    `data-mode : intro | halo-anime | halo-css` devient `data-mode : intro | nuage-anime | nuage-fige`.
    Remplacer chaque `"halo-css"` par `"nuage-fige"` (état initial, `echouer`, `rejouer`, `if (mode === …)`).
  - `git rm apps/web/components/accueil/HaloCss.tsx`.
  - `lib/encre/decision.ts` : `ModeEncre = "intro" | "nuage-anime" | "nuage-fige"` ; `"halo-css"` → `"nuage-fige"`,
    `"halo-anime"` → `"nuage-anime"`. Même remplacement dans `decision.test.ts` (libellés « halo animé » →
    « nuage animé », « halo CSS » → « nuage figé »), `IntroEncre.test.tsx`, `IntroEncre.import.test.tsx`,
    `PaletteCommandes.test.tsx`, `lib/commandes/contexte.ts` (code et commentaire : « intro ou nuage animé, pas
    le nuage figé du mouvement réduit ou sans WebGL »).

- [ ] **Étape 5 : CSS** — dans `app/globals.css`, remplacer le commentaire « Halo final de l'intro … » et les règles
  `.halo-css` et `.fond-accueil[data-encre="actif"] .halo-css` (avec leur commentaire) par :

```css
/* Nuage figé (components/accueil/NuageFige.tsx), à la place de repos du
   nuage : même calcul que reposNuage dans lib/encre/chronologie.ts. Centré à
   80 % de la colonne de contenu (90rem au plus) ; son rayon (0,2 de la hauteur
   d'écran, plafonnée à 61rem) vaut 100 unités du SVG, qui en couvre 400. */
.nuage-fige {
  position: absolute;
  left: calc((100% - min(100%, 90rem)) / 2 + 0.8 * min(100%, 90rem));
  top: calc(0.24 * min(100svh, 61rem));
  width: calc(0.8 * min(100svh, 61rem));
  height: calc(0.8 * min(100svh, 61rem));
  translate: -50% -50%;
  overflow: visible;
  transition: opacity 0.3s ease-out;
}

/* Le canvas dessine le nuage : la copie figée s'efface en fondu. */
.fond-accueil[data-encre="actif"] .nuage-fige {
  opacity: 0;
}
```

- [ ] **Étape 6 : e2e** —
  - `e2e/replis.spec.ts` : partout, `"halo-css"` → `"nuage-fige"` et `.halo-css` → `.nuage-fige` ; libellés
    « halo CSS » → « nuage figé ». Le test « halo CSS aux couleurs de la charte (corail bordé de rose) » devient :

```ts
  test("nuage figé aux couleurs de la charte", async ({ page }) => {
    await page.goto("/");
    const couleurs = await page.locator(".nuage-fige path").evaluateAll((chemins) => chemins.map((c) => c.getAttribute("stroke")));
    expect(new Set(couleurs)).toEqual(new Set(["#eab595", "#d87f81", "#ae6378", "#b9a3b0"]));
  });
```

  - `e2e/sans-js.spec.ts` : `.halo-css` → `.nuage-fige`.
  - `e2e/intro.spec.ts` : test « première visite : l'intro se joue puis devient le halo » → « … puis devient le
    nuage » ; test « … pas d'intro, halo animé » → « … pas d'intro, nuage animé » avec `"nuage-anime"`.
  - `e2e/outils.ts` : « garde le halo CSS » → « garde le nuage figé ».

- [ ] **Étape 7 : vérifier qu'il ne reste rien du halo** —
  `grep -rn "halo" apps/web/app apps/web/components apps/web/lib apps/web/e2e`
  → seulement le commentaire de `e2e/charte.spec.ts` (vignette de partage, hors périmètre) et la phrase
  « place de l'ancien halo » de `chronologie.ts` / `globals.css`.

- [ ] **Étape 8 : lancer** — `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run --reporter=dot`
  puis `pnpm --filter web typecheck` et `pnpm --filter web lint` → verts.

- [ ] **Étape 9 : commit**

```bash
git add apps/web/components/accueil/NuageFige.tsx
git add apps/web/components/accueil/NuageFige.test.tsx
git add apps/web/components/accueil/HaloCss.tsx
git add apps/web/components/accueil/IntroEncre.tsx
git add apps/web/components/accueil/IntroEncre.test.tsx
git add apps/web/components/accueil/IntroEncre.import.test.tsx
git add apps/web/components/accueil/Accueil.tsx
git add apps/web/app/globals.css
git add apps/web/lib/encre/decision.ts
git add apps/web/lib/encre/decision.test.ts
git add apps/web/lib/commandes/contexte.ts
git add apps/web/components/commandes/PaletteCommandes.test.tsx
git add apps/web/e2e/replis.spec.ts
git add apps/web/e2e/sans-js.spec.ts
git add apps/web/e2e/intro.spec.ts
git add apps/web/e2e/outils.ts
git commit -m "Encre : le nuage figé en SVG remplace le halo CSS en repli"
```

---

### Tâche 5 : vérifications, budgets et réglage visuel

- [ ] **Étape 1 : build et budgets** —
  `./docs/superpowers/plans/easter-eggs/court.sh bash -c 'pnpm --filter web build && pnpm --filter web verifier-taille-encre && pnpm --filter web verifier-accueil-statique'`
  → build OK ; « moteur … sous 10 Ko » ; « Pages prérendues : /, /coulisses : OK ».
  Si le moteur dépasse 10 Ko : ruling (alléger les commentaires des shaders, qui partent dans le morceau de JS,
  avant toute autre chose).

- [ ] **Étape 2 : e2e de l'encre** —
  `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec playwright test e2e/intro.spec.ts e2e/accueil.spec.ts e2e/replis.spec.ts e2e/sans-js.spec.ts e2e/accessibilite.spec.ts --reporter=line`
  → tout passe (les tests qui demandent une base de données restent ignorés).

- [ ] **Étape 3 : captures** — script jetable dans le scratchpad (pas dans le dépôt), sur le `next dev` d'Augustin
  (port 3000), GPU simulé comme `simulerGpu` :
  - ordinateur 1280 × 800 : à 2,95 s de l'intro (milieu de l'éclatement), puis souris près de la place de repos,
    puis souris en bas à gauche (sous le titre) ;
  - téléphone 390 × 844 : nuage au repos.
  Regarder chaque capture : traits nets de 2 px, couleurs de la charte, vide au centre, titre lisible, éclatement
  visible. Réglages permis sans nouvelle relecture (chacun en ruling) : rayon `PLACE.rayon`, poussée (14 px),
  opacité max (0,9), amplitude de respiration (0,08). Tout réglage fait dans le shader est reporté dans
  `nuage.ts` (`opaciteTrait`, `nuageFige`) pour que le nuage figé reste identique.

- [ ] **Étape 4 : suite complète** —
  `./docs/superpowers/plans/easter-eggs/court.sh bash -c 'pnpm --filter web --filter realtime lint && pnpm typecheck && pnpm test'`
  → verts.

- [ ] **Étape 5 : commit des réglages éventuels**, fichiers nommés un par un, message
  « Encre : réglages du nuage après captures (…) ».

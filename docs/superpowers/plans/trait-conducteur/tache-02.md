# Tâche 02 — Le trait dans la page (module DOM) et son budget

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **medium** (avec la tâche 03, même conversation).
> Commandes depuis la racine du dépôt. Termine par le compte rendu de `contexte.md`.

Spec : sections 3.2 (points de passage), 4.2 à 4.5 (allumages, recalcul, intro, arrêt), 5 (rendu) et 7 (budgets).

`trait-conducteur.ts` lit les points de passage dans la page, pose un calque SVG par-dessus, allonge le trait au défilement et pose `data-allumee` sur ce qu'il dépasse. C'est le morceau de JS chargé à part (tâche 03) : il n'importe que `./trace` et `./progression`. Le script de taille vérifie qu'il reste sous 6 Ko compressés.

Prérequis : la tâche 01 est commitée (`apps/web/lib/trait/trace.ts` existe).

**Files:**
- Create: `apps/web/lib/trait/trait-conducteur.ts`, `apps/web/lib/trait/trait-conducteur.test.ts`
- Modify (remplacé en entier) : `apps/web/scripts/verifier-taille-defilement.mjs`

**Interfaces:**
- Consumes : `tracer`, `Reperes`, `Trace`, `Cible`, `Boite` (`./trace`) ; `longueurPour`, `pointA` (`./progression`).
- Produces : `MARQUEUR_TRAIT = "trait-conducteur:v1"`, `lireReperes(): Reperes | null`, `demarrerTrait(): () => void`.
- Attributs lus dans la page : `[data-trait="logo"]` (liens des logos) et `[data-trait="envoi"]` (bouton d'envoi), posés par la tâche 03 ; `.methode-frise`, `.methode-etape`, `.methode-noeud`, `.methode-fil`, `.fond-accueil[data-intro]`, `#realisations`, `#methode h2`, `#contact`.
- Classes posées : `.trait-calque` (avec `data-variante`), `.trait-halo`, `.trait-ligne`, `.trait-tete` (CSS : tâche 04) ; `data-trait` sur la frise quand le trait prend la main.

- [ ] **Step 1: Test (échoue)**

`apps/web/lib/trait/trait-conducteur.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demarrerTrait, lireReperes } from "./trait-conducteur";

/** Une frise de cinq étapes, armée par FriseMethode (`data-animation`). */
function frise({ allumee = false } = {}) {
  document.body.innerHTML = `
    <div class="fond-accueil"></div>
    <div class="methode-frise" data-animation>
      ${[0, 1, 2, 3, 4].map((i) => `<li class="methode-etape" ${allumee && i === 0 ? "data-allumee" : ""}><span class="methode-noeud"></span></li>`).join("")}
    </div>`;
  return document.querySelector<HTMLElement>(".methode-frise")!;
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("lireReperes", () => {
  it("ne renvoie rien quand un point de passage manque", () => {
    frise();
    expect(lireReperes()).toBeNull();
  });
});

describe("demarrerTrait", () => {
  it("pose un calque décoratif, caché tant que les points de passage manquent, et le retire à l'arrêt", async () => {
    frise();
    const arreter = demarrerTrait();
    const calque = document.querySelector<HTMLElement>(".trait-calque")!;
    expect(calque.getAttribute("aria-hidden")).toBe("true");
    await new Promise((fin) => requestAnimationFrame(fin));
    expect(calque.hidden).toBe(true);
    arreter();
    expect(document.querySelector(".trait-calque")).toBeNull();
  });

  it("prend la main sur une Méthode qui attend son allumage, et la rend à l'arrêt", () => {
    const f = frise();
    const arreter = demarrerTrait();
    expect(f.hasAttribute("data-trait")).toBe(true);
    arreter();
    expect(f.hasAttribute("data-trait")).toBe(false);
  });

  it("laisse une Méthode déjà allumée telle quelle", () => {
    const f = frise({ allumee: true });
    const arreter = demarrerTrait();
    expect(f.hasAttribute("data-trait")).toBe(false);
    arreter();
  });

  it("se cache pendant l'intro", async () => {
    frise();
    const fond = document.querySelector(".fond-accueil")!;
    fond.setAttribute("data-intro", "en-cours");
    const arreter = demarrerTrait();
    const calque = document.querySelector<HTMLElement>(".trait-calque")!;
    expect(calque.style.opacity).toBe("0");
    fond.setAttribute("data-intro", "terminee");
    await Promise.resolve();
    expect(calque.style.opacity).toBe("");
    arreter();
  });
});
```

Run: `./docs/superpowers/plans/trait-conducteur/court.sh pnpm --filter web exec vitest run lib/trait/trait-conducteur.test.ts --reporter=dot`
Expected: FAIL — `Failed to resolve import "./trait-conducteur"`.

- [ ] **Step 2: Le module**

`apps/web/lib/trait/trait-conducteur.ts` :

```ts
/**
 * Le trait conducteur de l'accueil (spec docs/superpowers/specs/2026-10-14-trait-conducteur-design.md) :
 * un calque SVG par-dessus la page, dont le trait s'allonge avec le défilement et allume au passage les
 * étapes de la Méthode, les logos du parcours puis le bouton d'envoi. Chargé à part, après l'affichage
 * (components/accueil/TraitConducteur.tsx).
 *
 * Les points de passage sont lus dans la page (sélecteurs écrits ici en clair : importer `data/` ferait
 * un morceau de JS de plus). Aucune lecture de position pendant le défilement : seulement aux recalculs.
 */
import { longueurPour, pointA } from "./progression";
import { tracer, type Boite, type Cible, type Reperes, type Trace } from "./trace";

/** Repère ce morceau de JS dans le build (scripts/verifier-taille-defilement.mjs). */
export const MARQUEUR_TRAIT = "trait-conducteur:v1";

const SVG = "http://www.w3.org/2000/svg";
/** La tête suit cette ligne de l'écran, à partir du haut. */
const LIGNE_DE_LECTURE = 0.66;

function boite(el: Element): Boite {
  const r = el.getBoundingClientRect();
  return { gauche: r.left + scrollX, haut: r.top + scrollY, droite: r.right + scrollX, bas: r.bottom + scrollY };
}

/** Repères mesurés dans la page, ou null s'il en manque un : pas de trait. */
export function lireReperes(): Reperes | null {
  const accroche = document.querySelector('section[aria-labelledby="accroche-titre"]');
  const realisations = document.getElementById("realisations");
  const titreMethode = document.querySelector("#methode h2");
  const fil = document.querySelector(".methode-fil");
  const noeuds = [...document.querySelectorAll(".methode-noeud")];
  const logos = [...document.querySelectorAll('[data-trait="logo"] img')];
  const envoi = document.querySelector('[data-trait="envoi"]');
  if (!accroche || !realisations || !titreMethode || !fil || noeuds.length !== 5 || !envoi) return null;

  const ordinateur = window.matchMedia("(width >= 64rem)").matches;
  const f = boite(fil);
  const r = boite(realisations);
  return {
    largeur: document.documentElement.clientWidth,
    hauteurEcran: window.innerHeight,
    ordinateur,
    marge: titreMethode.getBoundingClientRect().left,
    departY: boite(accroche).bas,
    realisationsY: (r.haut + r.bas) / 2,
    noeuds: noeuds.map((n) => {
      const b = boite(n);
      return { x: (b.gauche + b.droite) / 2, y: (b.haut + b.bas) / 2 };
    }),
    fil: ordinateur
      ? { debut: { x: f.gauche, y: (f.haut + f.bas) / 2 }, fin: { x: f.droite, y: (f.haut + f.bas) / 2 } }
      : { debut: { x: (f.gauche + f.droite) / 2, y: f.haut }, fin: { x: (f.gauche + f.droite) / 2, y: f.bas } },
    logos: logos.map((l) => {
      const b = boite(l);
      return { x: (b.gauche + b.droite) / 2, y: (b.haut + b.bas) / 2, r: (b.droite - b.gauche) / 2 };
    }),
    envoi: boite(envoi),
  };
}

/** Démarre le trait ; renvoie la fonction qui l'arrête et retire son calque (les allumages restent). */
export function demarrerTrait(): () => void {
  const calque = document.createElement("div");
  calque.className = "trait-calque";
  calque.setAttribute("aria-hidden", "true");
  const svg = document.createElementNS(SVG, "svg");
  // Le halo est un second tracé, plus large : un filtre (flou) sur un trait de toute la page ferait
  // redessiner une immense zone à chaque image et diviserait la fluidité par quatre.
  const halo = document.createElementNS(SVG, "path");
  halo.setAttribute("class", "trait-halo");
  const ligne = document.createElementNS(SVG, "path");
  ligne.setAttribute("class", "trait-ligne");
  const tete = document.createElementNS(SVG, "circle");
  tete.setAttribute("class", "trait-tete");
  tete.setAttribute("r", "4");
  svg.append(halo, ligne, tete);
  calque.append(svg);
  document.body.append(calque);

  // La Méthode : le trait n'en prend la main que si elle attend encore son allumage.
  const frise = document.querySelector<HTMLElement>(".methode-frise");
  const methodeGeree = !!frise?.hasAttribute("data-animation") && !frise.querySelector("[data-allumee]");
  if (methodeGeree) frise!.setAttribute("data-trait", "");

  function element(cible: Cible): Element | null | undefined {
    if (cible.type === "envoi") return document.querySelector('[data-trait="envoi"]');
    if (cible.type === "logo") return document.querySelectorAll('[data-trait="logo"]')[cible.indice];
    return methodeGeree ? frise!.querySelectorAll(".methode-etape")[cible.indice] : null;
  }

  let trace: Trace | null = null;

  function mettreAJour() {
    if (!trace) return;
    const l = longueurPour(scrollY + innerHeight * LIGNE_DE_LECTURE, trace.reperes);
    halo.style.strokeDashoffset = ligne.style.strokeDashoffset = String(trace.longueur - l);
    const p = pointA(l, trace.echantillons, trace.longueur);
    tete.setAttribute("transform", `translate(${p.x} ${p.y})`);
    tete.style.visibility = l > 0 ? "" : "hidden";
    for (const { l: seuil, cible } of trace.allumables) {
      if (l < seuil) break;
      const el = element(cible);
      if (el && !el.hasAttribute("data-allumee")) {
        el.setAttribute("data-allumee", "");
        if (cible.type === "etape" && cible.indice === 4) frise!.setAttribute("data-complete", "");
      }
    }
  }

  function recalculer() {
    const reperes = lireReperes();
    trace = reperes ? tracer(reperes) : null;
    calque.hidden = !trace;
    if (!trace) return;
    const contact = document.getElementById("contact");
    const hauteur = contact ? boite(contact).bas : trace.echantillons.at(-1)!.y + 100;
    calque.style.height = `${hauteur}px`;
    calque.dataset.variante = trace.variante;
    svg.setAttribute("width", String(reperes!.largeur));
    svg.setAttribute("height", String(hauteur));
    for (const chemin of [halo, ligne]) {
      chemin.setAttribute("d", trace.d);
      chemin.setAttribute("pathLength", String(trace.longueur));
      chemin.style.strokeDasharray = `${trace.longueur} ${trace.longueur}`;
    }
  }

  // Une seule mise à jour par image ; un recalcul la précède quand la mise en page a changé.
  let image = 0;
  let aRecalculer = true;
  const demander = (recalcul = false) => {
    aRecalculer ||= recalcul;
    image ||= requestAnimationFrame(() => {
      image = 0;
      if (aRecalculer) {
        aRecalculer = false;
        recalculer();
      }
      mettreAJour();
    });
  };
  const surDefilement = () => demander();
  const surMiseEnPage = () => demander(true);

  addEventListener("scroll", surDefilement, { passive: true });
  addEventListener("resize", surMiseEnPage);
  const observateurTaille = new ResizeObserver(surMiseEnPage);
  observateurTaille.observe(document.body);
  document.fonts?.ready.then(surMiseEnPage, () => {});

  // Pendant l'intro (et quand on la rejoue), le trait se cache.
  const fond = document.querySelector(".fond-accueil");
  const suivreIntro = () => {
    calque.style.opacity = fond?.getAttribute("data-intro") === "en-cours" ? "0" : "";
  };
  const observateurIntro = new MutationObserver(suivreIntro);
  if (fond) observateurIntro.observe(fond, { attributes: true, attributeFilter: ["data-intro"] });
  suivreIntro();
  demander(true);

  return () => {
    cancelAnimationFrame(image);
    removeEventListener("scroll", surDefilement);
    removeEventListener("resize", surMiseEnPage);
    observateurTaille.disconnect();
    observateurIntro.disconnect();
    calque.remove();
    frise?.removeAttribute("data-trait");
  };
}
```

Run: `./docs/superpowers/plans/trait-conducteur/court.sh pnpm --filter web exec vitest run lib/trait --reporter=dot`
Expected: PASS — 3 fichiers, 27 tests.

- [ ] **Step 3: Le script de taille**

Remplacer **tout** le contenu de `apps/web/scripts/verifier-taille-defilement.mjs` par :

```js
/**
 * Vérifie que les morceaux de JS chargés après l'affichage pour le défilement restent sous leur budget
 * compressé : le défilement doux (Lenis, 8 Ko) et le trait conducteur de l'accueil (6 Ko). Chaque morceau
 * est repéré par son marqueur : `MARQUEUR_DEFILEMENT` de lib/defilement-lenis.ts, `MARQUEUR_TRAIT` de
 * lib/trait/trait-conducteur.ts.
 *
 * Usage : pnpm --filter web verifier-taille-defilement (après pnpm build)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const MORCEAUX = [
  { nom: "Défilement doux", marqueur: "defilement-lenis:v1", limite: 8 * 1024 },
  { nom: "Trait conducteur", marqueur: "trait-conducteur:v1", limite: 6 * 1024 },
];
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const dossier = join(app, ".next/static/chunks");

function* fichiersJs(chemin) {
  for (const nom of readdirSync(chemin)) {
    const complet = join(chemin, nom);
    if (statSync(complet).isDirectory()) yield* fichiersJs(complet);
    else if (nom.endsWith(".js")) yield complet;
  }
}

if (!existsSync(dossier)) {
  console.error("Build introuvable (.next/static/chunks) : lancer pnpm build.");
  process.exit(1);
}

const fichiers = [...fichiersJs(dossier)].map((f) => ({ f, texte: readFileSync(f, "utf8") }));
let echec = false;
for (const { nom, marqueur, limite } of MORCEAUX) {
  const trouves = fichiers.filter(({ texte }) => texte.includes(marqueur));
  if (trouves.length !== 1) {
    console.error(`${nom} introuvable ou ambigu (${trouves.length} trouvé(s)) : lancer pnpm build.`);
    echec = true;
    continue;
  }
  const taille = gzipSync(trouves[0].texte).length;
  console.log(`${nom} (${relative(app, trouves[0].f)}) : ${(taille / 1024).toFixed(1)} Ko compressés, limite ${limite / 1024} Ko.`);
  if (taille > limite) echec = true;
}
if (echec) process.exit(1);
```

La commande `pnpm --filter web verifier-taille-defilement` (déjà appelée par la CI) vérifie maintenant les deux morceaux. Elle a besoin d'une build : elle tourne à la tâche 04.

Run: `./docs/superpowers/plans/trait-conducteur/court.sh node --check apps/web/scripts/verifier-taille-defilement.mjs`
Expected: `→ code de sortie 0`.

- [ ] **Step 4: Lint et types**

Run: `./docs/superpowers/plans/trait-conducteur/court.sh bash -c 'pnpm lint && pnpm typecheck'`
Expected: `→ code de sortie 0`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/trait/trait-conducteur.ts apps/web/lib/trait/trait-conducteur.test.ts apps/web/scripts/verifier-taille-defilement.mjs
git commit -m "Trait conducteur : calque SVG, progression au défilement et allumages ; budget de 6 Ko pour son morceau de JS"
```

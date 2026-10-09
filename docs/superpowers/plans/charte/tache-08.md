# Tâche 08 — Retirer l'ancienne charte et la palette Tailwind, garde-fou « rôles seulement »

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **medium**.
> Commandes depuis la racine du worktree. Termine par le compte rendu de `contexte.md`.

**Files:**
- Modify: `apps/web/app/globals.css` (`@theme`)
- Create: `apps/web/lib/charte-classes.test.ts`

**Interfaces:**
- Consumes: `TEINTES` (tâche 2).

- [ ] **Step 1: Écrire le garde-fou**

`apps/web/lib/charte-classes.test.ts` :

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TEINTES } from "./charte";

/**
 * Les composants n'emploient que les rôles de la charte, sans opacité. Tailwind 4
 * ignore en silence une classe dont la couleur n'existe pas : sans ce test, une
 * ancienne classe donnerait un texte sans couleur sur la nuit, sans erreur.
 */
const ANCIENS = ["papier", "encre", "encre-douce", "brique", "braise", "braise-claire", "terre"];
const PALETTE_TAILWIND = [
  "white", "black", "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow",
  "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia",
  "pink", "rose",
];
const INTERDITES = [...new Set([...ANCIENS, ...Object.keys(TEINTES), ...PALETTE_TAILWIND])]
  // Les noms longs d'abord : `encre-douce` avant `encre`.
  .sort((a, b) => b.length - a.length);
const PREFIXES =
  "bg|text|border(?:-[trblxy])?|ring(?:-offset)?|outline|fill|stroke|decoration|divide|from|via|to|shadow|accent|caret|placeholder";
const CLASSE_INTERDITE = new RegExp(
  `(?<![\\w-])(?:[\\w-]+:)*(?:${PREFIXES})-(?:${INTERDITES.join("|")})(?:-\\d{2,3})?(?:/\\d+)?(?![\\w-])`,
  "g",
);
/** Couleur avec opacité (`text-texte/75`) : le contraste n'est plus garanti. */
const OPACITE = /(?<![\w-])(?:[\w-]+:)*(?:bg|text|border|ring|fill|stroke|decoration)-[a-z-]+\/\d+(?![\w-])/g;
/** La sauge n'est jamais du texte : 4,3:1 seulement sur une carte. */
const TEXTE_VIVANT = /(?<![\w-])(?:[\w-]+:)*text-vivant(?![\w-])/g;
/** Variable d'un ancien jeton (`stroke="var(--color-papier)"`). */
const VARIABLE_ANCIENNE = new RegExp(`var\\(--color-(?:${ANCIENS.join("|")})\\)`, "g");

export function classesInterdites(source: string): string[] {
  return [CLASSE_INTERDITE, OPACITE, TEXTE_VIVANT, VARIABLE_ANCIENNE].flatMap((motif) => source.match(motif) ?? []);
}

const racine = fileURLToPath(new URL("..", import.meta.url));
function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.tsx?$/.test(nom) && !chemin.endsWith("charte-classes.test.ts") ? [chemin] : [];
  });
}

describe("classesInterdites", () => {
  it("repère anciens jetons, teintes brutes, palette Tailwind, opacités, text-vivant et anciennes variables", () => {
    expect(
      classesInterdites(
        'className="bg-emerald-600 text-encre-douce hover:text-encre bg-peche ring-offset-papier text-texte/75 text-vivant" stroke="var(--color-papier)"',
      ),
    ).toEqual([
      "bg-emerald-600",
      "text-encre-douce",
      "hover:text-encre",
      "bg-peche",
      "ring-offset-papier",
      "text-texte/75",
      "text-vivant",
      "var(--color-papier)",
    ]);
  });

  it("laisse passer les rôles et les utilitaires sans couleur", () => {
    expect(
      classesInterdites(
        'className="bg-fond text-texte-doux border-trait-fort ring-accent ring-offset-fond text-sm border-t ring-2 text-sur-accent bg-vivant decoration-accent fill-surface stroke-trait" stroke="var(--color-fond)"',
      ),
    ).toEqual([]);
  });
});

describe("app/, components/, lib/", () => {
  it("n'emploient que des rôles de la charte", () => {
    const fautes = ["app", "components", "lib"]
      .flatMap((d) => fichiers(join(racine, d)))
      .flatMap((f) => classesInterdites(readFileSync(f, "utf8")).map((c) => `${f.slice(racine.length)} : ${c}`));
    expect(fautes).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer le garde-fou**

Run: `./docs/superpowers/plans/charte/court.sh pnpm --filter web exec vitest run lib/charte-classes.test.ts --reporter=dot`
Expected: PASS. S'il échoue, chaque ligne donne `fichier : classe` : corriger le composant selon les tableaux des tâches 5 à 7, jamais en élargissant le test. (Un faux positif hors classe, par exemple une chaîne de texte qui contiendrait `text-rose`, se corrige en reformulant le texte.)

- [ ] **Step 3: Retirer l'ancienne charte et la palette par défaut**

Dans `@theme` de `apps/web/app/globals.css` :
- supprimer le commentaire « Ancienne charte « Atelier clair »… » et les sept lignes `--color-papier` à `--color-terre` ;
- ajouter en **première** ligne du bloc :

```css
  /* Seuls les rôles ci-dessous existent : pas de palette par défaut (bg-white…). */
  --color-*: initial;
```

Run:

```bash
grep -rn -- "--color-\(papier\|encre\|brique\|braise\|terre\)" apps/web/app apps/web/components apps/web/lib
./docs/superpowers/plans/charte/court.sh pnpm --filter web exec vitest run lib/charte.test.ts lib/charte-classes.test.ts --reporter=dot
./docs/superpowers/plans/charte/court.sh pnpm build
grep -c "emerald\|--color-white" apps/web/.next/static/chunks/*.css
```

Expected: aucune occurrence ; tests PASS ; build OK ; le dernier `grep` compte `0` pour chaque fichier.

- [ ] **Step 4: Commiter**

```bash
git add apps/web/app/globals.css
git add apps/web/lib/charte-classes.test.ts
git commit -m "Charte : ancienne charte et palette Tailwind retirées, test « rôles seulement »"
```

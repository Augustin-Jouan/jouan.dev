# Tâche 03 — Teintes et rôles dans `globals.css`, sans changement visible

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **low**.
> Commandes depuis la racine du worktree. Termine par le compte rendu de `contexte.md`.

On **ajoute** les teintes et les rôles ; le site garde son apparence (fond papier, anciennes classes) jusqu'à la tâche 5. `html` et `body` ne changent pas ici.

**Files:**
- Modify: `apps/web/app/globals.css` (en-tête et `@theme`)
- Test: `apps/web/lib/charte.test.ts` (concordance)

**Interfaces:**
- Consumes: `TEINTES`, `ROLES` (tâche 2).
- Produces: variables `--teinte-*` et `--color-<rôle>` ; classes de rôles (`bg-fond`, `bg-surface`, `text-texte`, `text-texte-doux`, `text-accent`, `bg-accent`, `text-sur-accent`, `text-alerte`, `border-alerte`, `bg-vivant`, `border-trait`, `border-trait-fort`, `ring-accent`, `ring-offset-fond`, `decoration-trait-fort`, `decoration-accent`, `fill-*`, `stroke-*`…). Les anciens jetons restent jusqu'à la tâche 8.

- [ ] **Step 1: Test de concordance (échoue)**

En tête de `apps/web/lib/charte.test.ts`, ajouter `import { readFileSync } from "node:fs";`, et à la fin du fichier :

```ts
describe("concordance avec app/globals.css", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  it("déclare les mêmes teintes (--teinte-*)", () => {
    const teintes = Object.fromEntries(
      [...css.matchAll(/--teinte-([a-z-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [m[1], m[2]]),
    );
    expect(teintes).toEqual(TEINTES);
  });

  it("déclare les mêmes rôles (--color-* = var(--teinte-*))", () => {
    const roles = Object.fromEntries(
      [...css.matchAll(/--color-([a-z-]+):\s*var\(--teinte-([a-z-]+)\);/g)].map((m) => [m[1], m[2]]),
    );
    expect(roles).toEqual(ROLES);
  });
});
```

Run: `./docs/superpowers/plans/charte/court.sh pnpm --filter web exec vitest run lib/charte.test.ts --reporter=dot`
Expected: FAIL — `expected {} to deeply equal { nuit: '#2a2127', … }`.

- [ ] **Step 2: Ajouter teintes et rôles**

Dans `apps/web/app/globals.css` :

1. Remplacer le commentaire d'en-tête (de `/*\n * Direction « Atelier clair »` jusqu'à son `*/`) par :

```css
/*
 * Charte « Nuit mauve » (docs/superpowers/specs/2026-10-09-charte-design.md).
 *
 * Deux étages :
 * - les teintes brutes, `--teinte-*` sur `:root`, hors de `@theme` : elles ne
 *   donnent aucune classe Tailwind ;
 * - les rôles, seuls jetons `--color-*` de `@theme` : `bg-fond`, `text-texte`,
 *   `text-accent`… Les composants n'emploient que ces rôles, sans opacité.
 * Mêmes valeurs dans lib/charte.ts (moteur de l'intro, vignettes, curseurs),
 * vérifiées par lib/charte.test.ts, comme les contrastes.
 *
 * `--font-inter` et `--font-instrument` sont posées par next/font dans
 * app/layout.tsx. Ne pas nommer un jeton comme une variable next/font : la
 * déclaration serait circulaire.
 */
:root {
  --teinte-nuit: #2a2127;
  --teinte-nuit-haute: #352a31;
  --teinte-mauve: #79616f;
  --teinte-mauve-clair: #b9a3b0;
  --teinte-rose: #ae6378;
  --teinte-corail: #d87f81;
  --teinte-peche: #eab595;
  --teinte-sauge: #7e9680;
  --teinte-papier: #f3efe7;
  --teinte-trait-nuit: #4a3b44;
  --teinte-trait-mauve: #8a7480;
}
```

2. Dans `@theme`, remplacer les huit lignes `--color-papier` à `--color-trait` par :

```css
  --color-fond: var(--teinte-nuit);
  --color-surface: var(--teinte-nuit-haute);
  --color-texte: var(--teinte-papier);
  --color-texte-doux: var(--teinte-mauve-clair);
  --color-accent: var(--teinte-peche);
  --color-sur-accent: var(--teinte-nuit);
  --color-alerte: var(--teinte-corail);
  --color-vivant: var(--teinte-sauge);
  --color-trait: var(--teinte-trait-nuit);
  --color-trait-fort: var(--teinte-trait-mauve);
  --color-lueur: var(--teinte-corail);
  --color-lueur-chaude: var(--teinte-rose);
  --color-goutte: var(--teinte-peche);

  /* Ancienne charte « Atelier clair » : retirée à la tâche 8 du plan, une fois
     toutes les pages passées aux rôles. */
  --color-papier: #f3efe7;
  --color-encre: #1b1a17;
  --color-encre-douce: #5b574f;
  --color-brique: #c84a1f;
  --color-braise: #e0582b;
  --color-braise-claire: #ef9c62;
  --color-terre: #8a5a3c;
```

(L'ancien `--color-trait: #c9c1b2` disparaît : le rôle `trait` garde le même nom, avec la nouvelle valeur. Sur le papier, les traits deviennent plus sombres jusqu'à la tâche 5 : c'est attendu.)

- [ ] **Step 3: Vérifier la concordance**

Run: `./docs/superpowers/plans/charte/court.sh pnpm --filter web exec vitest run lib/charte.test.ts --reporter=dot`
Expected: PASS.

- [ ] **Step 4: Les variables sont émises dans le CSS construit**

Run:

```bash
./docs/superpowers/plans/charte/court.sh pnpm build
grep -ho -- "--teinte-corail:[^;]*\|--color-fond:[^;]*\|--color-trait:[^;]*" apps/web/.next/static/chunks/*.css | sort -u
```

Expected: `--teinte-corail:#d87f81` et `--color-trait:var(--teinte-trait-nuit)` (rôle déjà employé par `border-trait`). Les autres rôles sont émis dès qu'une classe ou un `var()` les emploie (tâches 4 à 7) ; la tâche 4 vérifie le halo et le nom dans le navigateur. Si **aucune** ligne `--teinte-` n'apparaît, s'arrêter : le fichier CSS n'est pas celui servi, chercher le bon (`ls apps/web/.next/static/chunks/*.css`).

- [ ] **Step 5: Commiter**

```bash
git add apps/web/app/globals.css
git add apps/web/lib/charte.test.ts
git commit -m "Charte : teintes et rôles dans globals.css (sans changement visible)"
```

# Tâche 02 — `lib/charte.ts` : teintes, rôles, contrastes

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **low**.
> Commandes depuis la racine du worktree. Termine par le compte rendu de `contexte.md`.

**Files:**
- Create: `apps/web/lib/charte.ts`
- Test: `apps/web/lib/charte.test.ts`

**Interfaces:**
- Produces:
  - `TEINTES` (11 teintes, valeurs des `contexte.md`), `type Teinte = keyof typeof TEINTES`
  - `ROLES` (13 rôles), `type Role = keyof typeof ROLES`
  - `couleur(role: Role): string` — `#rrggbb` minuscule
  - `contraste(a: string, b: string): number` — ratio WCAG 2.x
  - `CONTRASTES_EXIGES: readonly { avant: Role; arriere: Role; minimum: number }[]`

- [ ] **Step 1: Écrire le test qui échoue**

`apps/web/lib/charte.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { CONTRASTES_EXIGES, ROLES, TEINTES, contraste, couleur } from "./charte";

describe("contraste", () => {
  it("donne 21 entre le noir et le blanc, 1 entre deux couleurs identiques", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contraste("#2a2127", "#2a2127")).toBe(1);
  });

  it("ne dépend pas de l'ordre", () => {
    expect(contraste("#f3efe7", "#2a2127")).toBeCloseTo(contraste("#2a2127", "#f3efe7"), 10);
  });

  it("retrouve les ratios de la spec", () => {
    expect(contraste(TEINTES.papier, TEINTES.nuit)).toBeCloseTo(13.61, 1);
    expect(contraste(TEINTES.peche, TEINTES.nuit)).toBeCloseTo(8.58, 1);
    expect(contraste(TEINTES.sauge, TEINTES["nuit-haute"])).toBeCloseTo(4.3, 1);
  });
});

describe("rôles", () => {
  it("renvoient chacun une teinte existante", () => {
    for (const teinte of Object.values(ROLES)) expect(TEINTES).toHaveProperty(teinte);
  });

  it("donnent leur couleur en hexadécimal minuscule", () => {
    expect(couleur("fond")).toBe("#2a2127");
    expect(couleur("accent")).toBe("#eab595");
    expect(couleur("lueur-chaude")).toBe("#ae6378");
    for (const valeur of Object.values(TEINTES)) expect(valeur).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("contrastes exigés", () => {
  it.each(CONTRASTES_EXIGES.map((c) => [c.avant, c.arriere, c.minimum] as const))(
    "%s sur %s atteint %s:1",
    (avant, arriere, minimum) => {
      expect(contraste(couleur(avant), couleur(arriere))).toBeGreaterThanOrEqual(minimum);
    },
  );

  it("couvrent le texte, l'accent, l'alerte et les contours sur le fond et sur les cartes", () => {
    const paires = new Set(CONTRASTES_EXIGES.map((c) => `${c.avant}/${c.arriere}`));
    for (const avant of ["texte", "texte-doux", "accent", "alerte", "trait-fort"] as const) {
      expect(paires).toContain(`${avant}/fond`);
      expect(paires).toContain(`${avant}/surface`);
    }
    expect(paires).toContain("sur-accent/accent");
    expect(paires).toContain("sur-accent/goutte");
    expect(paires).toContain("vivant/surface");
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `./docs/superpowers/plans/charte/court.sh pnpm --filter web exec vitest run lib/charte.test.ts --reporter=dot`
Expected: FAIL — `Failed to resolve import "./charte"`.

- [ ] **Step 3: Implémenter**

`apps/web/lib/charte.ts` :

```ts
/**
 * Charte « Nuit mauve » pour le code qui ne lit pas le CSS : moteur de l'intro,
 * vignettes de partage, curseurs du direct, scène 3D des Coulisses. Mêmes
 * valeurs que app/globals.css (`--teinte-*` sur `:root`, rôles dans `@theme`),
 * ce que vérifie lib/charte.test.ts.
 *
 * Les composants n'emploient que les rôles ; les teintes brutes ne servent qu'à
 * les définir.
 */
export const TEINTES = {
  nuit: "#2a2127",
  "nuit-haute": "#352a31",
  mauve: "#79616f",
  "mauve-clair": "#b9a3b0",
  rose: "#ae6378",
  corail: "#d87f81",
  peche: "#eab595",
  sauge: "#7e9680",
  papier: "#f3efe7",
  "trait-nuit": "#4a3b44",
  "trait-mauve": "#8a7480",
} as const;

export type Teinte = keyof typeof TEINTES;

export const ROLES = {
  fond: "nuit",
  surface: "nuit-haute",
  texte: "papier",
  "texte-doux": "mauve-clair",
  accent: "peche",
  "sur-accent": "nuit",
  alerte: "corail",
  vivant: "sauge",
  trait: "trait-nuit",
  "trait-fort": "trait-mauve",
  lueur: "corail",
  "lueur-chaude": "rose",
  goutte: "peche",
} as const satisfies Record<string, Teinte>;

export type Role = keyof typeof ROLES;

/** Couleur d'un rôle, en `#rrggbb` minuscule. */
export function couleur(role: Role): string {
  return TEINTES[ROLES[role]];
}

/** Ratio de contraste WCAG 2.x entre deux couleurs `#rrggbb` (de 1 à 21). */
export function contraste(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, v, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * v! + 0.0722 * bl!;
  };
  const [claire, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (claire! + 0.05) / (sombre! + 0.05);
}

/**
 * Contrastes exigés : 4,5:1 pour le texte (WCAG 1.4.3), 3:1 pour les contours de
 * champs et de boutons, les pastilles et l'anneau de focus (1.4.11). La sauge
 * (`vivant`) n'est jamais du texte : sur une carte, elle n'atteint que 4,3:1.
 * Le nom de l'intro se lit en `sur-accent` sur la `goutte`.
 */
export const CONTRASTES_EXIGES: readonly { avant: Role; arriere: Role; minimum: number }[] = [
  { avant: "texte", arriere: "fond", minimum: 4.5 },
  { avant: "texte", arriere: "surface", minimum: 4.5 },
  { avant: "texte-doux", arriere: "fond", minimum: 4.5 },
  { avant: "texte-doux", arriere: "surface", minimum: 4.5 },
  { avant: "accent", arriere: "fond", minimum: 4.5 },
  { avant: "accent", arriere: "surface", minimum: 4.5 },
  { avant: "sur-accent", arriere: "accent", minimum: 4.5 },
  { avant: "sur-accent", arriere: "goutte", minimum: 4.5 },
  { avant: "alerte", arriere: "fond", minimum: 4.5 },
  { avant: "alerte", arriere: "surface", minimum: 4.5 },
  { avant: "vivant", arriere: "fond", minimum: 3 },
  { avant: "vivant", arriere: "surface", minimum: 3 },
  { avant: "trait-fort", arriere: "fond", minimum: 3 },
  { avant: "trait-fort", arriere: "surface", minimum: 3 },
];
```

- [ ] **Step 4: Vérifier le succès**

Run: `./docs/superpowers/plans/charte/court.sh pnpm --filter web exec vitest run lib/charte.test.ts --reporter=dot`
Expected: PASS.

- [ ] **Step 5: Commiter**

```bash
grep -cP "[\x{00a0}\x{202f}]" apps/web/lib/charte.ts apps/web/lib/charte.test.ts
git add apps/web/lib/charte.ts
git add apps/web/lib/charte.test.ts
git commit -m "Charte : teintes, rôles et contrastes exigés (lib/charte.ts)"
```

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

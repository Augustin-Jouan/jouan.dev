/**
 * Couleurs du CV en terminal : codes 256 couleurs (`ESC[38;5;<n>m`), compris par
 * tous les terminaux courants (Terminal.app de macOS ignore les couleurs 24 bits).
 * Chaque code est la couleur xterm la plus proche d'un rôle de la charte.
 */
import { couleur, type Role } from "@/lib/charte";

/** Niveaux du cube 6 × 6 × 6 de xterm (indices 16 à 231). */
const NIVEAUX = [0, 95, 135, 175, 215, 255];

/** Couleur RVB d'un indice xterm de 16 à 255 : le cube, puis 24 gris (232 à 255). */
export function rvbXterm(indice: number): [number, number, number] {
  if (indice >= 232) {
    const gris = 8 + 10 * (indice - 232);
    return [gris, gris, gris];
  }
  const n = indice - 16;
  return [NIVEAUX[Math.floor(n / 36)]!, NIVEAUX[Math.floor(n / 6) % 6]!, NIVEAUX[n % 6]!];
}

/**
 * Indice xterm-256 le plus proche d'une couleur `#rrggbb` (distance en RVB),
 * cherché parmi les 240 couleurs fixes : les 16 couleurs système, que chaque
 * terminal redéfinit, sont écartées.
 */
export function versXterm256(hex: string): number {
  const cible = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  let meilleur = 16;
  let distanceMin = Infinity;
  for (let indice = 16; indice < 256; indice++) {
    const distance = rvbXterm(indice).reduce((somme, c, i) => somme + (c - cible[i]!) ** 2, 0);
    if (distance < distanceMin) {
      distanceMin = distance;
      meilleur = indice;
    }
  }
  return meilleur;
}

export type StyleTerminal = "accent" | "attenue" | "souligne";

/** Rôle de la charte de chaque style : titres et bandeau, texte secondaire, adresses. */
export const ROLE_DU_STYLE: Record<StyleTerminal, Role> = {
  accent: "accent",
  attenue: "texte-doux",
  souligne: "texte",
};

const ouverture = (style: StyleTerminal) =>
  `\x1b[${style === "souligne" ? "4;" : ""}38;5;${versXterm256(couleur(ROLE_DU_STYLE[style]))}m`;

/** Séquence qui ouvre chaque style ; `REMISE_A_ZERO` la referme. */
export const SEQUENCES: Record<StyleTerminal, string> = {
  accent: ouverture("accent"),
  attenue: ouverture("attenue"),
  souligne: ouverture("souligne"),
};

export const REMISE_A_ZERO = "\x1b[0m";

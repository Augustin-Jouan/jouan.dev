/**
 * Chronologie de l'intro « goutte de lumière » et du nuage de traits qui lui
 * succède, sans WebGL ni DOM : le moteur l'interroge à chaque image et
 * transmet le résultat aux shaders.
 *
 * Unités : positions en fractions de l'écran (y depuis le haut) ; rayons en
 * hauteurs d'écran.
 */

import { couleur } from "../charte";

export type Rvb = [number, number, number];
export type Point = { x: number; y: number };

export const rvb = (hex: string): Rvb => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

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

/** Rayon qui couvre tout l'écran depuis son centre, avec une marge pour le bord ondulé. */
export function rayonCouverture(largeur: number, hauteur: number): number {
  return Math.hypot(largeur / hauteur / 2, 0.5) * 1.25;
}

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

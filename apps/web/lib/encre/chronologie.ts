/**
 * Chronologie de l'intro « goutte d'encre », sans WebGL ni DOM : le moteur
 * l'interroge à chaque image et transmet le résultat au shader.
 *
 * Unités : positions en fractions de l'écran (y depuis le haut) ; rayons et
 * flou en hauteurs d'écran.
 */

export type Rvb = [number, number, number];
export type Point = { x: number; y: number };

const rvb = (hex: number): Rvb => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

/** Mêmes valeurs que les jetons de app/globals.css. */
export const ENCRE = rvb(0x1b1a17);
export const BRAISE = rvb(0xe0582b);
export const BRAISE_CLAIRE = rvb(0xef9c62);

/** État final de l'intro, partagé avec le halo CSS (`.halo-css` dans app/globals.css). */
export const HALO = { x: 0.8, y: 0.24, rayon: 0.32, flou: 0.2 } as const;

const FIN_ETALEMENT = 450;
const FIN_NOM = 800;
export const DUREE_INTRO = 1500;
/** Bord net de la goutte, avant qu'elle ne se floute en halo. */
const FLOU_NET = 0.004;
const CENTRE: Point = { x: 0.5, y: 0.5 };

export type EtatEncre = {
  centre: Point;
  rayon: number;
  /** Demi-largeur du bord adouci. */
  flou: number;
  couleur: Rvb;
  /** 0 : encre unie ; 1 : dégradé braise du halo. */
  melange: number;
  opaciteNom: number;
  terminee: boolean;
};

const borner = (t: number) => Math.min(1, Math.max(0, t));
const lisser = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * État de l'encre `t` ms après le début de l'intro. `couverture` est le rayon
 * qui couvre tout l'écran depuis son centre (voir `rayonCouverture`).
 */
export function etatEncre(t: number, couverture: number): EtatEncre {
  if (t >= DUREE_INTRO) return etatHalo({ x: HALO.x, y: HALO.y });

  if (t < FIN_ETALEMENT) {
    return {
      centre: CENTRE,
      rayon: couverture * lisser(borner(t / FIN_ETALEMENT)),
      flou: FLOU_NET,
      couleur: ENCRE,
      melange: 0,
      opaciteNom: 0,
      terminee: false,
    };
  }

  if (t < FIN_NOM) {
    return {
      centre: CENTRE,
      rayon: couverture,
      flou: FLOU_NET,
      couleur: ENCRE,
      melange: 0,
      opaciteNom: borner((t - FIN_ETALEMENT) / 150),
      terminee: false,
    };
  }

  const k = lisser(borner((t - FIN_NOM) / (DUREE_INTRO - FIN_NOM)));
  return {
    centre: { x: mix(CENTRE.x, HALO.x, k), y: mix(CENTRE.y, HALO.y, k) },
    rayon: mix(couverture, HALO.rayon, k),
    flou: mix(FLOU_NET, HALO.flou, k),
    couleur: [mix(ENCRE[0], BRAISE[0], k), mix(ENCRE[1], BRAISE[1], k), mix(ENCRE[2], BRAISE[2], k)],
    melange: k,
    opaciteNom: 1 - borner((t - FIN_NOM) / 200),
    terminee: false,
  };
}

/** Le halo au repos, centré sur `centre`. */
export function etatHalo(centre: Point): EtatEncre {
  return {
    centre: { x: centre.x, y: centre.y },
    rayon: HALO.rayon,
    flou: HALO.flou,
    couleur: BRAISE,
    melange: 1,
    opaciteNom: 0,
    terminee: true,
  };
}

/** Rayon qui couvre tout l'écran depuis son centre, avec une marge pour le bord ondulé. */
export function rayonCouverture(largeur: number, hauteur: number): number {
  return Math.hypot(largeur / hauteur / 2, 0.5) * 1.25;
}

/** Cible du halo : sa position de repos, attirée d'un quart vers la souris ; dérive lente au doigt. */
export function cibleHalo(souris: Point | null, temps: number, tactile: boolean): Point {
  if (tactile) {
    return {
      x: HALO.x + 0.03 * Math.sin(temps / 3200),
      y: HALO.y + 0.03 * Math.cos(temps / 4100),
    };
  }
  if (!souris) return { x: HALO.x, y: HALO.y };
  return {
    x: HALO.x + (souris.x - HALO.x) * 0.25,
    y: HALO.y + (souris.y - HALO.y) * 0.25,
  };
}

/** Rapproche `actuel` de `cible` d'une fraction par image : l'inertie du halo. */
export function suivre(actuel: Point, cible: Point, facteur = 0.08): Point {
  return {
    x: actuel.x + (cible.x - actuel.x) * facteur,
    y: actuel.y + (cible.y - actuel.y) * facteur,
  };
}

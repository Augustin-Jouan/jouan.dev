/** Calculs de la vue 3D, sans Three.js (testables) : la scène reprend la disposition large du schéma 2D. */
import { CADRES, type Noeud } from "@/data/architecture";

const ECHELLE = 1 / 60;

/** Position 3D : le plan du schéma large, centré, le chemin de déploiement en retrait. */
export function position3d(n: Noeud): [number, number, number] {
  const p = n.positions.large;
  return [
    (p.x - CADRES.large.largeur / 2) * ECHELLE,
    -(p.y - CADRES.large.hauteur / 2) * ECHELLE,
    n.groupe === "deploiement" ? -3 : 0,
  ];
}

/** Durée, en secondes, du trajet d'un paquet sur une liaison : plus court quand la latence est basse. */
export function periodePaquet(ms: number | null): number {
  if (ms === null) return 1.5;
  return Math.round(Math.min(4, Math.max(0.6, ms / 50)) * 10) / 10;
}

/** Distance de la caméra sur un cadre large : le réglage d'origine, jamais moins. */
export const DISTANCE_MIN = 14;
/** Champ vertical de la caméra, en degrés. */
export const CHAMP_VERTICAL = 45;
/** Demi-taille d'un bloc (2,4 × 0,9), étiquette comprise en hauteur. */
const DEMI_BLOC = { x: 1.2, y: 0.95 };
const MARGE = 1.1;

/**
 * Distance à laquelle la caméra voit toute la scène dans un cadre de rapport
 * `aspect` (largeur / hauteur). Sur mobile, le cadre est haut et étroit : la
 * caméra recule ; sur un cadre large, elle reste à `DISTANCE_MIN`.
 */
export function distanceCamera(noeuds: readonly Noeud[], aspect: number): number {
  const t = Math.tan((CHAMP_VERTICAL * Math.PI) / 360);
  const demiLargeur = Math.max(...noeuds.map((n) => Math.abs(position3d(n)[0]))) + DEMI_BLOC.x;
  const demiHauteur = Math.max(...noeuds.map((n) => Math.abs(position3d(n)[1]))) + DEMI_BLOC.y;
  const necessaire = Math.max(demiLargeur / (t * aspect), demiHauteur / t) * MARGE;
  return Math.max(DISTANCE_MIN, Math.ceil(necessaire * 10) / 10);
}

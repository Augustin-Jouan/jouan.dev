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

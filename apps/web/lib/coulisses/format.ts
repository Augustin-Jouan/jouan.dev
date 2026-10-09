import { derniere, type EtatSerie } from "./magasin";

const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** « 4,3 ms » sous 10 ms, « 43 ms » au-delà ; « … » en attente de mesure. */
export function formaterMs(ms: number | null): string {
  if (ms === null) return "…";
  return `${nombre.format(ms < 10 ? ms : Math.round(ms))}\u00a0ms`;
}

export function texteSerie(s: EtatSerie): string {
  return s.disponible ? formaterMs(derniere(s)) : "indisponible";
}

/**
 * Paliers de durée : changer `animation-duration` d'une animation en cours la
 * fait sauter ; avec quelques paliers, elle ne change que si la latence change vraiment.
 */
const PALIERS_DEFILEMENT = [0.4, 0.8, 1.5, 2.5, 4];

/** Durée d'un cycle des pointillés, en secondes : plus la latence est basse, plus ils vont vite. */
export function dureeDefilement(ms: number | null): number {
  if (ms === null) return 1.5;
  const brute = ms / 25;
  return PALIERS_DEFILEMENT.find((p) => p >= brute) ?? PALIERS_DEFILEMENT.at(-1)!;
}

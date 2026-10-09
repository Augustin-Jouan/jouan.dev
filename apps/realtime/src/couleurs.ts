/**
 * Teintes des curseurs, accordées à la charte « Atelier clair » et lisibles sur
 * le papier (#f3efe7, contraste ≥ 3:1) : brique, braise, terre, encre douce,
 * puis deux complémentaires (sarcelle, ardoise).
 */
export const PALETTE = ["#c84a1f", "#e0582b", "#8a5a3c", "#5b574f", "#2f6f6a", "#3b5b8c"] as const;

/** Une couleur libre au hasard ; si toutes sont prises, la moins utilisée. */
export function choisirCouleur(prises: string[], tirer: () => number = Math.random): string {
  const usages = new Map<string, number>(PALETTE.map((c) => [c, 0]));
  for (const c of prises) if (usages.has(c)) usages.set(c, usages.get(c)! + 1);
  const minimum = Math.min(...usages.values());
  const candidates = PALETTE.filter((c) => usages.get(c) === minimum);
  return candidates[Math.min(Math.floor(tirer() * candidates.length), candidates.length - 1)]!;
}

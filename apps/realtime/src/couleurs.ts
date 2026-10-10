/**
 * Teintes des curseurs, tirées de la charte « Nuit mauve » (apps/web/lib/charte.ts) et
 * lisibles sur la nuit du site (#2a2127, contraste ≥ 3:1) : pêche, corail, sauge,
 * mauve clair, papier, rose. Recopiées ici : le service ne dépend pas d'apps/web.
 */
export const PALETTE = ["#eab595", "#d87f81", "#7e9680", "#b9a3b0", "#f3efe7", "#ae6378"] as const;

/** Une couleur libre au hasard ; si toutes sont prises, la moins utilisée. */
export function choisirCouleur(prises: string[], tirer: () => number = Math.random): string {
  const usages = new Map<string, number>(PALETTE.map((c) => [c, 0]));
  for (const c of prises) if (usages.has(c)) usages.set(c, usages.get(c)! + 1);
  const minimum = Math.min(...usages.values());
  const candidates = PALETTE.filter((c) => usages.get(c) === minimum);
  return candidates[Math.min(Math.floor(tirer() * candidates.length), candidates.length - 1)]!;
}

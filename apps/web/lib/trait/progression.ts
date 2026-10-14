/**
 * Progression du trait conducteur (spec docs/superpowers/specs/2026-10-14-trait-conducteur-design.md,
 * § 4.1) : quelle longueur tracer pour une ligne de lecture donnée, et où placer la tête. Pur, sans DOM.
 */

export type Point = { x: number; y: number };

/** Écart, en longueur, entre deux échantillons du trait. */
export const PAS_ECHANTILLON = 4;

/** Le trait doit avoir la longueur `l` quand la ligne de lecture passe l'ordonnée `y` (document). */
export type Repere = { l: number; y: number };

/** Ordonnées rendues strictement croissantes : chaque repère au moins 1 px sous le précédent. */
export function ordonnerReperes(reperes: Repere[]): Repere[] {
  let precedente = -Infinity;
  return reperes.map(({ l, y }) => {
    precedente = Math.max(y, precedente + 1);
    return { l, y: precedente };
  });
}

/** Longueur tracée pour la ligne de lecture `t` : 0 avant le premier repère, la dernière longueur après. */
export function longueurPour(t: number, reperes: Repere[]): number {
  const premier = reperes[0];
  if (!premier || t <= premier.y) return 0;
  for (let i = 1; i < reperes.length; i++) {
    const b = reperes[i]!;
    if (t < b.y) {
      const a = reperes[i - 1]!;
      return a.l + ((t - a.y) / (b.y - a.y)) * (b.l - a.l);
    }
  }
  return reperes.at(-1)!.l;
}

/** Point du trait à la longueur `l`, entre deux échantillons (le dernier peut être plus proche que le pas). */
export function pointA(l: number, echantillons: Point[], longueur: number): Point {
  const dernier = echantillons.at(-1);
  if (!dernier) return { x: 0, y: 0 };
  if (l >= longueur) return dernier;
  const i = Math.max(l, 0) / PAS_ECHANTILLON;
  const a = echantillons[Math.floor(i)]!;
  const b = echantillons[Math.min(Math.ceil(i), echantillons.length - 1)]!;
  const f = i - Math.floor(i);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

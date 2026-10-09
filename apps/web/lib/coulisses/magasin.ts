/**
 * Mesures en direct des coulisses : les 30 dernières valeurs de chaque série,
 * lues par `useSyncExternalStore` (un nouvel objet à chaque changement, le
 * même entre deux).
 */
export const SERIES = ["site", "base", "tempsReel"] as const;
export type Serie = (typeof SERIES)[number];
export const HISTORIQUE = 30;
export const ECHECS_AVANT_INDISPONIBLE = 3;

export type EtatSerie = { valeurs: number[]; mediane: number | null; disponible: boolean; echecs: number };
export type EtatMesures = Record<Serie, EtatSerie>;

const SERIE_VIDE: EtatSerie = { valeurs: [], mediane: null, disponible: true, echecs: 0 };
const ETAT_INITIAL: EtatMesures = { site: SERIE_VIDE, base: SERIE_VIDE, tempsReel: SERIE_VIDE };

const arrondir = (ms: number) => Math.round(ms * 10) / 10;

export function mediane(valeurs: readonly number[]): number | null {
  if (valeurs.length === 0) return null;
  const triees = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(triees.length / 2);
  return arrondir(triees.length % 2 ? triees[milieu]! : (triees[milieu - 1]! + triees[milieu]!) / 2);
}

export const derniere = (s: EtatSerie): number | null => s.valeurs.at(-1) ?? null;

export class MagasinMesures {
  private courant: EtatMesures = ETAT_INITIAL;
  private readonly abonnes = new Set<() => void>();

  etat = (): EtatMesures => this.courant;

  abonner = (fn: () => void): (() => void) => {
    this.abonnes.add(fn);
    return () => {
      this.abonnes.delete(fn);
    };
  };

  ajouter(serie: Serie, ms: number): void {
    const valeurs = [...this.courant[serie].valeurs, arrondir(ms)].slice(-HISTORIQUE);
    this.publier(serie, { valeurs, mediane: mediane(valeurs), disponible: true, echecs: 0 });
  }

  /** Une série indisponible le reste jusqu'à sa prochaine réussite. */
  echec(serie: Serie): void {
    const s = this.courant[serie];
    const echecs = s.echecs + 1;
    this.publier(serie, { ...s, echecs, disponible: s.disponible && echecs < ECHECS_AVANT_INDISPONIBLE });
  }

  /** Service absent (pas d'adresse au build) : indisponible d'emblée. */
  indisponible(serie: Serie): void {
    this.publier(serie, { ...this.courant[serie], disponible: false });
  }

  private publier(serie: Serie, e: EtatSerie): void {
    this.courant = { ...this.courant, [serie]: e };
    for (const fn of this.abonnes) fn();
  }
}

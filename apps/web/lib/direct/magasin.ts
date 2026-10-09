import type { Curseur, MessageServeur } from "./protocole";

export type CurseurAffiche = { id: string; couleur: string; s: number; x: number; y: number; vuLe: number };
export type EtatDirect = { connecte: boolean; presents: number; curseurs: CurseurAffiche[] };

const VIDE: EtatDirect = { connecte: false, presents: 0, curseurs: [] };
const versAffiche = ([id, couleur, s, x, y]: Curseur, vuLe: number): CurseurAffiche => ({ id, couleur, s, x, y, vuLe });

/**
 * L'état affiché (présents, curseurs des autres), lu par `useSyncExternalStore` :
 * un nouvel objet à chaque changement, le même entre deux.
 */
export class MagasinDirect {
  private courant: EtatDirect = VIDE;
  private readonly abonnes = new Set<() => void>();

  etat = (): EtatDirect => this.courant;

  abonner = (fn: () => void): (() => void) => {
    this.abonnes.add(fn);
    return () => {
      this.abonnes.delete(fn);
    };
  };

  appliquer(m: MessageServeur, maintenant: number): void {
    const e = this.courant;
    switch (m.type) {
      case "bienvenue":
        return this.publier({ connecte: true, presents: m.presents, curseurs: m.curseurs.map((c) => versAffiche(c, maintenant)) });
      case "presents":
        return this.publier({ ...e, presents: m.nombre });
      case "positions": {
        const parId = new Map(e.curseurs.map((c) => [c.id, c]));
        for (const c of m.curseurs) parId.set(c[0], versAffiche(c, maintenant));
        return this.publier({ ...e, curseurs: [...parId.values()] });
      }
      case "depart":
        return this.publier({ ...e, curseurs: e.curseurs.filter((c) => c.id !== m.id) });
    }
  }

  /** Connexion perdue : plus de compteur ni de curseur (pas de nombre périmé) jusqu'au prochain `bienvenue`. */
  vider(): void {
    this.publier(VIDE);
  }

  private publier(e: EtatDirect): void {
    this.courant = e;
    for (const fn of this.abonnes) fn();
  }
}

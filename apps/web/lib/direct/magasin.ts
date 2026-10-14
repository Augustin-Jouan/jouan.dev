import type { MessageServeur } from "./protocole";

export type EtatDirect = { connecte: boolean; presents: number };

const VIDE: EtatDirect = { connecte: false, presents: 0 };

/**
 * L'état affiché (connexion, nombre de présents), lu par `useSyncExternalStore` :
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

  appliquer(m: MessageServeur): void {
    if (m.type === "bienvenue") this.publier({ connecte: true, presents: m.presents });
    else this.publier({ ...this.courant, presents: m.nombre });
  }

  /** Connexion perdue : plus de compteur (pas de nombre périmé) jusqu'au prochain `bienvenue`. */
  vider(): void {
    this.publier(VIDE);
  }

  private publier(e: EtatDirect): void {
    this.courant = e;
    for (const fn of this.abonnes) fn();
  }
}

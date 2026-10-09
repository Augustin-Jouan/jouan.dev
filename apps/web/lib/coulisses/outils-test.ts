/** Doublures partagées par les tests des coulisses (jamais importées par le site). */
import type { Horloge } from "@/lib/direct/connexion";

export class FausseSocket {
  static instances: FausseSocket[] = [];
  readyState = 0;
  envoyes: string[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  fermee = false;
  constructor(readonly url: string) {
    FausseSocket.instances.push(this);
  }
  send(d: string) {
    this.envoyes.push(d);
  }
  close() {
    this.fermee = true;
    this.readyState = 3;
  }
  /** Le serveur accepte la connexion. */
  accepter() {
    this.readyState = 1;
    this.onopen?.();
  }
  recevoir(donnees: unknown) {
    this.onmessage?.({ data: donnees });
  }
  /** La connexion tombe côté réseau. */
  perdre() {
    this.readyState = 3;
    this.onclose?.();
  }
}

export function horlogeFactice() {
  let t = 0;
  let suivant = 1;
  const taches = new Map<number, { fn: () => void; quand: number }>();
  const horloge: Horloge & { avancer(ms: number): void; enAttente(): number; delais(): number[] } = {
    maintenant: () => t,
    programmer(fn, ms) {
      const id = suivant++;
      taches.set(id, { fn, quand: t + ms });
      return id;
    },
    annuler(id) {
      taches.delete(id as number);
    },
    /** Avance le temps en exécutant, dans l'ordre, les tâches échues. */
    avancer(ms) {
      const fin = t + ms;
      for (;;) {
        const prochaine = [...taches.entries()].filter(([, x]) => x.quand <= fin).sort((a, b) => a[1].quand - b[1].quand)[0];
        if (!prochaine) break;
        taches.delete(prochaine[0]);
        t = prochaine[1].quand;
        prochaine[1].fn();
      }
      t = fin;
    },
    enAttente: () => taches.size,
    /** Délais restants des tâches programmées. */
    delais: () => [...taches.values()].map((x) => x.quand - t),
  };
  return horloge;
}

/** Laisse s'exécuter les promesses en attente. */
export const viderPromesses = () => new Promise<void>((ok) => setTimeout(ok, 0));

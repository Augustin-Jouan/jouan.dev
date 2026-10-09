import { randomUUID } from "node:crypto";
import { choisirCouleur } from "./couleurs.js";
import type { Curseur } from "./protocole.js";

type Present = { couleur: string; position: { s: number; x: number; y: number } | null };

/** Curseurs envoyés au plus par lot et dans `bienvenue` : le fan-out reste borné. */
export const PLAFOND_CURSEURS = 30;

/**
 * L'état partagé de l'accueil : qui est là, de quelle couleur, et où est son
 * curseur. Aucune entrée-sortie ici : le serveur diffuse ce que la salle lui
 * rend. L'identifiant est opaque et ne vit que le temps de la connexion.
 *
 * `visibles` et `bouges` gardent l'ordre des mouvements (le plus récent en
 * dernier) : au-delà de 30, ce sont les curseurs les plus récents qui partent.
 */
export class Salle {
  private readonly presents = new Map<string, Present>();
  private readonly visibles = new Set<string>();
  private readonly bouges = new Set<string>();

  constructor(
    private readonly tirerId: () => string = () => randomUUID().slice(0, 8),
    private readonly tirerCouleur: () => number = Math.random,
  ) {}

  rejoindre(): { id: string; couleur: string } {
    let id = this.tirerId();
    while (this.presents.has(id)) id = this.tirerId();
    const prises = [...this.presents.values()].map((p) => p.couleur);
    const couleur = choisirCouleur(prises, this.tirerCouleur);
    this.presents.set(id, { couleur, position: null });
    return { id, couleur };
  }

  /** Vrai si le visiteur avait un curseur visible : les autres doivent recevoir `depart`. */
  quitter(id: string): boolean {
    const present = this.presents.get(id);
    this.presents.delete(id);
    this.visibles.delete(id);
    this.bouges.delete(id);
    return present?.position != null;
  }

  deplacer(id: string, s: number, x: number, y: number): void {
    const present = this.presents.get(id);
    if (!present) return;
    present.position = { s, x, y };
    // Retirer puis remettre : l'identifiant passe en dernier (le plus récent).
    this.visibles.delete(id);
    this.visibles.add(id);
    this.bouges.delete(id);
    this.bouges.add(id);
  }

  /** Vrai si un curseur visible vient d'être masqué. */
  masquer(id: string): boolean {
    const present = this.presents.get(id);
    if (!present?.position) return false;
    present.position = null;
    this.visibles.delete(id);
    this.bouges.delete(id);
    return true;
  }

  get nombre(): number {
    return this.presents.size;
  }

  /** Curseurs visibles (30 au plus, les plus récents), sauf celui de `sauf`. */
  curseurs(sauf?: string): Curseur[] {
    return this.versCurseurs([...this.visibles].filter((id) => id !== sauf));
  }

  /** Curseurs qui ont bougé depuis le dernier appel (30 au plus, les plus récents). */
  extraireLot(): Curseur[] {
    const lot = this.versCurseurs([...this.bouges]);
    this.bouges.clear();
    return lot;
  }

  private versCurseurs(ids: string[]): Curseur[] {
    const liste: Curseur[] = [];
    for (const id of ids.slice(-PLAFOND_CURSEURS)) {
      const p = this.presents.get(id);
      if (p?.position) liste.push([id, p.couleur, p.position.s, p.position.x, p.position.y]);
    }
    return liste;
  }
}

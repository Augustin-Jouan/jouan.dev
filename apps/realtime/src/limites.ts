/** Plafonds du service (spec du sous-projet 4, §3). */
export const CONNEXIONS_MAX = 300;
export const CONNEXIONS_PAR_IP = 5;
export const MESSAGES_PAR_SECONDE = 40;

/**
 * Compte les connexions ouvertes, au total et par adresse IP. L'adresse n'est
 * gardée qu'en mémoire, tant qu'une connexion de cette adresse est ouverte.
 */
export class Gardien {
  private readonly parIp = new Map<string, number>();
  private total = 0;

  constructor(
    private readonly max: number = CONNEXIONS_MAX,
    private readonly maxParIp: number = CONNEXIONS_PAR_IP,
  ) {}

  peutAdmettre(ip: string): boolean {
    return this.total < this.max && (this.parIp.get(ip) ?? 0) < this.maxParIp;
  }

  admettre(ip: string): boolean {
    if (!this.peutAdmettre(ip)) return false;
    this.parIp.set(ip, (this.parIp.get(ip) ?? 0) + 1);
    this.total++;
    return true;
  }

  liberer(ip: string): void {
    const n = this.parIp.get(ip);
    if (!n) return;
    if (n === 1) this.parIp.delete(ip);
    else this.parIp.set(ip, n - 1);
    this.total--;
  }

  get connexions(): number {
    return this.total;
  }
}

/** Messages acceptés par fenêtre d'une seconde, pour une connexion. */
export class Debit {
  private debut = -Infinity;
  private n = 0;

  constructor(private readonly max: number = MESSAGES_PAR_SECONDE) {}

  accepter(maintenant: number): boolean {
    if (maintenant - this.debut >= 1_000) {
      this.debut = maintenant;
      this.n = 0;
    }
    if (this.n >= this.max) return false;
    this.n++;
    return true;
  }
}

/**
 * Plafonds de la sonde des coulisses (spec du sous-projet 5, §4.2) : un
 * `Gardien` à part, pour qu'une sonde saturée ne prive jamais l'accueil de places.
 */
export const SONDE_CONNEXIONS_MAX = 100;
export const SONDE_CONNEXIONS_PAR_IP = 2;
export const SONDE_MESSAGES_PAR_SECONDE = 5;
/** Octets UTF-8 au plus par message (un horodatage en texte). */
export const SONDE_TAILLE_MAX = 32;

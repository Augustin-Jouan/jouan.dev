/**
 * Connexion au service temps réel, côté navigateur : WebSocket natif, envois
 * espacés de 50 ms (seule la dernière position part), reconnexion de plus en
 * plus espacée (jusqu'à 30 s, chaque délai varié de ±20 % pour que les
 * visiteurs ne reviennent pas tous à la même seconde après un redéploiement),
 * fermeture après 30 s d'onglet caché. Les échecs
 * sont silencieux : sans service, l'accueil reste celui d'avant.
 */
import { lireMessageServeur, type MessageClient, type MessageServeur } from "./protocole";

export const DELAIS_RECONNEXION_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];
export const FERMETURE_ONGLET_CACHE_MS = 30_000;
export const INTERVALLE_ENVOI_MS = 50;
/** Variation des délais de reconnexion : ±20 %. */
const VARIATION = 0.2;
/** Repère ce morceau de JS dans le build (scripts/verifier-taille-direct.mjs). */
export const MARQUEUR_DIRECT = "connexion-direct:v1";
const OUVERTE = 1;

export type Horloge = {
  maintenant(): number;
  programmer(fn: () => void, ms: number): unknown;
  annuler(id: unknown): void;
};

const horlogeNavigateur: Horloge = {
  maintenant: () => Date.now(),
  programmer: (fn, ms) => window.setTimeout(fn, ms),
  annuler: (id) => window.clearTimeout(id as number),
};

export type Rappels = { surMessage(m: MessageServeur): void; surFermeture(): void };

export class ConnexionDirecte {
  private socket: WebSocket | null = null;
  private essais = 0;
  private cache = false;
  private arretee = false;
  private reconnexion: unknown = null;
  private fermetureCache: unknown = null;
  private envoiDiffere: unknown = null;
  private enAttente: MessageClient | null = null;
  private dernierEnvoi = -Infinity;

  constructor(
    private readonly url: string,
    private readonly rappels: Rappels,
    private readonly creerSocket: (url: string) => WebSocket = (u) => new WebSocket(u),
    private readonly horloge: Horloge = horlogeNavigateur,
    private readonly aleatoire: () => number = Math.random,
  ) {}

  /** Lu par le script de taille : garde le marqueur dans le morceau. */
  readonly marqueur = MARQUEUR_DIRECT;

  ouvrir(): void {
    if (this.arretee || this.cache || this.socket) return;
    let socket: WebSocket;
    try {
      socket = this.creerSocket(this.url);
    } catch {
      this.planifierReconnexion();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      this.essais = 0;
    };
    socket.onmessage = (e) => {
      const m = lireMessageServeur(e.data);
      if (m) this.rappels.surMessage(m);
    };
    socket.onerror = () => {};
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.rappels.surFermeture();
      this.planifierReconnexion();
    };
  }

  /** La dernière position gagne : envoyée tout de suite, ou au prochain créneau de 50 ms. */
  envoyer(m: MessageClient): void {
    this.enAttente = m;
    if (this.envoiDiffere !== null) return;
    const attente = this.dernierEnvoi + INTERVALLE_ENVOI_MS - this.horloge.maintenant();
    if (attente <= 0) {
      this.vider();
      return;
    }
    this.envoiDiffere = this.horloge.programmer(() => {
      this.envoiDiffere = null;
      this.vider();
    }, attente);
  }

  surVisibilite(visible: boolean): void {
    if (visible) {
      this.cache = false;
      this.annuler("fermetureCache");
      this.ouvrir();
      return;
    }
    this.cache = true;
    this.annuler("reconnexion");
    this.enAttente = { type: "masque" };
    this.vider();
    this.annuler("fermetureCache");
    this.fermetureCache = this.horloge.programmer(() => {
      this.fermetureCache = null;
      this.fermerSocket();
    }, FERMETURE_ONGLET_CACHE_MS);
  }

  arreter(): void {
    this.arretee = true;
    this.annuler("reconnexion");
    this.annuler("fermetureCache");
    this.annuler("envoiDiffere");
    this.fermerSocket();
  }

  private vider(): void {
    const m = this.enAttente;
    this.enAttente = null;
    if (!m || this.socket?.readyState !== OUVERTE) return;
    this.socket.send(JSON.stringify(m));
    this.dernierEnvoi = this.horloge.maintenant();
  }

  private planifierReconnexion(): void {
    if (this.arretee || this.cache || this.reconnexion !== null) return;
    const base = DELAIS_RECONNEXION_MS[Math.min(this.essais, DELAIS_RECONNEXION_MS.length - 1)]!;
    const delai = Math.round(base * (1 - VARIATION + 2 * VARIATION * this.aleatoire()));
    this.essais++;
    this.reconnexion = this.horloge.programmer(() => {
      this.reconnexion = null;
      this.ouvrir();
    }, delai);
  }

  private fermerSocket(): void {
    const socket = this.socket;
    this.socket = null;
    if (!socket) return;
    socket.onclose = null;
    socket.close(1000);
    this.rappels.surFermeture();
  }

  private annuler(minuterie: "reconnexion" | "fermetureCache" | "envoiDiffere"): void {
    if (this[minuterie] === null) return;
    this.horloge.annuler(this[minuterie]);
    this[minuterie] = null;
  }
}

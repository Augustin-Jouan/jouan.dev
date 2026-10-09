/**
 * Sonde des coulisses : WebSocket d'écho vers `/sonde` du service temps réel,
 * qui mesure l'aller-retour sans rejoindre la salle de l'accueil. Une mesure à
 * la fois : l'horodatage envoyé revient tel quel. Pendant l'ouverture de la
 * connexion, `mesurer()` rend « attente » (ni valeur ni échec) : une poignée de
 * main lente ne doit pas faire passer la mesure en « indisponible ».
 *
 * Délais de reconnexion et fermeture d'onglet caché : mêmes valeurs que
 * lib/direct/connexion.ts, recopiées sans importer ce module (son morceau de JS
 * est mesuré à part par verifier-taille-direct).
 */
import type { Horloge } from "@/lib/direct/connexion";

const DELAIS_RECONNEXION_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];
const FERMETURE_ONGLET_CACHE_MS = 30_000;
const VARIATION = 0.2;
const EN_OUVERTURE = 0;
const OUVERTE = 1;
export const DELAI_ECHO_MAX_MS = 5_000;

/** Aller-retour en ms ; `null` : échec ; « attente » : connexion en cours d'ouverture. */
export type ResultatEcho = number | null | "attente";

const horlogeNavigateur: Horloge = {
  maintenant: () => Date.now(),
  programmer: (fn, ms) => window.setTimeout(fn, ms),
  annuler: (id) => window.clearTimeout(id as number),
};

type MesureEnCours = { attendu: string; debut: number; minuterie: unknown; resoudre(ms: number | null): void };

export class SondeTempsReel {
  private socket: WebSocket | null = null;
  private essais = 0;
  private cache = false;
  private arretee = false;
  private reconnexion: unknown = null;
  private fermetureCache: unknown = null;
  private enCours: MesureEnCours | null = null;

  constructor(
    private readonly url: string,
    private readonly creerSocket: (url: string) => WebSocket = (u) => new WebSocket(u),
    private readonly horloge: Horloge = horlogeNavigateur,
    private readonly aleatoire: () => number = Math.random,
    private readonly chrono: () => number = () => performance.now(),
  ) {}

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
    socket.onmessage = (e) => this.surEcho(e.data);
    socket.onerror = () => {};
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.terminer(null);
      this.planifierReconnexion();
    };
  }

  /**
   * Aller-retour en ms (au dixième) ; « attente » pendant l'ouverture ; `null` :
   * pas de connexion (refusée, perdue, en attente de reconnexion), pas d'écho en 5 s.
   */
  mesurer(): Promise<ResultatEcho> {
    this.terminer(null);
    const socket = this.socket;
    if (socket?.readyState === EN_OUVERTURE) return Promise.resolve("attente");
    if (!socket || socket.readyState !== OUVERTE) return Promise.resolve(null);
    const debut = this.chrono();
    const attendu = debut.toFixed(1);
    return new Promise((resoudre) => {
      const minuterie = this.horloge.programmer(() => this.terminer(null), DELAI_ECHO_MAX_MS);
      this.enCours = { attendu, debut, minuterie, resoudre };
      socket.send(attendu);
    });
  }

  surVisibilite(visible: boolean): void {
    if (visible) {
      this.cache = false;
      this.annuler("fermetureCache");
      this.ouvrir();
      return;
    }
    this.annuler("fermetureCache");
    this.fermetureCache = this.horloge.programmer(() => {
      this.fermetureCache = null;
      this.cache = true;
      this.annuler("reconnexion");
      this.fermerSocket();
    }, FERMETURE_ONGLET_CACHE_MS);
  }

  arreter(): void {
    this.arretee = true;
    this.annuler("reconnexion");
    this.annuler("fermetureCache");
    this.fermerSocket();
  }

  private surEcho(donnees: unknown): void {
    const e = this.enCours;
    if (!e || donnees !== e.attendu) return;
    this.terminer(this.chrono() - e.debut);
  }

  private terminer(ms: number | null): void {
    const e = this.enCours;
    if (!e) return;
    this.enCours = null;
    this.horloge.annuler(e.minuterie);
    e.resoudre(ms === null ? null : Math.round(ms * 10) / 10);
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
    this.terminer(null);
    if (!socket) return;
    socket.onclose = null;
    socket.close(1000);
  }

  private annuler(minuterie: "reconnexion" | "fermetureCache"): void {
    if (this[minuterie] === null) return;
    this.horloge.annuler(this[minuterie]);
    this[minuterie] = null;
  }
}

/**
 * Relève les mesures des coulisses toutes les 2 s, onglet visible seulement :
 * l'aller-retour HTTP (qui rapporte aussi la base) et l'écho de la sonde, chacun
 * dans sa boucle. Un échec espace les essais (2, 4, 8 puis 10 s, ou le
 * `Retry-After` du serveur s'il est plus long). Onglet caché, y compris dès le
 * démarrage : rien ne part, la requête en vol est abandonnée et un résultat
 * arrivé après coup est ignoré (numéro de génération). Au retour sur l'onglet,
 * chaque boucle reprend à son échéance prévue (un `Retry-After` reste respecté),
 * et la première réponse HTTP redevient un rodage.
 */
import type { Horloge } from "@/lib/direct/connexion";
import type { ResultatHttp } from "./http";
import type { MagasinMesures } from "./magasin";
import type { ResultatEcho } from "./sonde";

export const INTERVALLE_MS = 2_000;
export const DELAIS_ECHEC_MS = [2_000, 4_000, 8_000, 10_000];

export type SondeMesurable = {
  ouvrir(): void;
  mesurer(): Promise<ResultatEcho>;
  surVisibilite(visible: boolean): void;
  arreter(): void;
};

type Boucle = "http" | "sonde";

const horlogeNavigateur: Horloge = {
  maintenant: () => Date.now(),
  programmer: (fn, ms) => window.setTimeout(fn, ms),
  annuler: (id) => window.clearTimeout(id as number),
};

const ongletVisible = () => document.visibilityState === "visible";
const delaiApresEchecs = (echecs: number) => DELAIS_ECHEC_MS[Math.min(echecs - 1, DELAIS_ECHEC_MS.length - 1)]!;

export class Releveur {
  private actif = false;
  private generation = 0;
  private abandon: AbortController | null = null;
  private rodage = true;
  private echecs: Record<Boucle, number> = { http: 0, sonde: 0 };
  private minuteries: Record<Boucle, unknown> = { http: null, sonde: null };
  /** Instant prévu du prochain essai de chaque boucle, gardé pendant que l'onglet est caché. */
  private echeances: Record<Boucle, number | null> = { http: null, sonde: null };

  constructor(
    private readonly magasin: MagasinMesures,
    private readonly http: (signal: AbortSignal) => Promise<ResultatHttp>,
    private readonly sonde: SondeMesurable | null,
    private readonly horloge: Horloge = horlogeNavigateur,
    private readonly visible: () => boolean = ongletVisible,
  ) {}

  /** Onglet caché au démarrage : rien ne part avant `surVisibilite(true)`. */
  demarrer(): void {
    if (!this.sonde) this.magasin.indisponible("tempsReel");
    if (!this.visible()) return;
    this.sonde?.ouvrir();
    this.reprendre();
  }

  surVisibilite(visible: boolean): void {
    this.sonde?.surVisibilite(visible);
    if (visible) this.reprendre();
    else this.suspendre();
  }

  arreter(): void {
    this.suspendre();
    this.sonde?.arreter();
  }

  private reprendre(): void {
    if (this.actif) return;
    this.actif = true;
    this.abandon = new AbortController();
    // Après une pause, la connexion a pu être refermée : la première réponse ne compte pas.
    this.rodage = true;
    const reste = (boucle: Boucle) => Math.max(0, (this.echeances[boucle] ?? 0) - this.horloge.maintenant());
    if (reste("http") === 0) void this.tourHttp(this.generation);
    else this.planifier("http", reste("http"));
    if (this.sonde) this.planifier("sonde", Math.max(INTERVALLE_MS, reste("sonde")));
  }

  private suspendre(): void {
    this.actif = false;
    this.generation++;
    // La requête en vol est annulée : elle ne compte pas deux fois dans la limite du serveur.
    this.abandon?.abort();
    this.abandon = null;
    for (const boucle of ["http", "sonde"] as const) {
      if (this.minuteries[boucle] !== null) this.horloge.annuler(this.minuteries[boucle]);
      this.minuteries[boucle] = null;
    }
  }

  private async tourHttp(generation: number): Promise<void> {
    const r = await this.http(this.abandon!.signal);
    if (generation !== this.generation) return;
    if (r.ok) {
      this.echecs.http = 0;
      if (this.rodage) {
        // Première réponse : ouverture de la connexion comprise, non représentative.
        this.rodage = false;
      } else {
        this.magasin.ajouter("site", r.ms);
        if (r.base === null) this.magasin.echec("base");
        else this.magasin.ajouter("base", r.base);
      }
      this.planifier("http", INTERVALLE_MS);
      return;
    }
    this.echecs.http++;
    this.magasin.echec("site");
    this.magasin.echec("base");
    this.planifier("http", Math.max(delaiApresEchecs(this.echecs.http), r.reessaiMs ?? 0));
  }

  private async tourSonde(generation: number): Promise<void> {
    const r = await this.sonde!.mesurer();
    if (generation !== this.generation) return;
    if (r === "attente") {
      // Connexion en cours d'ouverture : ni valeur ni échec.
      this.planifier("sonde", INTERVALLE_MS);
      return;
    }
    if (r === null) {
      this.echecs.sonde++;
      this.magasin.echec("tempsReel");
      this.planifier("sonde", delaiApresEchecs(this.echecs.sonde));
      return;
    }
    this.echecs.sonde = 0;
    this.magasin.ajouter("tempsReel", r);
    this.planifier("sonde", INTERVALLE_MS);
  }

  private planifier(boucle: Boucle, ms: number): void {
    const generation = this.generation;
    this.echeances[boucle] = this.horloge.maintenant() + ms;
    this.minuteries[boucle] = this.horloge.programmer(() => {
      this.minuteries[boucle] = null;
      this.echeances[boucle] = null;
      void (boucle === "http" ? this.tourHttp(generation) : this.tourSonde(generation));
    }, ms);
  }
}

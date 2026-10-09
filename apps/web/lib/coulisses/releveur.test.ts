import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { ResultatHttp } from "./http";
import { MagasinMesures } from "./magasin";
import { horlogeFactice, viderPromesses } from "./outils-test";
import { INTERVALLE_MS, Releveur, type SondeMesurable } from "./releveur";
import type { ResultatEcho } from "./sonde";

let horloge: ReturnType<typeof horlogeFactice>;
let magasin: MagasinMesures;
let reponses: ResultatHttp[];
let http: Mock<(signal: AbortSignal) => Promise<ResultatHttp>>;

const ok = (ms: number, base: number | null = 1): ResultatHttp => ({ ok: true, ms, base });
const echec: ResultatHttp = { ok: false };

function fausseSonde(valeurs: ResultatEcho[] = []) {
  const sonde = {
    ouvrir: vi.fn(),
    mesurer: vi.fn(async (): Promise<ResultatEcho> => (valeurs.length > 0 ? valeurs.shift()! : null)),
    surVisibilite: vi.fn(),
    arreter: vi.fn(),
  };
  return sonde satisfies SondeMesurable;
}

const nouveau = (sonde: SondeMesurable | null = null, visible = () => true) =>
  new Releveur(magasin, http, sonde, horloge, visible);

/** Avance l'horloge puis laisse les mesures en vol se terminer. */
async function avancer(ms: number) {
  horloge.avancer(ms);
  await viderPromesses();
}

beforeEach(() => {
  horloge = horlogeFactice();
  magasin = new MagasinMesures();
  reponses = [];
  http = vi.fn(async () => reponses.shift() ?? echec);
});

describe("Releveur", () => {
  it("la première mesure HTTP est un rodage, non affichée ; la suivante part 2 s après", async () => {
    reponses.push(ok(80, 9), ok(20, 2));
    nouveau().demarrer();
    await viderPromesses();
    expect(magasin.etat().site.valeurs).toEqual([]);
    expect(magasin.etat().base.valeurs).toEqual([]);
    await avancer(INTERVALLE_MS);
    expect(magasin.etat().site.valeurs).toEqual([20]);
    expect(magasin.etat().base.valeurs).toEqual([2]);
  });

  it("base null : échec de la base seulement", async () => {
    reponses.push(ok(10), ok(20, null));
    nouveau().demarrer();
    await viderPromesses();
    await avancer(INTERVALLE_MS);
    expect(magasin.etat().site.valeurs).toEqual([20]);
    expect(magasin.etat().base.echecs).toBe(1);
  });

  it("sans sonde : temps réel indisponible d'emblée", () => {
    nouveau().demarrer();
    expect(magasin.etat().tempsReel.disponible).toBe(false);
  });

  it("avec la sonde : l'ouvre puis mesure toutes les 2 s", async () => {
    const sonde = fausseSonde([7, 8]);
    nouveau(sonde).demarrer();
    expect(sonde.ouvrir).toHaveBeenCalled();
    await avancer(INTERVALLE_MS);
    await avancer(INTERVALLE_MS);
    expect(magasin.etat().tempsReel.valeurs).toEqual([7, 8]);
  });

  it("sonde en cours d'ouverture : ni valeur ni échec, nouvel essai 2 s après", async () => {
    const sonde = fausseSonde(["attente", "attente", "attente", "attente", 6]);
    nouveau(sonde).demarrer();
    for (let i = 0; i < 5; i++) await avancer(INTERVALLE_MS);
    expect(magasin.etat().tempsReel).toMatchObject({ disponible: true, echecs: 0, valeurs: [6] });
  });

  it("échecs HTTP : indisponible au 3e, essais espacés de 2, 4, 8 puis 10 s", async () => {
    nouveau().demarrer();
    await viderPromesses();
    const delais: number[] = [];
    for (let i = 0; i < 5; i++) {
      delais.push(horloge.delais()[0]!);
      await avancer(delais.at(-1)!);
    }
    expect(delais).toEqual([2_000, 4_000, 8_000, 10_000, 10_000]);
    expect(magasin.etat().site.disponible).toBe(false);
    expect(magasin.etat().base.disponible).toBe(false);
  });

  it("429 : attend au moins le délai demandé", async () => {
    reponses.push({ ok: false, reessaiMs: 30_000 });
    nouveau().demarrer();
    await viderPromesses();
    expect(horloge.delais()).toEqual([30_000]);
  });

  it("429 puis aller-retour d'onglet : le délai demandé reste respecté", async () => {
    reponses.push({ ok: false, reessaiMs: 30_000 });
    const r = nouveau();
    r.demarrer();
    await viderPromesses();
    await avancer(3_000);
    r.surVisibilite(false);
    r.surVisibilite(true);
    expect(http).toHaveBeenCalledTimes(1);
    expect(horloge.delais()).toEqual([27_000]);
    await avancer(27_000);
    expect(http).toHaveBeenCalledTimes(2);
  });

  it("retour sur l'onglet : la première mesure est un nouveau rodage (connexion refermée entre-temps)", async () => {
    reponses.push(ok(10), ok(20), ok(90), ok(30));
    const r = nouveau();
    r.demarrer();
    await viderPromesses();
    await avancer(INTERVALLE_MS);
    r.surVisibilite(false);
    await avancer(60_000);
    r.surVisibilite(true);
    await viderPromesses();
    await avancer(INTERVALLE_MS);
    expect(magasin.etat().site.valeurs).toEqual([20, 30]);
  });

  it("échecs de la sonde : essais espacés de 2, 4, 8 puis 10 s", async () => {
    http.mockImplementation(async () => ok(1));
    const sonde = fausseSonde();
    const appels: number[] = [];
    sonde.mesurer.mockImplementation(async () => {
      appels.push(horloge.maintenant());
      return null;
    });
    nouveau(sonde).demarrer();
    for (let i = 0; i < 30; i++) await avancer(1_000);
    expect(appels).toEqual([2_000, 4_000, 8_000, 16_000, 26_000]);
    expect(magasin.etat().tempsReel.disponible).toBe(false);
  });

  it("onglet caché dès le démarrage : rien ne part avant le retour sur l'onglet", async () => {
    const sonde = fausseSonde();
    let visible = false;
    const r = nouveau(sonde, () => visible);
    r.demarrer();
    await avancer(10_000);
    expect(http).not.toHaveBeenCalled();
    expect(sonde.ouvrir).not.toHaveBeenCalled();
    visible = true;
    r.surVisibilite(true);
    expect(sonde.surVisibilite).toHaveBeenCalledWith(true);
    expect(http).toHaveBeenCalledTimes(1);
  });

  it("onglet caché pendant une mesure en vol : requête annulée, résultat ignoré, plus rien de programmé", async () => {
    let terminer!: (r: ResultatHttp) => void;
    let signal!: AbortSignal;
    http.mockImplementationOnce((s) => {
      signal = s;
      return new Promise((ok) => (terminer = ok));
    });
    const sonde = fausseSonde();
    const r = nouveau(sonde);
    r.demarrer();
    r.surVisibilite(false);
    expect(signal.aborted).toBe(true);
    expect(sonde.surVisibilite).toHaveBeenCalledWith(false);
    terminer(ok(50));
    await viderPromesses();
    expect(horloge.enAttente()).toBe(0);
    expect(http).toHaveBeenCalledTimes(1);
    r.surVisibilite(true);
    expect(sonde.surVisibilite).toHaveBeenCalledWith(true);
    expect(http).toHaveBeenCalledTimes(2);
    expect(http.mock.calls[1]![0].aborted).toBe(false);
  });

  it("arrêté : la sonde est arrêtée, plus rien de programmé", async () => {
    const sonde = fausseSonde();
    const r = nouveau(sonde);
    r.demarrer();
    await viderPromesses();
    r.arreter();
    expect(sonde.arreter).toHaveBeenCalled();
    expect(horloge.enAttente()).toBe(0);
  });
});

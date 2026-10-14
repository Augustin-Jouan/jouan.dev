import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnexionDirecte, DELAIS_RECONNEXION_MS, FERMETURE_ONGLET_CACHE_MS, type Horloge } from "./connexion";

class FausseSocket {
  static instances: FausseSocket[] = [];
  readyState = 0;
  envoyes: string[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    FausseSocket.instances.push(this);
  }
  send(d: string) {
    this.envoyes.push(d);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  ouvrir() {
    this.readyState = 1;
    this.onopen?.();
  }
}

function horlogeFactice() {
  let t = 0;
  let suivant = 1;
  const minuteries = new Map<number, { quand: number; fn: () => void }>();
  const horloge: Horloge = {
    maintenant: () => t,
    programmer: (fn, ms) => {
      const id = suivant++;
      minuteries.set(id, { quand: t + ms, fn });
      return id;
    },
    annuler: (id) => {
      minuteries.delete(id as number);
    },
  };
  const avancer = (ms: number) => {
    const fin = t + ms;
    for (;;) {
      const prochaine = [...minuteries.entries()].filter(([, m]) => m.quand <= fin).sort((a, b) => a[1].quand - b[1].quand)[0];
      if (!prochaine) break;
      minuteries.delete(prochaine[0]);
      t = prochaine[1].quand;
      prochaine[1].fn();
    }
    t = fin;
  };
  return { horloge, avancer, enAttente: () => minuteries.size };
}

let h: ReturnType<typeof horlogeFactice>;
const rappels = { surMessage: vi.fn(), surFermeture: vi.fn() };
// Aléa neutre (0,5 → délai exact) : les délais variés ont leur propre test.
const nouvelle = (aleatoire = () => 0.5) =>
  new ConnexionDirecte("ws://test/direct", rappels, () => new FausseSocket() as unknown as WebSocket, h.horloge, aleatoire);
const derniere = () => FausseSocket.instances.at(-1)!;

beforeEach(() => {
  FausseSocket.instances = [];
  h = horlogeFactice();
  rappels.surMessage.mockReset();
  rappels.surFermeture.mockReset();
});

describe("ConnexionDirecte", () => {
  it("transmet les messages valides du serveur", () => {
    const c = nouvelle();
    c.ouvrir();
    derniere().ouvrir();
    derniere().onmessage?.({ data: '{"type":"presents","nombre":2}' });
    derniere().onmessage?.({ data: "n'importe quoi" });
    expect(rappels.surMessage).toHaveBeenCalledTimes(1);
    expect(rappels.surMessage).toHaveBeenCalledWith({ type: "presents", nombre: 2 });
  });

  it("se reconnecte avec un délai croissant plafonné à 30 s, sans boucle serrée", () => {
    const c = nouvelle();
    c.ouvrir();
    for (const delai of [...DELAIS_RECONNEXION_MS, 30_000, 30_000]) {
      derniere().close();
      const avant = FausseSocket.instances.length;
      h.avancer(delai - 1);
      expect(FausseSocket.instances.length).toBe(avant);
      h.avancer(1);
      expect(FausseSocket.instances.length).toBe(avant + 1);
    }
    expect(rappels.surFermeture).toHaveBeenCalled();
  });

  it("repart du premier délai après une connexion réussie", () => {
    const c = nouvelle();
    c.ouvrir();
    derniere().close();
    h.avancer(DELAIS_RECONNEXION_MS[0]!);
    derniere().close();
    h.avancer(DELAIS_RECONNEXION_MS[1]!);
    derniere().ouvrir();
    derniere().close();
    const avant = FausseSocket.instances.length;
    h.avancer(DELAIS_RECONNEXION_MS[0]!);
    expect(FausseSocket.instances.length).toBe(avant + 1);
  });

  it("onglet caché : ferme après 30 s sans rien envoyer, ne se reconnecte pas avant le retour", () => {
    const c = nouvelle();
    c.ouvrir();
    derniere().ouvrir();
    c.surVisibilite(false);
    expect(derniere().envoyes).toEqual([]);
    h.avancer(FERMETURE_ONGLET_CACHE_MS);
    expect(derniere().readyState).toBe(3);
    h.avancer(120_000);
    expect(FausseSocket.instances).toHaveLength(1);
    c.surVisibilite(true);
    expect(FausseSocket.instances).toHaveLength(2);
  });

  it("onglet revenu avant 30 s : garde la même connexion", () => {
    const c = nouvelle();
    c.ouvrir();
    derniere().ouvrir();
    c.surVisibilite(false);
    h.avancer(10_000);
    c.surVisibilite(true);
    h.avancer(60_000);
    expect(FausseSocket.instances).toHaveLength(1);
    expect(derniere().readyState).toBe(1);
  });

  it("onglet caché : une fermeture ne reconnecte pas avant le retour", () => {
    const c = nouvelle();
    c.ouvrir();
    derniere().ouvrir();
    c.surVisibilite(false);
    derniere().close();
    h.avancer(120_000);
    expect(FausseSocket.instances).toHaveLength(1);
    c.surVisibilite(true);
    expect(FausseSocket.instances).toHaveLength(2);
  });

  it("onglet caché : une reconnexion déjà programmée est annulée", () => {
    const c = nouvelle();
    c.ouvrir();
    derniere().ouvrir();
    derniere().close();
    c.surVisibilite(false);
    h.avancer(120_000);
    expect(FausseSocket.instances).toHaveLength(1);
    c.surVisibilite(true);
    expect(FausseSocket.instances).toHaveLength(2);
  });

  it("arrêter ferme tout et ne programme plus rien", () => {
    const c = nouvelle();
    c.ouvrir();
    derniere().ouvrir();
    c.arreter();
    expect(derniere().readyState).toBe(3);
    h.avancer(120_000);
    expect(FausseSocket.instances).toHaveLength(1);
    expect(h.enAttente()).toBe(0);
  });

  it("une socket impossible à créer est retentée plus tard", () => {
    let essais = 0;
    const c = new ConnexionDirecte("ws://test/direct", rappels, () => {
      essais++;
      throw new Error("refus");
    }, h.horloge, () => 0.5);
    c.ouvrir();
    expect(essais).toBe(1);
    h.avancer(DELAIS_RECONNEXION_MS[0]!);
    expect(essais).toBe(2);
  });

  it("varie chaque délai de ±20 % pour étaler les reconnexions", () => {
    for (const [alea, attendu] of [[0, 800], [1, 1_200]] as const) {
      FausseSocket.instances = [];
      const c = nouvelle(() => alea);
      c.ouvrir();
      derniere().close();
      h.avancer(attendu - 1);
      expect(FausseSocket.instances).toHaveLength(1);
      h.avancer(1);
      expect(FausseSocket.instances).toHaveLength(2);
      c.arreter();
    }
  });
});

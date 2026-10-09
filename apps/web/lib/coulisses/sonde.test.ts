import { beforeEach, describe, expect, it } from "vitest";
import { FausseSocket, horlogeFactice } from "./outils-test";
import { DELAI_ECHO_MAX_MS, SondeTempsReel } from "./sonde";

let horloge: ReturnType<typeof horlogeFactice>;

function nouvelle(aleatoire = () => 0.5) {
  return new SondeTempsReel(
    "wss://direct.exemple.dev/sonde",
    (u) => new FausseSocket(u) as unknown as WebSocket,
    horloge,
    aleatoire,
    () => horloge.maintenant(),
  );
}
const derniere = () => FausseSocket.instances.at(-1)!;

beforeEach(() => {
  FausseSocket.instances = [];
  horloge = horlogeFactice();
});

describe("SondeTempsReel", () => {
  it("mesure l'aller-retour d'un écho", async () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().accepter();
    horloge.avancer(100);
    const mesure = s.mesurer();
    expect(derniere().envoyes).toEqual(["100.0"]);
    horloge.avancer(12);
    derniere().recevoir("100.0");
    expect(await mesure).toBe(12);
  });

  it("ignore un écho qui ne correspond pas à la mesure en cours", async () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().accepter();
    const mesure = s.mesurer();
    derniere().recevoir("autre");
    horloge.avancer(5);
    derniere().recevoir("0.0");
    expect(await mesure).toBe(5);
  });

  it("pendant une ouverture lente (plus de 2 s) : « attente », rien envoyé", async () => {
    const s = nouvelle();
    s.ouvrir();
    horloge.avancer(2_500);
    expect(await s.mesurer()).toBe("attente");
    expect(derniere().envoyes).toEqual([]);
    derniere().accepter();
    const mesure = s.mesurer();
    horloge.avancer(9);
    derniere().recevoir("2500.0");
    expect(await mesure).toBe(9);
  });

  it("connexion refusée ou perdue, en attente de reconnexion : null", async () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().perdre();
    expect(await s.mesurer()).toBeNull();
  });

  it("sans écho en 5 s : null", async () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().accepter();
    const mesure = s.mesurer();
    horloge.avancer(DELAI_ECHO_MAX_MS);
    expect(await mesure).toBeNull();
  });

  it("une nouvelle mesure abandonne la précédente encore en vol", async () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().accepter();
    const premiere = s.mesurer();
    horloge.avancer(1);
    const seconde = s.mesurer();
    expect(await premiere).toBeNull();
    horloge.avancer(3);
    derniere().recevoir("1.0");
    expect(await seconde).toBe(3);
  });

  it("connexion perdue pendant une mesure : null, puis reconnexion après 1 s environ", async () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().accepter();
    const mesure = s.mesurer();
    derniere().perdre();
    expect(await mesure).toBeNull();
    expect(FausseSocket.instances).toHaveLength(1);
    horloge.avancer(999);
    expect(FausseSocket.instances).toHaveLength(1);
    horloge.avancer(1);
    expect(FausseSocket.instances).toHaveLength(2);
  });

  it("délais de reconnexion croissants, variés de ±20 %, plafonnés à 30 s", () => {
    const s = nouvelle(() => 0);
    s.ouvrir();
    const delais: number[] = [];
    for (let i = 0; i < 7; i++) {
      derniere().perdre();
      delais.push(horloge.delais()[0]!);
      horloge.avancer(delais.at(-1)!);
    }
    expect(delais).toEqual([800, 1_600, 3_200, 6_400, 12_800, 24_000, 24_000]);
  });

  it("onglet caché 30 s : fermée, sans reconnexion ; au retour : rouverte", () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().accepter();
    s.surVisibilite(false);
    horloge.avancer(30_000);
    expect(derniere().fermee).toBe(true);
    expect(horloge.enAttente()).toBe(0);
    s.surVisibilite(true);
    expect(FausseSocket.instances).toHaveLength(2);
  });

  it("arrêtée : fermée, plus aucune reconnexion", () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().accepter();
    s.arreter();
    expect(derniere().fermee).toBe(true);
    expect(horloge.enAttente()).toBe(0);
  });
});

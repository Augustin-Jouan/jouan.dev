import { describe, expect, it } from "vitest";
import { lireMessageServeur } from "./protocole";

describe("lireMessageServeur", () => {
  it("lit l'accueil et le compteur", () => {
    expect(lireMessageServeur('{"type":"bienvenue","presents":1}')).toEqual({ type: "bienvenue", presents: 1 });
    expect(lireMessageServeur('{"type":"presents","nombre":2}')).toEqual({ type: "presents", nombre: 2 });
  });
  it("ne garde que le compteur de l'accueil d'un ancien service (identifiant, couleur et curseurs en plus)", () => {
    const ancien = '{"type":"bienvenue","id":"a","couleur":"#c84a1f","presents":3,"curseurs":[["b","#2f6f6a",0,0.5,0.5]]}';
    expect(lireMessageServeur(ancien)).toEqual({ type: "bienvenue", presents: 3 });
  });
  it.each([
    ["binaire", new ArrayBuffer(2)],
    ["JSON invalide", "{"],
    ["type inconnu", '{"type":"autre"}'],
    ["null", "null"],
    ["positions d'un ancien service", '{"type":"positions","curseurs":[["b","#2f6f6a",0,0.5,0.5]]}'],
    ["départ d'un ancien service", '{"type":"depart","id":"b"}'],
    ["compteur sans nombre", '{"type":"presents"}'],
  ])("ignore : %s", (_cas, brut) => {
    expect(lireMessageServeur(brut)).toBeNull();
  });
});

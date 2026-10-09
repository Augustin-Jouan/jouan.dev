import { describe, expect, it } from "vitest";
import { lireMessageServeur } from "./protocole";

describe("lireMessageServeur", () => {
  it("lit un message connu", () => {
    expect(lireMessageServeur('{"type":"presents","nombre":2}')).toEqual({ type: "presents", nombre: 2 });
  });
  it.each([["binaire", new ArrayBuffer(2)], ["JSON invalide", "{"], ["type inconnu", '{"type":"autre"}'], ["null", "null"]])(
    "ignore : %s",
    (_cas, brut) => {
      expect(lireMessageServeur(brut)).toBeNull();
    },
  );
});

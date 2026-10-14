import { describe, expect, it } from "vitest";
import { encoder } from "./protocole.js";

describe("encoder", () => {
  it("sérialise l'accueil et le compteur en JSON", () => {
    expect(encoder({ type: "bienvenue", presents: 2 })).toBe('{"type":"bienvenue","presents":2}');
    expect(encoder({ type: "presents", nombre: 3 })).toBe('{"type":"presents","nombre":3}');
  });
});

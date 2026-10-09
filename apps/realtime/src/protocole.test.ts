import { describe, expect, it } from "vitest";
import { encoder, lireMessage, TAILLE_MAX_MESSAGE } from "./protocole.js";

describe("lireMessage", () => {
  it("lit une position", () => {
    expect(lireMessage('{"type":"position","s":2,"x":0.5,"y":0.25}')).toEqual({ type: "position", s: 2, x: 0.5, y: 0.25 });
  });
  it("arrondit à quatre décimales", () => {
    expect(lireMessage('{"type":"position","s":0,"x":0.123456,"y":0.99999}')).toEqual({ type: "position", s: 0, x: 0.1235, y: 1 });
  });
  it("lit un masque", () => {
    expect(lireMessage('{"type":"masque"}')).toEqual({ type: "masque" });
  });
  it.each([
    ["JSON invalide", "{"],
    ["pas un objet", "42"],
    ["null", "null"],
    ["type inconnu", '{"type":"discussion"}'],
    ["section négative", '{"type":"position","s":-1,"x":0.5,"y":0.5}'],
    ["section non entière", '{"type":"position","s":1.5,"x":0.5,"y":0.5}'],
    ["section trop grande", '{"type":"position","s":20,"x":0.5,"y":0.5}'],
    ["x hors bornes", '{"type":"position","s":0,"x":1.01,"y":0.5}'],
    ["y négatif", '{"type":"position","s":0,"x":0.5,"y":-0.1}'],
    ["x texte", '{"type":"position","s":0,"x":"0.5","y":0.5}'],
    ["champ manquant", '{"type":"position","s":0,"x":0.5}'],
  ])("refuse : %s", (_cas, brut) => {
    expect(lireMessage(brut)).toBeNull();
  });
  it("refuse un message trop long", () => {
    const brut = `{"type":"masque","bourrage":"${"a".repeat(TAILLE_MAX_MESSAGE)}"}`;
    expect(lireMessage(brut)).toBeNull();
  });
});

describe("encoder", () => {
  it("sérialise en JSON", () => {
    expect(encoder({ type: "presents", nombre: 3 })).toBe('{"type":"presents","nombre":3}');
  });
});

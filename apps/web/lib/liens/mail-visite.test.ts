import { describe, expect, it } from "vitest";
import { contenuMailVisite, ordinalVisite } from "./mail-visite";

const espaces = (t: string) => t.replace(/[\u00a0\u202f]/g, " ");
const base = {
  nom: "Boulangerie Martin",
  appareil: "mobile" as const,
  le: new Date("2026-10-09T12:32:00Z"),
  urlAdmin: "https://jouan.dev/admin",
};

describe("ordinalVisite", () => {
  it("écrit 1re puis 2e, 3e…", () => {
    expect([1, 2, 3, 11].map(ordinalVisite)).toEqual(["1re", "2e", "3e", "11e"]);
  });
});

describe("contenuMailVisite", () => {
  it("annonce la première visite, sans visite précédente", () => {
    const { sujet, texte } = contenuMailVisite({ ...base, numero: 1, precedente: null });
    expect(sujet).toBe("Boulangerie Martin a ouvert son lien — 1re visite");
    expect(espaces(texte)).toContain("Visite : 1re, sur mobile");
    expect(espaces(texte)).toContain("Date : vendredi 9 octobre 2026 à 14:32");
    expect(texte).not.toContain("Visite précédente");
    expect(texte).toContain("https://jouan.dev/admin");
  });
  it("indique la visite précédente ensuite", () => {
    const { sujet, texte } = contenuMailVisite({
      ...base,
      numero: 3,
      appareil: "ordinateur",
      precedente: new Date("2026-10-07T12:32:00Z"),
    });
    expect(sujet).toBe("Boulangerie Martin a ouvert son lien — 3e visite");
    expect(espaces(texte)).toContain("Visite : 3e, sur ordinateur");
    expect(espaces(texte)).toContain("Visite précédente : il y a 2 jours");
  });
});

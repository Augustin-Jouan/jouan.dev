import { describe, expect, it } from "vitest";
import { dateHeureParis, ilYA } from "./temps";

const espaces = (t: string) => t.replace(/[\u00a0\u202f]/g, " ");
const maintenant = new Date("2026-10-09T12:00:00Z");
const avant = (ms: number) => new Date(maintenant.getTime() - ms);

describe("ilYA", () => {
  it.each([
    [30 * 1000, "à l'instant"],
    [5 * 60 * 1000, "il y a 5 minutes"],
    [3 * 60 * 60 * 1000, "il y a 3 heures"],
    [2 * 24 * 60 * 60 * 1000, "il y a 2 jours"],
  ])("%i ms → %s", (ms, attendu) => {
    expect(espaces(ilYA(avant(ms), maintenant))).toBe(attendu);
  });
});

describe("dateHeureParis", () => {
  it("affiche la date et l'heure de Paris", () => {
    expect(espaces(dateHeureParis(maintenant))).toBe("vendredi 9 octobre 2026 à 14:00");
  });
});

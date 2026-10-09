import { describe, expect, it } from "vitest";
import { dureeDefilement, formaterMs, texteSerie } from "./format";

describe("formaterMs", () => {
  it("en attente : points de suspension", () => expect(formaterMs(null)).toBe("…"));
  it("sous 10 ms : un décimal, virgule française", () => expect(formaterMs(4.25)).toBe("4,3\u00a0ms"));
  it("au-delà : entier", () => expect(formaterMs(42.6)).toBe("43\u00a0ms"));
});

describe("texteSerie", () => {
  it("indisponible l'emporte sur les valeurs anciennes", () =>
    expect(texteSerie({ valeurs: [12], mediane: 12, disponible: false, echecs: 3 })).toBe("indisponible"));
  it("dernière valeur sinon", () => expect(texteSerie({ valeurs: [12, 30], mediane: 21, disponible: true, echecs: 0 })).toBe("30\u00a0ms"));
});

describe("dureeDefilement", () => {
  it("plus la latence est basse, plus les pointillés vont vite, dans des bornes", () => {
    expect(dureeDefilement(null)).toBe(1.5);
    expect(dureeDefilement(1)).toBe(0.4);
    expect(dureeDefilement(50)).toBe(2.5);
    expect(dureeDefilement(1_000)).toBe(4);
  });

  it("quelques paliers seulement : une petite variation de latence ne change pas la durée (pas de saut des pointillés)", () => {
    expect(dureeDefilement(40)).toBe(dureeDefilement(45));
    expect(dureeDefilement(12)).toBe(dureeDefilement(18));
    const durees = new Set(Array.from({ length: 200 }, (_, ms) => dureeDefilement(ms)));
    expect(durees.size).toBeLessThanOrEqual(5);
  });
});

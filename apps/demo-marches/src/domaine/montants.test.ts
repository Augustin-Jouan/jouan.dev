import { describe, expect, it } from "vitest";
import { appliquerTaux, formaterEcart, formaterEuros, lireMontant } from "./montants";

const espaces = (texte: string) => texte.replace(/[ \u202f\u00a0]/g, " ");

describe("appliquerTaux", () => {
  it("arrondit au centime, demi-centime au-dessus", () => {
    expect(appliquerTaux(265_000, 20)).toBe(53_000);
    expect(appliquerTaux(118_409, 10)).toBe(11_841); // 118,409 → 118,41
    expect(appliquerTaux(130_250, 5)).toBe(6_513); // 65,125 → 65,13
  });
  it("traite un taux décimal et un montant négatif symétriquement", () => {
    expect(appliquerTaux(10_000, 5.5)).toBe(550);
    expect(appliquerTaux(-130_250, 5)).toBe(-6_513);
  });
});

describe("lireMontant", () => {
  it.each([
    ["9 850,00", 985_000],
    ["9850", 985_000],
    ["9 850 €", 985_000],
    ["9\u202f850,5", 985_050],
    ["9\u00a0850", 985_000],
    ["1234,5", 123_450],
    ["12.600", null], // point de milliers ambigu : refusé
    ["-1 450", -145_000],
    ["+ 850", 85_000],
    ["0", 0],
    ["-0", 0],
    ["", null],
    ["abc", null],
    ["12,345", null],
    ["1 000 000 000 000", null], // trop grand
    ["999 999 999,99", 99_999_999_999],
  ])("%s → %s", (texte, attendu) => {
    expect(lireMontant(texte)).toBe(attendu);
  });
});

describe("formats", () => {
  it("affiche les euros à la française", () => {
    expect(espaces(formaterEuros(302_100))).toBe("3 021,00 €");
    expect(espaces(formaterEcart(85_000))).toBe("+850,00 €");
    expect(espaces(formaterEcart(-145_000))).toBe("-1 450,00 €");
  });
});

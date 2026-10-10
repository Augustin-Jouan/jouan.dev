import { describe, expect, it } from "vitest";
import { contact } from "@/data/contact";
import { construireCv } from "./modele";
import { LARGEUR, couper, largeurAffichee, rendreCvTerminal, sansAnsi } from "./terminal";

const ESC = "\x1b";

describe("couper", () => {
  it("coupe aux espaces sans dépasser la largeur", () => {
    expect(couper("un deux trois quatre", 9)).toEqual(["un deux", "trois", "quatre"]);
  });

  it("laisse entier un mot plus long que la largeur", () => {
    expect(couper("https://exemple.dev/une/longue/adresse fin", 10)).toEqual([
      "https://exemple.dev/une/longue/adresse",
      "fin",
    ]);
  });
});

describe("rendreCvTerminal", () => {
  const cv = construireCv("https://jouan.dev");
  const colore = rendreCvTerminal(cv, { couleurs: true });
  const brut = rendreCvTerminal(cv, { couleurs: false });

  it("tient en 80 colonnes, séquences ANSI exclues", () => {
    for (const texte of [colore, rendreCvTerminal(construireCv("https://portfolio.exemple-long.dev"), { couleurs: true })]) {
      const tropLongues = texte.split("\n").filter((ligne) => largeurAffichee(ligne) > LARGEUR);
      expect(tropLongues).toEqual([]);
    }
  });

  it("sans couleur : aucun octet ESC", () => {
    expect(brut).not.toContain(ESC);
  });

  it("avec couleur : le même texte une fois les séquences retirées", () => {
    expect(colore).toContain(`${ESC}[`);
    expect(sansAnsi(colore)).toBe(brut);
  });

  it("referme chaque segment coloré sur sa ligne, puis le texte entier", () => {
    const sequences = colore.match(/\x1b\[[0-9;]*m/g)!;
    expect(sequences.at(-1)).toBe(`${ESC}[0m`);
    sequences.slice(0, -1).forEach((sequence, i) => {
      expect(sequence === `${ESC}[0m`, `séquence ${i}`).toBe(i % 2 === 1);
    });
    expect(colore).not.toMatch(/\x1b\[(?!0m)[0-9;]*m[^\x1b]*\n/);
  });

  it("donne le nom, les sections, le contact et les autres formats", () => {
    expect(brut).toContain("Augustin Jouan · Développeur full stack · indépendant");
    for (const section of ["OFFRE", "RÉALISATIONS", "COMPÉTENCES", "PARCOURS", "CONTACT"]) {
      expect(brut).toContain(`── ${section} ─`);
    }
    expect(brut).toContain("https://jouan.dev/realisations/suivi-de-marches");
    expect(brut).toContain(contact.email);
    expect(brut).toContain("curl -L jouan.dev/api/me");
    expect(brut).toContain("curl -L jouan.dev/cv.txt");
  });

  it("se termine par une ligne vide", () => {
    expect(brut.endsWith("\n\n")).toBe(true);
    expect(colore.endsWith(`${ESC}[0m\n\n`)).toBe(true);
  });
});

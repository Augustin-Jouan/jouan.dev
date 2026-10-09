import { describe, expect, it } from "vitest";
import { realisations } from "./accueil";
import { cheminEtude, etudesDeCas, trouverEtude } from "./realisations";

describe("études de cas", () => {
  it("ont des slugs uniques et trois chiffres clés", () => {
    expect(new Set(etudesDeCas.map((e) => e.slug)).size).toBe(etudesDeCas.length);
    for (const etude of etudesDeCas) expect(etude.chiffres).toHaveLength(3);
  });
  it("chaque carte de l'accueil mène à une étude existante", () => {
    for (const carte of realisations) expect(trouverEtude(carte.slug)).toBeDefined();
    expect(cheminEtude("site-artisan")).toBe("/realisations/site-artisan");
  });
  it("une seule étude porte la démo", () => {
    expect(etudesDeCas.filter((e) => e.media.type === "demo")).toHaveLength(1);
  });
});

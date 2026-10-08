import { describe, expect, it } from "vitest";
import { placerBarre, semainesEntre } from "./planning";

describe("semainesEntre", () => {
  it("liste les lundis de la première à la dernière semaine, bornes comprises", () => {
    const semaines = semainesEntre("2026-09-09", "2026-10-02"); // mercredi → vendredi
    expect(semaines.map((s) => s.lundi)).toEqual(["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"]);
    expect(semaines[0]).toEqual({ index: 0, lundi: "2026-09-07", libelle: "7 sept." });
  });
});

describe("placerBarre", () => {
  it("donne la colonne de départ et le nombre de semaines couvertes", () => {
    expect(placerBarre("2026-09-07", "2026-10-30", "2026-09-07")).toEqual({ colonne: 0, duree: 8 });
    expect(placerBarre("2026-10-14", "2026-10-16", "2026-09-07")).toEqual({ colonne: 5, duree: 1 });
  });
});

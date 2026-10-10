import { describe, expect, it } from "vitest";
import { realisations } from "./accueil";
import { competences } from "./competences";
import { etudesDeCas } from "./realisations";

describe("competences", () => {
  const toutes = competences.flatMap((groupe) => groupe.elements);

  it("contient chaque techno des réalisations et des études de cas", () => {
    const citees = [...realisations, ...etudesDeCas].flatMap((r) => r.stack);
    expect(citees.filter((techno) => !toutes.includes(techno))).toEqual([]);
  });

  it("ne cite aucune techno deux fois", () => {
    expect(new Set(toutes).size).toBe(toutes.length);
  });
});

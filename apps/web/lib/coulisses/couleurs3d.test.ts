// @vitest-environment node
import { describe, expect, it } from "vitest";
import { couleur } from "@/lib/charte";
import { COULEURS_3D } from "./couleurs3d";

describe("COULEURS_3D", () => {
  it("reprend exactement les rôles de la charte", () => {
    expect(COULEURS_3D).toEqual({
      fond: couleur("fond"),
      surface: couleur("surface"),
      grille: couleur("trait"),
      liaison: couleur("trait-fort"),
      actif: couleur("accent"),
      lieux: {
        "chez-vous": couleur("texte"),
        vps: couleur("lueur"),
        github: couleur("vivant"),
        externe: couleur("texte-doux"),
      },
    });
  });
});

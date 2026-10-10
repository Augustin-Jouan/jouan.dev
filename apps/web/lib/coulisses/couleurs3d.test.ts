// @vitest-environment node
import { describe, expect, it } from "vitest";
import { couleur } from "@/lib/charte";
import { COULEURS_3D } from "./couleurs3d";

describe("COULEURS_3D", () => {
  it("reprend exactement les rôles de la charte", () => {
    expect(COULEURS_3D).toEqual({
      bloc: couleur("texte-doux"),
      actif: couleur("accent"),
      liaison: couleur("trait-fort"),
    });
  });
});

import { Box3 } from "three";
import { describe, expect, it } from "vitest";
import { NOEUDS } from "@/data/architecture";
import { creerAtelier } from "./formes3d";
import { HAUTEUR_ETIQUETTE } from "./geometrie3d";

describe("formes3d", () => {
  it("chaque nœud a son objet, posé sur le sol, sous son étiquette, d'au plus 1,5 de large", () => {
    const atelier = creerAtelier();
    for (const n of NOEUDS) {
      const { groupe, pieces } = atelier.objet(n.id, "#d87f81");
      expect(pieces.length, n.id).toBeGreaterThan(0);
      expect(pieces.every((p) => p.userData.id === n.id), n.id).toBe(true);
      const boite = new Box3().setFromObject(groupe);
      expect(boite.min.y, n.id).toBeGreaterThanOrEqual(-0.01);
      expect(boite.max.y, n.id).toBeLessThanOrEqual(HAUTEUR_ETIQUETTE - 0.3);
      expect(boite.max.x - boite.min.x, n.id).toBeLessThanOrEqual(1.5);
      expect(boite.max.z - boite.min.z, n.id).toBeLessThanOrEqual(1.5);
    }
    atelier.liberer();
  });

  it("des pièces identiques partagent leur géométrie ; un matériau par objet, pour la sélection", () => {
    const atelier = creerAtelier();
    const base = atelier.objet("base", "#d87f81");
    expect(new Set(base.pieces.map((p) => p.geometry)).size).toBe(1);
    expect(base.pieces.every((p) => p.material === base.materiau)).toBe(true);
    expect(atelier.objet("base", "#d87f81").materiau).not.toBe(base.materiau);
    atelier.liberer();
  });
});

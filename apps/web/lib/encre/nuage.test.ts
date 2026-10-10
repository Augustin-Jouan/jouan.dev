import { describe, it, expect } from "vitest";
import { COULEURS_NUAGE, PAS, TRAITS_MAX, nuageFige, opaciteTrait, semerTraits } from "./nuage";
import { couleur } from "../charte";

describe("semerTraits", () => {
  it("donne le même nuage pour la même taille", () => {
    expect(semerTraits(1280, 800)).toEqual(semerTraits(1280, 800));
  });

  it("sème environ un trait par carré de 28 px", () => {
    const n = semerTraits(1280, 800).length;
    expect(n).toBeGreaterThan(0.9 * ((1280 * 800) / (PAS * PAS)));
    expect(n).toBeLessThanOrEqual(TRAITS_MAX);
    expect(semerTraits(390, 844).length).toBeGreaterThan(350);
  });

  it("ne dépasse jamais 1 600 traits, même sur un très grand écran", () => {
    expect(semerTraits(3840, 2160).length).toBeLessThanOrEqual(TRAITS_MAX);
    expect(semerTraits(3840, 2160).length).toBeGreaterThan(1400);
  });

  it("garde chaque trait dans l'écran, de 4 à 8 px de long", () => {
    for (const t of semerTraits(844, 390)) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThanOrEqual(844);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThanOrEqual(390);
      expect(t.longueur).toBeGreaterThanOrEqual(4);
      expect(t.longueur).toBeLessThanOrEqual(8);
    }
  });

  // Relecture finale (I1) : le plafond ne doit pas tronquer la dernière rangée.
  it.each([
    [1440, 900],
    [1680, 939],
    [2560, 1305],
    [719, 1756],
    [3840, 2160],
  ])("couvre tout l'écran %i × %i jusqu'au coin bas droit, sans dépasser le plafond", (largeur, hauteur) => {
    const traits = semerTraits(largeur, hauteur);
    expect(traits.length).toBeLessThanOrEqual(TRAITS_MAX);
    const pas = Math.max(PAS, Math.sqrt((largeur * hauteur) / TRAITS_MAX));
    const dernier = traits[traits.length - 1]!;
    expect(dernier.x).toBeGreaterThan(largeur - 2 * pas);
    expect(dernier.y).toBeGreaterThan(hauteur - 2 * pas);
  });

  it("ne sème rien sur une surface vide", () => {
    expect(semerTraits(0, 0)).toEqual([]);
  });
});

describe("opaciteTrait", () => {
  it("laisse un vide au centre, culmine autour du rayon et s'éteint au double", () => {
    expect(opaciteTrait(0, 160)).toBe(0);
    expect(opaciteTrait(160, 160)).toBeGreaterThan(0.6);
    expect(opaciteTrait(2 * 160, 160)).toBe(0);
  });
});

describe("nuageFige", () => {
  it("emploie les rôles de la charte", () => {
    expect(COULEURS_NUAGE).toEqual([couleur("goutte"), couleur("lueur"), couleur("lueur-chaude"), couleur("texte-doux")]);
    for (const g of nuageFige()) expect(COULEURS_NUAGE).toContain(g.couleur);
  });

  it("regroupe les traits en peu de chemins, avec un nombre de traits borné", () => {
    const groupes = nuageFige();
    expect(groupes.length).toBeLessThanOrEqual(16);
    const traits = groupes.reduce((n, g) => n + (g.chemin.match(/M/g)?.length ?? 0), 0);
    expect(traits).toBeGreaterThan(150);
    expect(traits).toBeLessThan(450);
  });

  it("reste dans le repère du SVG", () => {
    for (const g of nuageFige()) {
      for (const n of g.chemin.match(/-?\d+(\.\d+)?/g)!.map(Number)) expect(Math.abs(n)).toBeLessThanOrEqual(400);
    }
  });
});

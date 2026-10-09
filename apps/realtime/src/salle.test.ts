import { describe, expect, it } from "vitest";
import { PLAFOND_CURSEURS, Salle } from "./salle.js";

function salleDeTest() {
  let n = 0;
  return new Salle(() => `id${++n}`, () => 0);
}

describe("Salle", () => {
  it("compte les présents et donne une couleur à chacun", () => {
    const salle = salleDeTest();
    const a = salle.rejoindre();
    const b = salle.rejoindre();
    expect(salle.nombre).toBe(2);
    expect(a.id).not.toBe(b.id);
    expect(a.couleur).not.toBe(b.couleur);
  });
  it("ne réutilise pas un identifiant présent", () => {
    const ids = ["x", "x", "y"];
    const salle = new Salle(() => ids.shift()!);
    expect(salle.rejoindre().id).toBe("x");
    expect(salle.rejoindre().id).toBe("y");
  });
  it("liste les curseurs visibles, sauf celui demandé", () => {
    const salle = salleDeTest();
    const a = salle.rejoindre();
    const b = salle.rejoindre();
    salle.rejoindre();
    salle.deplacer(a.id, 1, 0.5, 0.25);
    salle.deplacer(b.id, 0, 0.1, 0.2);
    expect(salle.curseurs(a.id)).toEqual([[b.id, b.couleur, 0, 0.1, 0.2]]);
    expect(salle.curseurs()).toHaveLength(2);
  });
  it("extrait un lot des curseurs qui ont bougé, une seule fois", () => {
    const salle = salleDeTest();
    const a = salle.rejoindre();
    salle.deplacer(a.id, 0, 0.1, 0.1);
    salle.deplacer(a.id, 0, 0.2, 0.2);
    expect(salle.extraireLot()).toEqual([[a.id, a.couleur, 0, 0.2, 0.2]]);
    expect(salle.extraireLot()).toEqual([]);
  });
  it("masquer retire le curseur du lot et des visibles", () => {
    const salle = salleDeTest();
    const a = salle.rejoindre();
    salle.deplacer(a.id, 0, 0.1, 0.1);
    expect(salle.masquer(a.id)).toBe(true);
    expect(salle.masquer(a.id)).toBe(false);
    expect(salle.extraireLot()).toEqual([]);
    expect(salle.curseurs()).toEqual([]);
  });
  it("quitter dit si un curseur visible disparaît", () => {
    const salle = salleDeTest();
    const a = salle.rejoindre();
    const b = salle.rejoindre();
    salle.deplacer(a.id, 0, 0.5, 0.5);
    expect(salle.quitter(a.id)).toBe(true);
    expect(salle.quitter(b.id)).toBe(false);
    expect(salle.nombre).toBe(0);
  });
  it("ignore un identifiant inconnu", () => {
    const salle = salleDeTest();
    salle.deplacer("inconnu", 0, 0.5, 0.5);
    expect(salle.masquer("inconnu")).toBe(false);
    expect(salle.quitter("inconnu")).toBe(false);
    expect(salle.extraireLot()).toEqual([]);
  });
  it("un identifiant parti n'entre plus dans le lot en cours", () => {
    const salle = salleDeTest();
    const a = salle.rejoindre();
    const b = salle.rejoindre();
    salle.deplacer(a.id, 0, 0.1, 0.1);
    salle.deplacer(b.id, 0, 0.2, 0.2);
    salle.quitter(a.id);
    expect(salle.extraireLot().map((c) => c[0])).toEqual([b.id]);
  });
  it("plafonne lots et listes à 30 curseurs, les plus récemment bougés", () => {
    const salle = salleDeTest();
    const ids = Array.from({ length: 35 }, () => salle.rejoindre().id);
    ids.forEach((id, i) => salle.deplacer(id, 0, i / 100, 0));
    salle.deplacer(ids[0]!, 1, 0.5, 0.5);
    const lot = salle.extraireLot();
    expect(lot).toHaveLength(PLAFOND_CURSEURS);
    expect(lot.at(-1)![0]).toBe(ids[0]);
    expect(lot.map((c) => c[0])).not.toContain(ids[1]);
    const liste = salle.curseurs(ids[34]);
    expect(liste).toHaveLength(PLAFOND_CURSEURS);
    expect(liste.map((c) => c[0])).not.toContain(ids[34]);
    expect(liste.map((c) => c[0])).toContain(ids[0]);
  });
});

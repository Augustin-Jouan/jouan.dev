import { describe, expect, it, vi } from "vitest";
import { derniere, HISTORIQUE, MagasinMesures, mediane } from "./magasin";

describe("mediane", () => {
  it("vide : null", () => expect(mediane([])).toBeNull());
  it("nombre impair de valeurs : celle du milieu", () => expect(mediane([30, 10, 20])).toBe(20));
  it("nombre pair : moyenne des deux du milieu, arrondie au dixième", () => expect(mediane([10, 11, 40, 2])).toBe(10.5));
});

describe("MagasinMesures", () => {
  it("part de séries vides et disponibles", () => {
    const m = new MagasinMesures();
    expect(m.etat().site).toEqual({ valeurs: [], mediane: null, disponible: true, echecs: 0 });
  });

  it("garde les 30 dernières valeurs et leur médiane", () => {
    const m = new MagasinMesures();
    for (let i = 1; i <= 35; i++) m.ajouter("site", i);
    const s = m.etat().site;
    expect(s.valeurs).toHaveLength(HISTORIQUE);
    expect(s.valeurs[0]).toBe(6);
    expect(derniere(s)).toBe(35);
    expect(s.mediane).toBe(20.5);
  });

  it("indisponible après 3 échecs de suite, de retour à la première réussite", () => {
    const m = new MagasinMesures();
    m.ajouter("base", 3);
    m.echec("base");
    m.echec("base");
    expect(m.etat().base.disponible).toBe(true);
    m.echec("base");
    expect(m.etat().base.disponible).toBe(false);
    m.echec("base");
    expect(m.etat().base.disponible).toBe(false);
    m.ajouter("base", 4);
    expect(m.etat().base).toMatchObject({ disponible: true, echecs: 0, valeurs: [3, 4] });
  });

  it("indisponible d'emblée quand le service manque", () => {
    const m = new MagasinMesures();
    m.indisponible("tempsReel");
    expect(m.etat().tempsReel.disponible).toBe(false);
    expect(m.etat().site.disponible).toBe(true);
  });

  it("prévient ses abonnés et change d'objet à chaque changement seulement", () => {
    const m = new MagasinMesures();
    const fn = vi.fn();
    const desabonner = m.abonner(fn);
    const avant = m.etat();
    expect(m.etat()).toBe(avant);
    m.ajouter("site", 12);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(m.etat()).not.toBe(avant);
    desabonner();
    m.ajouter("site", 13);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

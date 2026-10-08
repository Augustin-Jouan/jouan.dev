import { describe, it, expect } from "vitest";
import {
  BRAISE,
  DUREE_INTRO,
  ENCRE,
  HALO,
  cibleHalo,
  etatEncre,
  etatHalo,
  rayonCouverture,
  suivre,
} from "./chronologie";

const COUVERTURE = 1.2;

describe("etatEncre", () => {
  it("part d'une goutte invisible au centre, sans nom", () => {
    const etat = etatEncre(0, COUVERTURE);
    expect(etat.centre).toEqual({ x: 0.5, y: 0.5 });
    expect(etat.rayon).toBe(0);
    expect(etat.couleur).toEqual(ENCRE);
    expect(etat.opaciteNom).toBe(0);
    expect(etat.terminee).toBe(false);
  });

  it("couvre l'écran à 450 ms puis affiche le nom", () => {
    expect(etatEncre(450, COUVERTURE).rayon).toBeCloseTo(COUVERTURE);
    expect(etatEncre(650, COUVERTURE).opaciteNom).toBe(1);
  });

  it("se rétracte vers le halo entre 800 et 1500 ms en se réchauffant", () => {
    const milieu = etatEncre(1150, COUVERTURE);
    expect(milieu.rayon).toBeLessThan(COUVERTURE);
    expect(milieu.rayon).toBeGreaterThan(HALO.rayon);
    expect(milieu.centre.x).toBeGreaterThan(0.5);
    expect(milieu.centre.y).toBeLessThan(0.5);
    expect(milieu.melange).toBeGreaterThan(0);
    expect(milieu.melange).toBeLessThan(1);
    expect(milieu.opaciteNom).toBe(0);
  });

  it("a un rayon qui ne fait que décroître pendant le retrait", () => {
    let precedent = Infinity;
    for (let t = 800; t <= 1500; t += 50) {
      const { rayon } = etatEncre(t, COUVERTURE);
      expect(rayon).toBeLessThanOrEqual(precedent);
      precedent = rayon;
    }
  });

  it("se termine en halo à 1500 ms et au-delà", () => {
    const fin = etatEncre(DUREE_INTRO, COUVERTURE);
    expect(fin).toEqual(etatHalo({ x: HALO.x, y: HALO.y }));
    expect(fin.terminee).toBe(true);
    expect(fin.couleur).toEqual(BRAISE);
    expect(etatEncre(60_000, COUVERTURE).terminee).toBe(true);
  });

  it("traite un temps négatif comme le début", () => {
    expect(etatEncre(-20, COUVERTURE).rayon).toBe(0);
  });
});

describe("rayonCouverture", () => {
  // Review Focus 2 : l'encre doit couvrir les coins en paysage comme en portrait.
  it.each([
    [1920, 1080],
    [390, 844],
    [844, 390],
    [3440, 1440],
  ])("couvre les quatre coins d'un écran %i × %i", (largeur, hauteur) => {
    const demiDiagonale = Math.hypot(largeur / hauteur / 2, 0.5);
    expect(rayonCouverture(largeur, hauteur)).toBeGreaterThan(demiDiagonale * 1.15);
  });
});

describe("halo", () => {
  it("reste à sa place sans souris", () => {
    expect(cibleHalo(null, 0, false)).toEqual({ x: HALO.x, y: HALO.y });
  });

  it("est attiré d'un quart vers la souris", () => {
    const cible = cibleHalo({ x: 0, y: 0.24 }, 0, false);
    expect(cible.x).toBeCloseTo(HALO.x * 0.75);
    expect(cible.y).toBeCloseTo(HALO.y);
  });

  it("dérive seul, faiblement, sur écran tactile", () => {
    const a = cibleHalo(null, 0, true);
    const b = cibleHalo(null, 5000, true);
    expect(a).not.toEqual(b);
    expect(Math.abs(b.x - HALO.x)).toBeLessThanOrEqual(0.03);
    expect(Math.abs(b.y - HALO.y)).toBeLessThanOrEqual(0.03);
  });

  it("rejoint sa cible avec inertie", () => {
    let point = { x: 0, y: 0 };
    const cible = { x: 1, y: 1 };
    point = suivre(point, cible);
    expect(point.x).toBeGreaterThan(0);
    expect(point.x).toBeLessThan(1);
    for (let i = 0; i < 200; i += 1) point = suivre(point, cible);
    expect(point.x).toBeCloseTo(1, 3);
  });
});

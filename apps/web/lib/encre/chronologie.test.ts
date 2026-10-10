import { describe, it, expect } from "vitest";
import {
  COLONNE_MAX,
  DEBUT_ECLAT,
  DUREE_INTRO,
  GOUTTE,
  HAUTEUR_MAX,
  PLACE,
  cibleNuage,
  etatEncre,
  etatNuage,
  rayonCouverture,
  reposNuage,
  suivre,
} from "./chronologie";

const COUVERTURE = 1.2;
/** Écran d'ordinateur portable : plus petit que le cadre de référence. */
const REPOS = reposNuage(1280, 800);

describe("etatEncre", () => {
  it("part d'une goutte invisible au centre, sans nom ni traits", () => {
    const etat = etatEncre(0, COUVERTURE, REPOS);
    expect(etat.centre).toEqual({ x: 0.5, y: 0.5 });
    expect(etat.rayon).toBe(0);
    expect(etat.opaciteNom).toBe(0);
    expect(etat.eclat).toBe(0);
    expect(etat.terminee).toBe(false);
  });

  it("s'étale encore à 600 ms et couvre l'écran à 900 ms", () => {
    expect(etatEncre(600, COUVERTURE, REPOS).rayon).toBeLessThan(COUVERTURE);
    expect(etatEncre(900, COUVERTURE, REPOS).rayon).toBeCloseTo(COUVERTURE);
  });

  it("affiche le nom en 300 ms puis le laisse lisible jusqu'à 2000 ms", () => {
    expect(etatEncre(1050, COUVERTURE, REPOS).opaciteNom).toBeCloseTo(0.5);
    for (let t = 1200; t < 2000; t += 100) {
      expect(etatEncre(t, COUVERTURE, REPOS).opaciteNom).toBe(1);
      expect(etatEncre(t, COUVERTURE, REPOS).rayon).toBe(COUVERTURE);
    }
  });

  it("se rétracte vers la place du nuage entre 2000 et 2700 ms, sans traits", () => {
    expect(etatEncre(2200, COUVERTURE, REPOS).opaciteNom).toBeCloseTo(0.5);
    const milieu = etatEncre(2350, COUVERTURE, REPOS);
    expect(milieu.rayon).toBeLessThan(COUVERTURE);
    expect(milieu.centre.x).toBeGreaterThan(0.5);
    expect(milieu.centre.y).toBeLessThan(0.5);
    expect(milieu.eclat).toBe(0);
    const fin = etatEncre(DEBUT_ECLAT - 1, COUVERTURE, REPOS);
    expect(fin.centre.x).toBeCloseTo(REPOS.centre.x, 2);
    expect(fin.centre.y).toBeCloseTo(REPOS.centre.y, 2);
    expect(fin.rayon).toBeLessThan(REPOS.rayon);
  });

  it("éclate en traits de 2700 à 3200 ms, pendant que la goutte disparaît", () => {
    expect(DEBUT_ECLAT).toBe(2700);
    const debut = etatEncre(2700, COUVERTURE, REPOS);
    expect(debut.eclat).toBe(0);
    const milieu = etatEncre(2950, COUVERTURE, REPOS);
    expect(milieu.eclat).toBeCloseTo(0.5);
    expect(milieu.centre).toEqual(REPOS.centre);
    expect(etatEncre(2950, COUVERTURE, REPOS).rayon).toBe(0);
    expect(etatEncre(3150, COUVERTURE, REPOS).terminee).toBe(false);
  });

  it("a un rayon qui ne fait que décroître de 2000 ms à la fin", () => {
    let precedent = Infinity;
    for (let t = 2000; t <= 3200; t += 50) {
      const { rayon } = etatEncre(t, COUVERTURE, REPOS);
      expect(rayon).toBeLessThanOrEqual(precedent);
      precedent = rayon;
    }
  });

  it("se termine à 3200 ms : nuage posé, plus de goutte", () => {
    expect(DUREE_INTRO).toBe(3200);
    const fin = etatEncre(DUREE_INTRO, COUVERTURE, REPOS);
    expect(fin).toEqual(etatNuage(REPOS));
    expect(fin).toMatchObject({ rayon: 0, eclat: 1, opaciteNom: 0, terminee: true });
    expect(etatEncre(60_000, COUVERTURE, REPOS).terminee).toBe(true);
  });

  it("traite un temps négatif comme le début", () => {
    expect(etatEncre(-20, COUVERTURE, REPOS).rayon).toBe(0);
  });

  it("garde la goutte pêche de la charte", () => {
    expect(GOUTTE).toEqual([0xea / 255, 0xb5 / 255, 0x95 / 255]);
  });
});

describe("rayonCouverture", () => {
  // Review Focus 2 (sous-projet 1) : l'encre doit couvrir les coins en paysage comme en portrait.
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

describe("reposNuage", () => {
  it("se pose à la place de l'ancien halo, en fractions de l'écran quand il tient dans le cadre", () => {
    expect(REPOS).toEqual({ centre: { x: 0.8, y: 0.24 }, rayon: 0.2 });
    expect(PLACE).toEqual({ x: 0.8, y: 0.24, rayon: 0.2 });
    expect(reposNuage(390, 844).centre.x).toBeCloseTo(0.8);
  });

  it("reste au-dessus de la colonne de contenu sur un très grand écran", () => {
    const repos = reposNuage(2560, 1300);
    const marge = (2560 - COLONNE_MAX) / 2;
    expect(repos.centre.x * 2560).toBeCloseTo(marge + PLACE.x * COLONNE_MAX);
    expect(repos.rayon * 1300).toBeCloseTo(PLACE.rayon * HAUTEUR_MAX);
    expect(repos.centre.y * 1300).toBeCloseTo(PLACE.y * HAUTEUR_MAX);
  });
});

describe("nuage", () => {
  const place = { x: 0.8, y: 0.24 };

  it("vise le pointeur (souris ou doigt), sinon sa place", () => {
    expect(cibleNuage({ x: 0.1, y: 0.9 }, place)).toEqual({ x: 0.1, y: 0.9 });
    expect(cibleNuage(null, place)).toEqual(place);
  });

  it("rejoint sa cible avec un léger retard", () => {
    let point = { x: 0, y: 0 };
    const cible = { x: 1, y: 0 };
    point = suivre(point, cible);
    expect(point.x).toBeCloseTo(0.07);
    for (let i = 0; i < 200; i += 1) point = suivre(point, cible);
    expect(point.x).toBeCloseTo(1, 3);
  });
});

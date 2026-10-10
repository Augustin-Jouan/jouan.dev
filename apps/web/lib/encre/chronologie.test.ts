import { describe, it, expect } from "vitest";
import {
  COLONNE_MAX,
  DUREE_INTRO,
  GOUTTE,
  HALO,
  HAUTEUR_MAX,
  LUEUR,
  LUEUR_CHAUDE,
  cibleHalo,
  etatEncre,
  etatHalo,
  rayonCouverture,
  reposHalo,
  suivre,
} from "./chronologie";

const COUVERTURE = 1.2;
/** Écran d'ordinateur portable : plus petit que le cadre de référence. */
const REPOS = reposHalo(1280, 800);

describe("etatEncre", () => {
  it("part d'une goutte invisible au centre, sans nom", () => {
    const etat = etatEncre(0, COUVERTURE, REPOS);
    expect(etat.centre).toEqual({ x: 0.5, y: 0.5 });
    expect(etat.rayon).toBe(0);
    expect(etat.couleur).toEqual(GOUTTE);
    expect(etat.opaciteNom).toBe(0);
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

  it("se rétracte vers le halo entre 2000 et 3200 ms en se réchauffant", () => {
    expect(etatEncre(2200, COUVERTURE, REPOS).opaciteNom).toBeCloseTo(0.5);
    const milieu = etatEncre(2600, COUVERTURE, REPOS);
    expect(milieu.rayon).toBeLessThan(COUVERTURE);
    expect(milieu.rayon).toBeGreaterThan(REPOS.rayon);
    expect(milieu.centre.x).toBeGreaterThan(0.5);
    expect(milieu.centre.y).toBeLessThan(0.5);
    expect(milieu.melange).toBeGreaterThan(0);
    expect(milieu.melange).toBeLessThan(1);
    expect(milieu.opaciteNom).toBe(0);
  });

  it("a un rayon qui ne fait que décroître pendant le retrait", () => {
    let precedent = Infinity;
    for (let t = 2000; t <= 3200; t += 50) {
      const { rayon } = etatEncre(t, COUVERTURE, REPOS);
      expect(rayon).toBeLessThanOrEqual(precedent);
      precedent = rayon;
    }
  });

  it("se termine en halo à 3200 ms et au-delà", () => {
    expect(DUREE_INTRO).toBe(3200);
    expect(etatEncre(3150, COUVERTURE, REPOS).terminee).toBe(false);
    const fin = etatEncre(DUREE_INTRO, COUVERTURE, REPOS);
    expect(fin).toEqual(etatHalo(REPOS.centre, REPOS));
    expect(fin.terminee).toBe(true);
    expect(fin.couleur).toEqual(LUEUR);
    expect(etatEncre(60_000, COUVERTURE, REPOS).terminee).toBe(true);
  });

  it("traite un temps négatif comme le début", () => {
    expect(etatEncre(-20, COUVERTURE, REPOS).rayon).toBe(0);
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

describe("reposHalo", () => {
  it("reprend les fractions de l'écran quand l'écran tient dans le cadre", () => {
    expect(REPOS).toEqual({ centre: { x: HALO.x, y: HALO.y }, rayon: HALO.rayon, flou: HALO.flou });
    expect(reposHalo(390, 844).centre.x).toBeCloseTo(HALO.x);
  });

  it("reste au-dessus de la colonne de contenu sur un très grand écran", () => {
    const repos = reposHalo(2560, 1300);
    const marge = (2560 - COLONNE_MAX) / 2;
    expect(repos.centre.x * 2560).toBeCloseTo(marge + HALO.x * COLONNE_MAX);
    // Taille et hauteur figées à celles d'un écran de HAUTEUR_MAX px.
    expect(repos.rayon * 1300).toBeCloseTo(HALO.rayon * HAUTEUR_MAX);
    expect(repos.centre.y * 1300).toBeCloseTo(HALO.y * HAUTEUR_MAX);
    expect(repos.flou * 1300).toBeCloseTo(HALO.flou * HAUTEUR_MAX);
  });
});

describe("halo", () => {
  const place = { x: 0.7, y: 0.2 };

  it("reste à sa place sans souris", () => {
    expect(cibleHalo(null, 0, false, place)).toEqual(place);
  });

  it("est attiré d'un quart vers la souris", () => {
    const cible = cibleHalo({ x: 0, y: 0.2 }, 0, false, place);
    expect(cible.x).toBeCloseTo(0.7 * 0.75);
    expect(cible.y).toBeCloseTo(0.2);
  });

  it("dérive seul, faiblement, sur écran tactile", () => {
    const a = cibleHalo(null, 0, true, place);
    const b = cibleHalo(null, 5000, true, place);
    expect(a).not.toEqual(b);
    expect(Math.abs(b.x - place.x)).toBeLessThanOrEqual(0.03);
    expect(Math.abs(b.y - place.y)).toBeLessThanOrEqual(0.03);
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

describe("couleurs de l'intro", () => {
  const rvb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

  it("part d'une goutte pêche et finit en halo corail, bordé de rose", () => {
    expect(GOUTTE).toEqual(rvb("#eab595"));
    expect(LUEUR).toEqual(rvb("#d87f81"));
    expect(LUEUR_CHAUDE).toEqual(rvb("#ae6378"));
  });

  it("passe de la goutte au halo pendant le resserrement", () => {
    // 2600 ms : entre la fin du nom (2000 ms) et la fin de l'intro (3200 ms).
    const milieu = etatEncre(2600, COUVERTURE, REPOS);
    for (let i = 0; i < 3; i++) {
      const [bas, haut] = [GOUTTE[i]!, LUEUR[i]!].sort((x, y) => x - y);
      expect(milieu.couleur[i]).toBeGreaterThanOrEqual(bas!);
      expect(milieu.couleur[i]).toBeLessThanOrEqual(haut!);
    }
    expect(milieu.melange).toBeGreaterThan(0);
    expect(milieu.melange).toBeLessThan(1);
  });
});

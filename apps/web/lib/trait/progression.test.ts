import { describe, expect, it } from "vitest";
import { longueurPour, ordonnerReperes, pointA } from "./progression";

describe("ordonnerReperes", () => {
  it("rend les ordonnées strictement croissantes, sans toucher aux longueurs", () => {
    expect(
      ordonnerReperes([
        { l: 0, y: 100 },
        { l: 10, y: 100 },
        { l: 20, y: 90 },
        { l: 30, y: 200 },
      ]),
    ).toEqual([
      { l: 0, y: 100 },
      { l: 10, y: 101 },
      { l: 20, y: 102 },
      { l: 30, y: 200 },
    ]);
  });
});

describe("longueurPour", () => {
  const reperes = [
    { l: 0, y: 100 },
    { l: 50, y: 200 },
    { l: 250, y: 300 },
  ];

  it("vaut 0 avant le départ et la longueur totale après la fin", () => {
    expect(longueurPour(0, reperes)).toBe(0);
    expect(longueurPour(100, reperes)).toBe(0);
    expect(longueurPour(300, reperes)).toBe(250);
    expect(longueurPour(5_000, reperes)).toBe(250);
  });

  it("interpole entre deux repères", () => {
    expect(longueurPour(150, reperes)).toBe(25);
    expect(longueurPour(250, reperes)).toBe(150);
  });

  it("ne recule jamais quand la ligne de lecture descend", () => {
    let precedente = -1;
    for (let t = 0; t <= 400; t += 7) {
      const l = longueurPour(t, reperes);
      expect(l).toBeGreaterThanOrEqual(precedente);
      precedente = l;
    }
  });

  it("vaut 0 sans repère", () => {
    expect(longueurPour(500, [])).toBe(0);
  });
});

describe("pointA", () => {
  // Échantillons tous les 4 px le long d'un trait horizontal de 10 px.
  const echantillons = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 8, y: 0 },
    { x: 10, y: 0 },
  ];

  it("interpole entre deux échantillons", () => {
    expect(pointA(6, echantillons, 10)).toEqual({ x: 6, y: 0 });
  });

  it("borne au début et à la fin", () => {
    expect(pointA(-3, echantillons, 10)).toEqual({ x: 0, y: 0 });
    expect(pointA(10, echantillons, 10)).toEqual({ x: 10, y: 0 });
    expect(pointA(99, echantillons, 10)).toEqual({ x: 10, y: 0 });
  });
});

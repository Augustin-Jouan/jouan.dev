import { describe, expect, it } from "vitest";
import { CADRES, LIAISONS, NOEUD_PAR_DEFAUT, NOEUDS, type Point, type Variante } from "./architecture";

type Boite = { x0: number; y0: number; x1: number; y1: number };
const MARGE = 4;
/** Estimations prudentes, en unités SVG : nom en 15 px gras, libellé de latence en 13 px (« indisponible »). */
const LARGEUR_CARACTERE_NOM = 9;
const LARGEUR_LIBELLE = 80;
/** Demi-épaisseur du trait le plus épais (nœud choisi ou focus). */
const DEMI_TRAIT = 2;

const disjointes = (A: Boite, B: Boite) => A.x1 <= B.x0 || B.x1 <= A.x0 || A.y1 <= B.y0 || B.y1 <= A.y0;

const boite = (p: Point, v: Variante, marge = 0): Boite => {
  const { largeur, hauteur } = CADRES[v].noeud;
  return { x0: p.x - largeur / 2 - marge, y0: p.y - hauteur / 2 - marge, x1: p.x + largeur / 2 + marge, y1: p.y + hauteur / 2 + marge };
};

/** Le segment [a, b] traverse-t-il la boîte ? (Liang–Barsky) */
function traverse(a: Point, b: Point, r: Boite): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const bords: [number, number][] = [
    [-dx, a.x - r.x0],
    [dx, r.x1 - a.x],
    [-dy, a.y - r.y0],
    [dy, r.y1 - a.y],
  ];
  for (const [p, q] of bords) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      t0 = Math.max(t0, t);
    } else {
      if (t < t0) return false;
      t1 = Math.min(t1, t);
    }
  }
  return t0 <= t1;
}

const ids = NOEUDS.map((n) => n.id);

describe("architecture", () => {
  it("des identifiants uniques et un nœud par défaut qui existe", () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(NOEUD_PAR_DEFAUT);
  });

  it("chaque liaison relie deux nœuds existants, sans doublon", () => {
    for (const l of LIAISONS) {
      expect(ids).toContain(l.de);
      expect(ids).toContain(l.vers);
    }
    const cles = LIAISONS.map((l) => `${l.de}>${l.vers}`);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("chaque mesure figure sur une liaison et sur un nœud, une seule fois", () => {
    for (const serie of ["site", "base", "tempsReel"] as const) {
      expect(LIAISONS.filter((l) => l.mesure === serie)).toHaveLength(1);
      expect(NOEUDS.filter((n) => n.mesure === serie)).toHaveLength(1);
    }
  });

  it("des textes complets, sans adresse ni hébergeur nommé", () => {
    for (const n of NOEUDS) {
      for (const texte of [n.nom, n.role, n.techno, n.pourquoi]) expect(texte.trim().length).toBeGreaterThan(0);
      expect(`${n.role} ${n.techno} ${n.pourquoi}`).not.toMatch(/\d+\.\d+\.\d+\.\d+|https?:\/\/|ovh/i);
    }
  });

  describe.each(["large", "etroite"] as const)("variante %s", (v) => {
    const cadre = CADRES[v];

    it("chaque nœud tient dans le cadre, trait compris", () => {
      for (const n of NOEUDS) {
        const b = boite(n.positions[v], v, DEMI_TRAIT);
        expect(b.x0).toBeGreaterThanOrEqual(0);
        expect(b.y0).toBeGreaterThanOrEqual(0);
        expect(b.x1).toBeLessThanOrEqual(cadre.largeur);
        expect(b.y1).toBeLessThanOrEqual(cadre.hauteur);
      }
    });

    it("aucun nœud n'en chevauche un autre", () => {
      for (const a of NOEUDS)
        for (const b of NOEUDS) {
          if (a.id >= b.id) continue;
          const A = boite(a.positions[v], v, MARGE);
          const B = boite(b.positions[v], v, MARGE);
          expect(disjointes(A, B), `${a.id} / ${b.id}`).toBe(true);
        }
    });

    it("aucune liaison ne traverse un nœud qui n'est pas l'une de ses extrémités", () => {
      const position = (id: string) => NOEUDS.find((n) => n.id === id)!.positions[v];
      for (const l of LIAISONS)
        for (const n of NOEUDS) {
          if (n.id === l.de || n.id === l.vers) continue;
          expect(traverse(position(l.de), position(l.vers), boite(n.positions[v], v, MARGE)), `${l.de}>${l.vers} traverse ${n.id}`).toBe(false);
        }
    });

    it("chaque nom tient dans son nœud", () => {
      for (const n of NOEUDS) expect(n.nom.length * LARGEUR_CARACTERE_NOM + 16, n.id).toBeLessThanOrEqual(cadre.noeud.largeur);
    });

    it("aucun libellé de latence ne recouvre un nœud", () => {
      const position = (id: string) => NOEUDS.find((n) => n.id === id)!.positions[v];
      for (const l of LIAISONS) {
        if (!l.mesure) continue;
        const a = position(l.de);
        const b = position(l.vers);
        // Même placement que Schema.tsx : au milieu de la liaison, ligne de base 8 unités au-dessus.
        const x = (a.x + b.x) / 2;
        const y = (a.y + b.y) / 2 - 8;
        const libelle = { x0: x - LARGEUR_LIBELLE / 2, x1: x + LARGEUR_LIBELLE / 2, y0: y - 12, y1: y + 4 };
        for (const n of NOEUDS) expect(disjointes(libelle, boite(n.positions[v], v, MARGE)), `${l.de}>${l.vers} / ${n.id}`).toBe(true);
      }
    });
  });
});

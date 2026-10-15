import { describe, expect, it } from "vitest";
import { LIAISONS, NOEUDS } from "@/data/architecture";
import {
  ANGLE_CAMERA,
  BALANCEMENT,
  CHAMP_VERTICAL,
  cadrage,
  periodePaquet,
  plateaux,
  pointsAVoir,
  positionSol,
  socles,
  tourner,
  type Disposition,
  type Point3,
} from "./geometrie3d";

/** Projection perspective d'une caméra posée à `distance` de `cible`, inclinée de `angle` depuis la verticale. */
function projeter(p: Point3, cible: Point3, distance: number, angle: number, aspect: number) {
  const c = { x: cible.x, y: cible.y + distance * Math.cos(angle), z: cible.z + distance * Math.sin(angle) };
  const f = { x: cible.x - c.x, y: cible.y - c.y, z: cible.z - c.z };
  const nf = Math.hypot(f.x, f.y, f.z);
  const av = { x: f.x / nf, y: f.y / nf, z: f.z / nf };
  // droite = avant × haut(0, 1, 0) ; haut de l'image = droite × avant.
  const dr = { x: -av.z, y: 0, z: av.x };
  const nd = Math.hypot(dr.x, dr.z);
  const droite = { x: dr.x / nd, y: 0, z: dr.z / nd };
  const haut = { x: droite.y * av.z - droite.z * av.y, y: droite.z * av.x - droite.x * av.z, z: droite.x * av.y - droite.y * av.x };
  const v = { x: p.x - c.x, y: p.y - c.y, z: p.z - c.z };
  const profondeur = v.x * av.x + v.y * av.y + v.z * av.z;
  const t = Math.tan((CHAMP_VERTICAL * Math.PI) / 360);
  return {
    x: (v.x * droite.x + v.y * droite.y + v.z * droite.z) / (profondeur * t * aspect),
    y: (v.x * haut.x + v.y * haut.y + v.z * haut.z) / (profondeur * t),
  };
}

const DISPOSITIONS: Disposition[] = ["large", "etroite"];

for (const d of DISPOSITIONS) {
  describe(`geometrie3d, disposition « ${d} »`, () => {
    const plats = plateaux(NOEUDS, d);
    const ronds = socles(NOEUDS, d);

    it("deux nœuds distincts n'ont jamais la même place", () => {
      const cles = NOEUDS.map((n) => `${positionSol(n.id, d).x},${positionSol(n.id, d).z}`);
      expect(new Set(cles).size).toBe(cles.length);
    });

    it("un plateau pour le VPS, un pour GitHub, nommés ; un socle par service externe et pour le navigateur", () => {
      expect(plats.map((p) => [p.lieu, p.nom])).toEqual([
        ["vps", "VPS en France · Coolify"],
        ["github", "GitHub"],
      ]);
      expect(ronds.map((s) => [s.id, s.lieu, s.nom])).toEqual([
        ["navigateur", "chez-vous", undefined],
        ["statistiques", "externe", "Umami Cloud"],
        ["mails", "externe", "Fournisseur SMTP"],
      ]);
    });

    it("GitHub est derrière le VPS : son nom se met derrière lui, pour ne pas être caché", () => {
      expect(plats.map((p) => [p.lieu, p.nomDerriere])).toEqual([
        ["vps", false],
        ["github", true],
      ]);
    });

    it("chaque nœud est posé sur le plateau de son lieu, à au moins une unité du bord, ou au centre de son socle", () => {
      for (const n of NOEUDS) {
        const p = positionSol(n.id, d);
        const plat = plats.find((pl) => pl.lieu === n.lieu);
        if (plat) {
          expect(Math.abs(p.x - plat.x), n.id).toBeLessThanOrEqual(plat.largeur / 2 - 1);
          expect(Math.abs(p.z - plat.z), n.id).toBeLessThanOrEqual(plat.profondeur / 2 - 1);
          for (const autre of plats.filter((pl) => pl !== plat))
            expect(Math.abs(p.x - autre.x) > autre.largeur / 2 || Math.abs(p.z - autre.z) > autre.profondeur / 2, n.id).toBe(true);
        } else {
          expect(ronds.find((s) => s.id === n.id), n.id).toMatchObject({ x: p.x, z: p.z });
        }
      }
    });

    it("plateaux et socles ne se touchent pas : un vide d'au moins 0,4 entre deux supports", () => {
      const ecartRectangles = (a: (typeof plats)[0], b: (typeof plats)[0]) =>
        Math.max(Math.abs(a.x - b.x) - (a.largeur + b.largeur) / 2, Math.abs(a.z - b.z) - (a.profondeur + b.profondeur) / 2);
      const ecartRectRond = (a: (typeof plats)[0], s: (typeof ronds)[0]) => {
        const dx = Math.max(0, Math.abs(s.x - a.x) - a.largeur / 2);
        const dz = Math.max(0, Math.abs(s.z - a.z) - a.profondeur / 2);
        return Math.hypot(dx, dz) - s.rayon;
      };
      expect(ecartRectangles(plats[0]!, plats[1]!)).toBeGreaterThanOrEqual(0.4);
      for (const p of plats) for (const s of ronds) expect(ecartRectRond(p, s), `${p.lieu} / ${s.id}`).toBeGreaterThanOrEqual(0.4);
      ronds.forEach((a, i) =>
        ronds.slice(i + 1).forEach((b) => expect(Math.hypot(a.x - b.x, a.z - b.z) - a.rayon - b.rayon).toBeGreaterThanOrEqual(0.4)),
      );
    });
  });
}

describe("geometrie3d, mise en ligne", () => {
  it("elle passe d'un plateau à l'autre : le registre (GitHub) mène au déploiement (VPS)", () => {
    expect(LIAISONS).toContainEqual({ de: "registre", vers: "deploiement" });
    expect(NOEUDS.find((n) => n.id === "registre")!.lieu).toBe("github");
    expect(NOEUDS.find((n) => n.id === "deploiement")!.lieu).toBe("vps");
  });
});

describe("geometrie3d, caméra", () => {
  for (const [nom, d, aspect] of [
    ["ordinateur", "large", 960 / 420],
    ["très large", "large", 16 / 5],
    ["téléphone", "etroite", 360 / 820],
    ["téléphone très haut", "etroite", 320 / 820],
  ] as const) {
    it(`${nom} : toute la scène tient dans le champ, même balancée, sans recul inutile`, () => {
      const { distance, cible } = cadrage(NOEUDS, d, aspect);
      const points = pointsAVoir(NOEUDS, d);
      const dans = (dist: number, balancement: number) =>
        points.every((p) => {
          const e = projeter(tourner(p, balancement, cible), cible, dist, ANGLE_CAMERA[d], aspect);
          return Math.abs(e.x) <= 1 && Math.abs(e.y) <= 1;
        });
      for (const b of [-BALANCEMENT[d], 0, BALANCEMENT[d]]) expect(dans(distance, b), `balancement ${b}`).toBe(true);
      expect([-BALANCEMENT[d], 0, BALANCEMENT[d]].some((b) => !dans(distance * 0.85, b))).toBe(true);
    });
  }

  it("téléphone : la scène remplit la hauteur du cadre (plus des trois quarts), au lieu d'y flotter", () => {
    const aspect = 360 / 820;
    const { distance, cible } = cadrage(NOEUDS, "etroite", aspect);
    const ys = pointsAVoir(NOEUDS, "etroite").map((p) => projeter(p, cible, distance, ANGLE_CAMERA.etroite, aspect).y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(1.5);
  });
});

describe("geometrie3d, paquets", () => {
  it("plus rapides quand la latence est basse, dans des bornes", () => {
    expect(periodePaquet(null)).toBe(1.5);
    expect(periodePaquet(5)).toBe(0.6);
    expect(periodePaquet(100)).toBe(2);
    expect(periodePaquet(10_000)).toBe(4);
  });
});

import { describe, expect, it } from "vitest";
import { NOEUDS, noeudDe } from "@/data/architecture";
import { DISTANCE_MIN, distanceCamera, periodePaquet, position3d } from "./geometrie3d";

describe("geometrie3d", () => {
  it("reprend la disposition large, centrée, le déploiement en retrait", () => {
    expect(position3d(noeudDe("site"))[2]).toBe(0);
    expect(position3d(noeudDe("registre"))[2]).toBeLessThan(0);
    const xs = NOEUDS.map((n) => position3d(n)[0]);
    expect(Math.min(...xs)).toBeLessThan(0);
    expect(Math.max(...xs)).toBeGreaterThan(0);
  });

  it("deux nœuds distincts n'ont jamais la même position", () => {
    const cles = NOEUDS.map((n) => position3d(n).join(","));
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("paquets plus rapides quand la latence est basse, dans des bornes", () => {
    expect(periodePaquet(null)).toBe(1.5);
    expect(periodePaquet(5)).toBe(0.6);
    expect(periodePaquet(100)).toBe(2);
    expect(periodePaquet(10_000)).toBe(4);
  });

  it("cadre étroit (mobile) : la caméra recule assez pour que chaque bloc soit dans le champ", () => {
    const aspect = 360 / 820;
    const d = distanceCamera(NOEUDS, aspect);
    const demiChamp = d * Math.tan((45 * Math.PI) / 360) * aspect;
    for (const n of NOEUDS) expect(Math.abs(position3d(n)[0]) + 1.2).toBeLessThanOrEqual(demiChamp);
  });

  it("cadre large : la distance d'origine, sans zoom arrière", () => {
    expect(distanceCamera(NOEUDS, 960 / 420)).toBe(DISTANCE_MIN);
    expect(distanceCamera(NOEUDS, 360 / 820)).toBeGreaterThan(DISTANCE_MIN);
  });
});

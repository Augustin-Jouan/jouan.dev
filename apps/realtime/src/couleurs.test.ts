import { describe, expect, it } from "vitest";
import { choisirCouleur, PALETTE } from "./couleurs.js";

/** Contraste WCAG entre deux couleurs `#rrggbb`. */
function contraste(a: string, b: string): number {
  const lum = (h: string) => {
    const [r, g, v] = [1, 3, 5].map((i) => {
      const c = parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * v!;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
}

describe("palette", () => {
  it("compte six teintes distinctes", () => {
    expect(new Set(PALETTE).size).toBe(6);
  });
  it("reste lisible sur le papier (contraste ≥ 3:1)", () => {
    for (const c of PALETTE) expect(contraste(c, "#f3efe7")).toBeGreaterThanOrEqual(3);
  });
});

describe("choisirCouleur", () => {
  it("évite une couleur déjà prise", () => {
    const prises = PALETTE.slice(0, 5);
    expect(choisirCouleur(prises, () => 0)).toBe(PALETTE[5]);
  });
  it("tire parmi les libres", () => {
    expect(choisirCouleur([], () => 0.99)).toBe(PALETTE[5]);
    expect(choisirCouleur([], () => 0)).toBe(PALETTE[0]);
  });
  it("quand tout est pris, reprend la moins utilisée", () => {
    const prises = [...PALETTE, ...PALETTE.filter((c) => c !== PALETTE[3])];
    expect(choisirCouleur(prises, () => 0)).toBe(PALETTE[3]);
  });
});

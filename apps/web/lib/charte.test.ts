import { describe, expect, it } from "vitest";
import { CONTRASTES_EXIGES, ROLES, TEINTES, contraste, couleur } from "./charte";

describe("contraste", () => {
  it("donne 21 entre le noir et le blanc, 1 entre deux couleurs identiques", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contraste("#2a2127", "#2a2127")).toBe(1);
  });

  it("ne dépend pas de l'ordre", () => {
    expect(contraste("#f3efe7", "#2a2127")).toBeCloseTo(contraste("#2a2127", "#f3efe7"), 10);
  });

  it("retrouve les ratios de la spec", () => {
    expect(contraste(TEINTES.papier, TEINTES.nuit)).toBeCloseTo(13.61, 1);
    expect(contraste(TEINTES.peche, TEINTES.nuit)).toBeCloseTo(8.58, 1);
    expect(contraste(TEINTES.sauge, TEINTES["nuit-haute"])).toBeCloseTo(4.3, 1);
  });
});

describe("rôles", () => {
  it("renvoient chacun une teinte existante", () => {
    for (const teinte of Object.values(ROLES)) expect(TEINTES).toHaveProperty(teinte);
  });

  it("donnent leur couleur en hexadécimal minuscule", () => {
    expect(couleur("fond")).toBe("#2a2127");
    expect(couleur("accent")).toBe("#eab595");
    expect(couleur("lueur-chaude")).toBe("#ae6378");
    for (const valeur of Object.values(TEINTES)) expect(valeur).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("contrastes exigés", () => {
  it.each(CONTRASTES_EXIGES.map((c) => [c.avant, c.arriere, c.minimum] as const))(
    "%s sur %s atteint %s:1",
    (avant, arriere, minimum) => {
      expect(contraste(couleur(avant), couleur(arriere))).toBeGreaterThanOrEqual(minimum);
    },
  );

  it("couvrent le texte, l'accent, l'alerte et les contours sur le fond et sur les cartes", () => {
    const paires = new Set(CONTRASTES_EXIGES.map((c) => `${c.avant}/${c.arriere}`));
    for (const avant of ["texte", "texte-doux", "accent", "alerte", "trait-fort"] as const) {
      expect(paires).toContain(`${avant}/fond`);
      expect(paires).toContain(`${avant}/surface`);
    }
    expect(paires).toContain("sur-accent/accent");
    expect(paires).toContain("sur-accent/goutte");
    expect(paires).toContain("vivant/surface");
  });
});

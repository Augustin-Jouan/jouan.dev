import { describe, it, expect } from "vitest";
import { ANCRES, accroche, etapes, offres, parcours, realisations, sections } from "./accueil";
import { navLinks } from "./navigation";

/** Toutes les chaînes d'une valeur, en profondeur. */
function textes(valeur: unknown): string[] {
  if (typeof valeur === "string") return [valeur];
  if (Array.isArray(valeur)) return valeur.flatMap(textes);
  if (typeof valeur === "object" && valeur !== null) return Object.values(valeur).flatMap(textes);
  return [];
}

const ancres = new Set(Object.values(ANCRES).map((id) => `#${id}`));

describe("contenu de l'accueil", () => {
  it("met en avant une seule offre : l'application métier", () => {
    const misesEnAvant = offres.filter((offre) => offre.miseEnAvant);
    expect(misesEnAvant.map((offre) => offre.id)).toEqual(["application"]);
    expect(offres[0].id).toBe("application");
  });

  it("décrit chaque offre avec au moins un livrable", () => {
    for (const offre of offres) expect(offre.livrables.length).toBeGreaterThan(0);
  });

  it("présente deux réalisations complètes", () => {
    expect(realisations).toHaveLength(2);
    for (const r of realisations) {
      expect(r.besoin).not.toBe("");
      expect(r.livre).not.toBe("");
      expect(r.stack.length).toBeGreaterThan(0);
    }
  });

  it("décrit la méthode en cinq étapes", () => {
    expect(etapes).toHaveLength(5);
  });

  it("donne un parcours de trois lignes", () => {
    expect(parcours).toHaveLength(3);
  });

  it("fait pointer les actions de l'accroche vers des sections existantes", () => {
    expect(ancres.has(accroche.actionPrincipale.href)).toBe(true);
    expect(ancres.has(accroche.actionSecondaire.href)).toBe(true);
  });

  it("fait pointer la navigation de l'en-tête vers des sections existantes", () => {
    for (const lien of navLinks) expect(ancres.has(lien.href.replace(/^\//, ""))).toBe(true);
  });

  it("ne laisse aucun placeholder entre crochets", () => {
    const tout = textes({ sections, accroche, offres, realisations, etapes, parcours });
    expect(tout.filter((texte) => /\[[^\]]*\]/.test(texte))).toEqual([]);
  });
});

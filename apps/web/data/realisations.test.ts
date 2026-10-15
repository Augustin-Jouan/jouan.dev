import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { realisations } from "./accueil";
import { apercuEtude, cheminEtude, etudesDeCas, trouverEtude } from "./realisations";

describe("études de cas", () => {
  it("ont des slugs uniques et trois chiffres clés", () => {
    expect(new Set(etudesDeCas.map((e) => e.slug)).size).toBe(etudesDeCas.length);
    for (const etude of etudesDeCas) expect(etude.chiffres).toHaveLength(3);
  });
  it("chaque carte de l'accueil mène à une étude existante", () => {
    for (const carte of realisations) expect(trouverEtude(carte.slug)).toBeDefined();
    expect(cheminEtude("suivi-de-marches")).toBe("/realisations#suivi-de-marches");
    expect(cheminEtude("site-artisan")).toBe("/realisations#site-vitrine");
  });
  it("chaque étude a un aperçu pour l'accueil : la vraie capture, à ses vraies dimensions", () => {
    expect(apercuEtude("suivi-de-marches").src).toBe("/realisations/suivi-de-marches/apercu.webp");
    expect(apercuEtude("site-artisan").src).toBe("/realisations/site-artisan/ordinateur.webp");
    for (const { slug } of etudesDeCas) {
      const { src, largeur, hauteur } = apercuEtude(slug);
      // En-tête WebP « VP8 » : largeur et hauteur sur 14 bits, aux octets 26 et 28.
      const fichier = readFileSync(join(process.cwd(), "public", src));
      expect([fichier.readUInt16LE(26) & 0x3fff, fichier.readUInt16LE(28) & 0x3fff]).toEqual([largeur, hauteur]);
    }
  });
  it("une seule étude porte la démo", () => {
    expect(etudesDeCas.filter((e) => e.media.type === "demo")).toHaveLength(1);
  });
});

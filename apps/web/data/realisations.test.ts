import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { realisations } from "./accueil";
import { apercuEtude, categorieDeAncre, categories, cheminEtude, etudesDeCas, trouverEtude } from "./realisations";

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
  it("chaque étude porte une démo navigable, servie sous /demo/", () => {
    for (const { media } of etudesDeCas) {
      expect(media.type).toBe("demo");
      if (media.type === "demo") expect(media.source).toMatch(/^\/demo\//);
    }
  });
  it("la légende de la copie du site d'artisan donne sa date, en toutes lettres", () => {
    const media = trouverEtude("site-artisan")!.media;
    expect(media.type === "demo" && media.legende).toMatch(/^Copie du site au \d{1,2} [a-zéû]+ \d{4}\. Le formulaire n'envoie rien\.$/);
  });
});

describe("catégories de /realisations", () => {
  it("deux onglets, l'application métier d'abord ; chacun a au moins une étude", () => {
    expect(categories).toEqual([
      { id: "application-metier", libelle: "Application métier" },
      { id: "site-vitrine", libelle: "Site vitrine" },
    ]);
    for (const { id } of categories) expect(etudesDeCas.some((e) => e.categorie === id), id).toBe(true);
    expect(trouverEtude("suivi-de-marches")!.categorie).toBe("application-metier");
    expect(trouverEtude("site-artisan")!.categorie).toBe("site-vitrine");
  });
  it("l'ancre de l'adresse choisit l'onglet : celle d'un onglet, ou celle d'une étude ; sinon le premier", () => {
    expect(categorieDeAncre("#site-vitrine")).toBe("site-vitrine");
    expect(categorieDeAncre("#application-metier")).toBe("application-metier");
    expect(categorieDeAncre("#suivi-de-marches")).toBe("application-metier");
    expect(categorieDeAncre("")).toBe("application-metier");
    expect(categorieDeAncre("#inconnue")).toBe("application-metier");
    expect(categorieDeAncre("#%E0%A4%A")).toBe("application-metier");
  });
});

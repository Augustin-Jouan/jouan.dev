import { describe, it, expect } from "vitest";
import {
  ANCRES,
  accroche,
  accrochesParAngle,
  etapes,
  offres,
  offresPour,
  parcours,
  realisations,
  salutation,
  sections,
  texteParcours,
} from "./accueil";
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

  it("illustre chaque offre par une étude de cas existante, à la place d'une phrase d'exemple", () => {
    expect(offres.map((offre) => offre.etude)).toEqual(["suivi-de-marches", "site-artisan"]);
    for (const offre of offres) {
      expect(realisations.some((r) => r.slug === offre.etude)).toBe(true);
      expect(offre).not.toHaveProperty("exemple");
    }
  });

  it("n'a plus de section Réalisations sur l'accueil (elle vit dans l'offre et sur /realisations)", () => {
    expect(Object.keys(ANCRES)).not.toContain("realisations");
    expect(Object.keys(sections)).not.toContain("realisations");
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

  it("cite l'employeur et l'école, avec un lien vers leur site", () => {
    expect(parcours.map(texteParcours)).toEqual([
      "Développeur full stack chez SCR Informatique, en alternance",
      "Actuellement en Master of Science à Epitech",
      "Indépendant : applications métier et sites vitrines",
    ]);
    expect(parcours[0].lien).toMatchObject({
      libelle: "SCR Informatique",
      href: "https://www.scrinfo.net/",
      logo: { src: "/parcours/scr-informatique.webp" },
    });
    expect(parcours[1].lien).toMatchObject({
      libelle: "Epitech",
      href: "https://www.epitech.eu/",
      logo: { src: "/parcours/epitech.webp" },
    });
    expect(parcours[2].lien).toBeUndefined();
  });

  it("nomme le site d'artisan et donne son lien, mais garde le suivi de marchés anonyme", () => {
    const [marches, artisan] = realisations;
    expect(marches.slug).toBe("suivi-de-marches");
    expect(marches.site).toBeUndefined();
    expect(artisan.slug).toBe("site-artisan");
    expect(artisan.contexte).toBe("SARL Dufourd Jérôme · Électricien-plombier à Châteaubriant");
    expect(artisan.site).toBe("https://sdj-elec.jouan.dev/");
  });

  it("fait pointer les actions de l'accroche vers des sections existantes", () => {
    expect(ancres.has(accroche.actionPrincipale.href)).toBe(true);
    expect(accroche.actionSecondaire).toEqual({ libelle: "Voir mes réalisations", href: "/realisations" });
  });

  it("fait pointer la navigation de l'en-tête vers la page des réalisations et des sections existantes", () => {
    expect(navLinks).toEqual([
      { href: "/realisations", label: "Réalisations" },
      { href: "/#offre", label: "Offre" },
      { href: "/coulisses", label: "Coulisses" },
      { href: "/#contact", label: "Contact" },
    ]);
    for (const lien of navLinks.filter((l) => l.href.startsWith("/#"))) {
      expect(ancres.has(lien.href.replace(/^\//, ""))).toBe(true);
    }
  });

  it("ne laisse aucun placeholder entre crochets", () => {
    const tout = textes({ sections, accroche, offres, realisations, etapes, parcours });
    expect(tout.filter((texte) => /\[[^\]]*\]/.test(texte))).toEqual([]);
  });
});

describe("angles de l'accueil", () => {
  it("garde l'accroche actuelle pour l'angle application", () => {
    expect(accrochesParAngle.application).toEqual(accroche);
  });
  it("oriente l'accroche vitrine vers le site", () => {
    const a = accrochesParAngle.vitrine;
    expect(`${a.titreAvant}${a.titreAccent}${a.titreApres}`).toBe(
      "Un site vitrine qui vous ressemble, rapide et bien référencé.",
    );
    expect(a.sousTitre).toBe("Je conçois, développe et héberge votre site, du premier échange à la mise en ligne.");
  });
  it("met l'offre de l'angle en premier et en avant", () => {
    for (const angle of ["application", "vitrine"] as const) {
      const [premiere, seconde] = offresPour(angle);
      expect(premiere).toMatchObject({ id: angle, miseEnAvant: true });
      expect(seconde.miseEnAvant).toBe(false);
    }
  });
  it("met l'exemple de l'angle en premier, avec son offre", () => {
    expect(offresPour("application")[0].etude).toBe("suivi-de-marches");
    expect(offresPour("vitrine")[0].etude).toBe("site-artisan");
  });
  it("salue le prospect", () => {
    expect(salutation("Boulangerie Martin")).toBe("Bonjour Boulangerie Martin,");
  });
});

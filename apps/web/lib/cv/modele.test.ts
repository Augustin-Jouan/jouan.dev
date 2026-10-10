import { describe, expect, it } from "vitest";
import { offres, parcours, realisations } from "@/data/accueil";
import { competences } from "@/data/competences";
import { contact } from "@/data/contact";
import { siteUrl } from "@/data/site";
import { construireCv } from "./modele";

describe("construireCv", () => {
  const cv = construireCv("https://exemple.dev");

  it("reprend les données du site, sans les recopier", () => {
    expect(cv.nom).toBe("Augustin Jouan");
    expect(cv.accroche.titre).toBe("Moins de tâches informatiques répétitives, plus de temps pour votre métier.");
    expect(cv.offres.map((o) => o.titre)).toEqual(offres.map((o) => o.titre));
    expect(cv.realisations.map((r) => r.titre)).toEqual(realisations.map((r) => r.titre));
    expect(cv.parcours).toEqual(parcours);
    expect(cv.competences).toEqual(competences);
    expect(cv.contact.email).toBe(contact.email);
    expect(cv.contact.utilisateurGithub).toBe("Augustin-Jouan");
  });

  it("construit des adresses absolues depuis l'URL du site", () => {
    expect(cv.hote).toBe("exemple.dev");
    expect(cv.contact.page).toBe("https://exemple.dev/contact");
    expect(cv.realisations.map((r) => r.url)).toEqual([
      "https://exemple.dev/realisations/suivi-de-marches",
      "https://exemple.dev/realisations/site-artisan",
    ]);
  });

  it("prend l'URL du site par défaut", () => {
    expect(construireCv().site).toBe(siteUrl);
  });
});

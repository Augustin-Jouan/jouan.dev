import { describe, expect, it } from "vitest";
import { realisations } from "@/data/accueil";
import { competences } from "@/data/competences";
import { construireCv } from "./modele";
import { SCHEMA_JSON_RESUME, versJsonResume } from "./json-resume";

describe("versJsonResume", () => {
  const json = versJsonResume(construireCv("https://exemple.dev"), "2026-10-10T08:00:00");

  it("décrit la personne et son profil GitHub", () => {
    expect(json.$schema).toBe(SCHEMA_JSON_RESUME);
    expect(json.basics.name).toBe("Augustin Jouan");
    expect(json.basics.url).toBe("https://exemple.dev");
    expect(json.basics.profiles).toEqual([
      { network: "GitHub", username: "Augustin-Jouan", url: "https://github.com/Augustin-Jouan" },
    ]);
  });

  it("donne les projets avec des adresses absolues, et les compétences par thème", () => {
    expect(json.projects.map((p) => p.name)).toEqual(realisations.map((r) => r.titre));
    for (const projet of json.projects) expect(projet.url).toMatch(/^https:\/\/exemple\.dev\/realisations\//);
    expect(json.skills.map((s) => s.name)).toEqual(competences.map((g) => g.nom));
    expect(json.meta).toEqual({ canonical: "https://exemple.dev/api/me", lastModified: "2026-10-10T08:00:00" });
  });

  it("ne nomme aucune entreprise et ne porte aucune date", () => {
    expect(json.work.map((w) => w.name)).toEqual(["Indépendant", "Alternance"]);
    expect(JSON.stringify(json)).not.toMatch(/"(startDate|endDate|date)"/);
  });
});

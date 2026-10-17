import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { enTeteAPropos, etapesParcours, projetsEcole, projetsFreelance } from "./a-propos";

const dansPublic = (src: string) => existsSync(join(__dirname, "..", "public", src));

describe("contenus de /a-propos", () => {
  it("met en avant Time Manager, EpitChat puis Asterix: Sit Them All, sans Robocar ni JOJA", () => {
    expect(projetsEcole.map((p) => p.slug)).toEqual(["time-manager", "epitchat", "asterix"]);
    expect(JSON.stringify(projetsEcole.map((p) => p.titre))).not.toMatch(/joja/i);
    expect(JSON.stringify(projetsEcole.map((p) => p.titre))).not.toMatch(/robocar/i);
  });

  it("chaque projet dit ce qu'il est, avec ses technologies ; « Ma part » pour EpitChat et le jeu seulement", () => {
    expect(projetsEcole.filter((p) => p.part).map((p) => p.slug)).toEqual(["epitchat", "asterix"]);
    for (const projet of projetsEcole) {
      expect(projet.description, projet.slug).not.toBe("");
      if (projet.part !== undefined) expect(projet.part, projet.slug).not.toBe("");
      expect(projet.contexte, projet.slug).toMatch(/^Epitech · /);
      expect(projet.stack.length, projet.slug).toBeGreaterThan(0);
    }
  });

  it("chaque projet a une vidéo décrite", () => {
    for (const projet of projetsEcole) expect(projet.media.description, projet.slug).not.toBe("");
  });

  it("chaque média référencé existe dans public/", () => {
    const fichiers = projetsEcole.flatMap(({ media }) => [media.webm, media.mp4, media.affiche.src]);
    for (const fichier of fichiers) expect(dansPublic(fichier), fichier).toBe(true);
  });

  it("les projets freelance renvoient aux deux études de /realisations", () => {
    expect(projetsFreelance).toEqual(["site-artisan", "suivi-de-marches"]);
  });

  it("le parcours suit l'ordre de la spec, avec l'Irlande en 2024 et Robocar cité dans la Pré-MSc", () => {
    expect(etapesParcours.map((e) => e.titre)).toEqual([
      "Licence MIASHS",
      "Six mois en Irlande",
      "Voiturier",
      "Pré-MSc",
      "Master of Science",
      "Développeur full stack en alternance",
      "Indépendant",
    ]);
    expect(etapesParcours.find((e) => e.titre === "Six mois en Irlande")!.annee).toBe("2024");
    expect(etapesParcours.find((e) => e.titre === "Pré-MSc")!.recit).toMatch(/Robocar/);
    expect(etapesParcours.find((e) => e.titre === "Pré-MSc")!.recit).toMatch(/jeu de plateforme/);
  });

  it("garde la phrase d'introduction validée", () => {
    expect(enTeteAPropos.intro).toBe("Développeur full stack : voici ce que j'ai construit, et d'où je viens.");
  });

  it("n'emploie aucun mot de candidat", () => {
    const textes = JSON.stringify({ enTeteAPropos, projetsEcole, etapesParcours });
    expect(textes).not.toMatch(/open to work|recherche d'(emploi|opportunit)|disponible pour/i);
  });
});

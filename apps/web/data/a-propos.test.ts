import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { enTeteAPropos, etapesParcours, projetsEcole, projetsFreelance } from "./a-propos";

const dansPublic = (src: string) => existsSync(join(__dirname, "..", "public", src));

describe("contenus de /a-propos", () => {
  it("met en avant Time Manager, EpitChat puis JOJA, sans Robocar", () => {
    expect(projetsEcole.map((p) => p.slug)).toEqual(["time-manager", "epitchat", "joja"]);
    expect(JSON.stringify(projetsEcole.map((p) => p.titre))).not.toMatch(/robocar/i);
  });

  it("chaque projet dit ce qu'il est et ce qu'Augustin y a fait, avec ses technologies", () => {
    for (const projet of projetsEcole) {
      expect(projet.description, projet.slug).not.toBe("");
      expect(projet.part, projet.slug).not.toBe("");
      expect(projet.contexte, projet.slug).toMatch(/^Epitech · /);
      expect(projet.stack.length, projet.slug).toBeGreaterThan(0);
    }
  });

  it("Time Manager et EpitChat ont une vidéo décrite ; JOJA, deux ou trois graphiques décrits", () => {
    const [timeManager, epitchat, joja] = projetsEcole;
    for (const projet of [timeManager!, epitchat!]) {
      expect(projet.media.type, projet.slug).toBe("video");
      if (projet.media.type === "video") expect(projet.media.description).not.toBe("");
    }
    expect(joja!.media.type).toBe("graphiques");
    if (joja!.media.type === "graphiques") {
      expect(joja!.media.images.length).toBeGreaterThanOrEqual(2);
      expect(joja!.media.images.length).toBeLessThanOrEqual(3);
      for (const image of joja!.media.images) expect(image.alt).not.toBe("");
    }
  });

  it("chaque média référencé existe dans public/", () => {
    const fichiers = projetsEcole.flatMap(({ media }) =>
      media.type === "video" ? [media.webm, media.mp4, media.affiche.src] : media.images.map((i) => i.src),
    );
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
  });

  it("garde la phrase d'introduction validée", () => {
    expect(enTeteAPropos.intro).toBe("Développeur full stack : voici ce que j'ai construit, et d'où je viens.");
  });

  it("n'emploie aucun mot de candidat", () => {
    const textes = JSON.stringify({ enTeteAPropos, projetsEcole, etapesParcours });
    expect(textes).not.toMatch(/open to work|recherche d'(emploi|opportunit)|disponible pour/i);
  });
});

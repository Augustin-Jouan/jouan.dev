/**
 * Le CV du site (sous-projet 7), construit depuis les données existantes, sans
 * recopier de texte. Trois rendus : terminal (`lib/cv/terminal.ts`), le même
 * sans couleur (`/cv.txt`) et JSON Resume (`lib/cv/json-resume.ts`).
 * Toutes les adresses sont absolues, construites depuis l'URL du site : elles
 * suivent un changement de domaine sans retouche.
 */
import { accroche, offres, parcours, realisations } from "@/data/accueil";
import { competences, type GroupeCompetences } from "@/data/competences";
import { contact } from "@/data/contact";
import { cheminEtude } from "@/data/realisations";
import { siteDescription, siteName, siteUrl } from "@/data/site";

export type CvModele = {
  nom: string;
  description: string;
  /** URL du site, sans barre finale (`https://jouan.dev`). */
  site: string;
  /** Hôte, pour les commandes à taper (`jouan.dev`). */
  hote: string;
  accroche: { surtitre: string; titre: string };
  offres: { titre: string; ligne: string }[];
  realisations: { titre: string; contexte: string; livre: string; stack: string[]; url: string }[];
  parcours: string[];
  contact: { email: string; github: string; utilisateurGithub: string; page: string };
  competences: GroupeCompetences[];
};

export function construireCv(url: string = siteUrl): CvModele {
  return {
    nom: siteName,
    description: siteDescription,
    site: url,
    hote: new URL(url).host,
    accroche: {
      surtitre: accroche.surtitre,
      titre: `${accroche.titreAvant}${accroche.titreAccent}${accroche.titreApres}`,
    },
    offres: offres.map((offre) => ({ titre: offre.titre, ligne: offre.pourQui })),
    realisations: realisations.map((r) => ({
      titre: r.titre,
      contexte: r.contexte,
      livre: r.livre,
      stack: r.stack,
      url: `${url}${cheminEtude(r.slug)}`,
    })),
    parcours,
    contact: {
      email: contact.email,
      github: contact.github,
      utilisateurGithub: new URL(contact.github).pathname.split("/").filter(Boolean).at(-1) ?? "",
      page: `${url}/contact`,
    },
    competences,
  };
}

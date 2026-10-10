/**
 * Le CV au format standard JSON Resume (`/api/me`) : clés anglaises du schéma,
 * valeurs en français. Aucune date de poste ni de formation : absentes des
 * données. L'alternance est citée sans nom d'entreprise.
 */
import type { CvModele } from "./modele";

export const SCHEMA_JSON_RESUME = "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json";

export function versJsonResume(cv: CvModele, dateBuild: string) {
  return {
    $schema: SCHEMA_JSON_RESUME,
    basics: {
      name: cv.nom,
      label: cv.accroche.surtitre,
      email: cv.contact.email,
      url: cv.site,
      summary: cv.description,
      profiles: [{ network: "GitHub", username: cv.contact.utilisateurGithub, url: cv.contact.github }],
    },
    work: [
      {
        name: "Indépendant",
        position: "Développeur full stack",
        url: cv.site,
        summary: cv.offres.map((offre) => offre.titre).join(" · "),
      },
      { name: "Alternance", position: "Développeur full stack" },
    ],
    education: [{ institution: "Epitech", studyType: "Master of Science", area: "Informatique" }],
    projects: cv.realisations.map((r) => ({ name: r.titre, description: r.livre, url: r.url, keywords: r.stack })),
    skills: cv.competences.map((groupe) => ({ name: groupe.nom, keywords: groupe.elements })),
    meta: { canonical: `${cv.site}/api/me`, lastModified: dateBuild },
  };
}

/**
 * Contenu de la page d'accueil, première version : textes à relire et
 * valider. Réalisations anonymisées : ni nom de client ni détail identifiant.
 */

import type { SlugEtude } from "./realisations";

/** Identifiants des sections de l'accueil, cibles des ancres (`/#offre`). */
export const ANCRES = {
  offre: "offre",
  realisations: "realisations",
  methode: "methode",
  parcours: "parcours",
  contact: "contact",
} as const;

export type CleSection = keyof typeof ANCRES;

export type EnTeteSection = { surtitre: string; titre: string };

export const sections: Record<CleSection, EnTeteSection> = {
  offre: { surtitre: "Ce que je fais", titre: "Deux façons de travailler ensemble" },
  realisations: { surtitre: "Réalisations", titre: "Quelques projets récents" },
  methode: { surtitre: "Comment je travaille", titre: "Un cadre clair, du premier échange au suivi" },
  parcours: { surtitre: "Parcours", titre: "Développeur, étudiant et indépendant" },
  contact: { surtitre: "Contact", titre: "Parlons de votre projet" },
};

export type Lien = { libelle: string; href: string };

export type Accroche = {
  surtitre: string;
  /** Le titre est coupé en trois pour mettre l'accent en couleur. */
  titreAvant: string;
  titreAccent: string;
  titreApres: string;
  sousTitre: string;
  actionPrincipale: Lien;
  actionSecondaire: Lien;
};

export const accroche: Accroche = {
  surtitre: "Développeur full stack · indépendant",
  titreAvant: "Moins de tâches répétitives, ",
  titreAccent: "plus de temps",
  titreApres: " pour votre cœur de métier.",
  sousTitre:
    "Je conçois, développe et héberge vos outils, du premier échange à la mise en ligne.",
  actionPrincipale: { libelle: "Parler de votre projet", href: `#${ANCRES.contact}` },
  actionSecondaire: { libelle: "Voir mes réalisations", href: `#${ANCRES.realisations}` },
};

export type Offre = {
  id: "application" | "vitrine";
  titre: string;
  /** L'offre mise en avant est affichée en premier, en plus grand et en sombre. */
  miseEnAvant: boolean;
  pourQui: string;
  livrables: string[];
  exemple: string;
};

export const offres: Offre[] = [
  {
    id: "application",
    titre: "Application métier sur mesure",
    miseEnAvant: true,
    pourQui:
      "Pour les entreprises qui gèrent leur activité dans des tableurs, des e-mails et des fichiers éparpillés.",
    livrables: [
      "Un outil web pensé pour votre façon de travailler",
      "Tableaux de bord, suivi, devis et documents PDF générés automatiquement",
      "Hébergement, sauvegardes et maintenance inclus",
    ],
    exemple:
      "Exemple : le suivi des marchés de travaux d'une entreprise du BTP, du planning aux finances.",
  },
  {
    id: "vitrine",
    titre: "Site vitrine",
    miseEnAvant: false,
    pourQui:
      "Pour les artisans, indépendants et petites entreprises qui veulent être trouvés et contactés.",
    livrables: [
      "Un site rapide, clair et bien référencé",
      "Formulaire de contact, pages légales et mesure d'audience sans cookie",
      "Mise en ligne et hébergement gérés pour vous",
    ],
    exemple: "Exemple : le site d'un artisan électricien-plombier, livré clé en main.",
  },
];

export type Realisation = {
  slug: SlugEtude;
  titre: string;
  /** Secteur ou métier du client, sans le nommer. */
  contexte: string;
  besoin: string;
  livre: string;
  stack: string[];
};

export const realisations: Realisation[] = [
  {
    slug: "suivi-de-marches",
    titre: "Suivi de marchés de travaux",
    contexte: "Entreprise du BTP",
    besoin:
      "Le planning, le suivi financier et le suivi des chantiers reposaient sur des tableurs partagés, difficiles à tenir à jour.",
    livre:
      "Une application web qui centralise le planning, les finances et le suivi de chantier, et génère les documents en PDF.",
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Docker"],
  },
  {
    slug: "site-artisan",
    titre: "Site vitrine d'artisan",
    contexte: "Électricien-plombier",
    besoin:
      "Reprendre la main sur son site et sur son référencement, jusque-là gérés par un ancien prestataire.",
    livre:
      "Un site rapide et bien référencé, avec un formulaire de contact fiable, une mesure d'audience sans cookie et un hébergement maîtrisé.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Docker"],
  },
];

export type Etape = { titre: string; description: string };

export const etapes: Etape[] = [
  {
    titre: "Échange",
    description:
      "On parle de votre activité et de ce qui vous fait perdre du temps. Gratuit et sans engagement.",
  },
  {
    titre: "Devis",
    description: "Un périmètre clair, un prix ferme et un calendrier, avant toute ligne de code.",
  },
  {
    titre: "Maquette",
    description: "Vous voyez et validez l'outil avant qu'il soit construit.",
  },
  {
    titre: "Développement",
    description: "Des livraisons régulières, que vous testez au fur et à mesure.",
  },
  {
    titre: "Mise en ligne et suivi",
    description: "J'héberge, je sauvegarde et je maintiens : vous n'avez rien à gérer.",
  },
];

export const parcours: string[] = [
  "Développeur full stack en alternance",
  "Master of Science à Epitech, en cours",
  "Indépendant : applications métier et sites vitrines",
];

/** Angle d'un lien personnalisé : l'offre mise en avant pour ce prospect. */
export type Angle = "application" | "vitrine";
export const ANGLES: Angle[] = ["application", "vitrine"];
export const libellesAngle: Record<Angle, string> = {
  application: "Application métier",
  vitrine: "Site vitrine",
};

export const accrochesParAngle: Record<Angle, Accroche> = {
  application: accroche,
  vitrine: {
    ...accroche,
    titreAvant: "Un site vitrine ",
    titreAccent: "qui vous ressemble",
    titreApres: ", rapide et bien référencé.",
    sousTitre: "Je conçois, développe et héberge votre site, du premier échange à la mise en ligne.",
  },
};

/** Les offres, celle de l'angle en premier et mise en avant. */
export function offresPour(angle: Angle): Offre[] {
  return offres
    .map((offre) => ({ ...offre, miseEnAvant: offre.id === angle }))
    .sort((a, b) => Number(b.miseEnAvant) - Number(a.miseEnAvant));
}

const etudeParAngle: Record<Angle, SlugEtude> = {
  application: "suivi-de-marches",
  vitrine: "site-artisan",
};

/** Les réalisations, celle de l'angle en premier. */
export function realisationsPour(angle: Angle): Realisation[] {
  const premiere = etudeParAngle[angle];
  return [...realisations].sort((a, b) => Number(b.slug === premiere) - Number(a.slug === premiere));
}

export function salutation(nom: string): string {
  return `Bonjour ${nom},`;
}

export type Personnalisation = { nom: string; angle: Angle; jeton: string };

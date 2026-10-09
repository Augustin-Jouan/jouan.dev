export type SlugEtude = "suivi-de-marches" | "site-artisan";

export type Image = { src: string; alt: string; largeur: number; hauteur: number };

export type EtudeDeCas = {
  slug: SlugEtude;
  surtitre: string;
  titre: string;
  sousTitre: string;
  /** Trois chiffres clés, vérifiables. */
  chiffres: { valeur: string; libelle: string }[];
  besoin: string[];
  livre: { titre: string; texte: string }[];
  stack: string[];
  choix: { titre: string; texte: string }[];
  media: { type: "demo"; apercu: Image } | { type: "captures"; images: Image[] };
};

export const cheminEtude = (slug: SlugEtude) => `/realisations/${slug}`;

/** Réalisations anonymisées : ni nom de client, ni lieu, ni montant réel. */
export const etudesDeCas: EtudeDeCas[] = [
  {
    slug: "suivi-de-marches",
    surtitre: "Application métier · BTP",
    titre: "Le suivi des marchés de travaux, sans tableur ni courrier retapé",
    sousTitre:
      "Une application web pour une entreprise qui pilote des chantiers : marchés, avenants, certificats de paiement, planning et suivi de chantier, avec des documents PDF générés en un clic.",
    chiffres: [
      { valeur: "4", libelle: "modules : marchés, planning, finances, suivi de chantier" },
      { valeur: "0,01 €", libelle: "précision de chaque ligne de certificat, recalculée côté serveur" },
      { valeur: "1", libelle: "seul outil à la place des tableurs et des modèles de courrier" },
    ],
    besoin: [
      "Chaque chantier se suivait dans plusieurs tableurs : les marchés d'un côté, le planning de l'autre, les paiements ailleurs. Un avenant signé obligeait à reporter le nouveau montant à la main, partout.",
      "Chaque mois, les certificats de paiement se calculaient à la calculatrice puis se retapaient dans un modèle de courrier : des heures de ressaisie, et le risque d'une erreur de quelques euros sur un document signé.",
    ],
    livre: [
      { titre: "Marchés et avenants", texte: "Les lots, leurs entreprises et leurs montants au même endroit. Un avenant saisi met à jour le montant engagé partout, et sa lettre se génère toute seule." },
      { titre: "Certificats de paiement", texte: "On saisit le cumul des travaux réalisés : acomptes, TVA et retenue de garantie se calculent au centime, puis le certificat part en PDF." },
      { titre: "Planning", texte: "Les lots sur une frise en semaines, avec les périodes de fermeture, imprimable sur une seule feuille." },
      { titre: "Suivi de chantier", texte: "Comptes rendus, réserves à lever et réception, rattachés au bon lot et à la bonne entreprise." },
      { titre: "Documents", texte: "Chaque document émis est figé, numéroté et versionné : on retrouve toujours ce qui a été envoyé, tel qu'il a été envoyé." },
    ],
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Playwright", "Docker"],
    choix: [
      { titre: "Des calculs exacts", texte: "Les montants sont des décimaux arrondis au centime à chaque ligne, comme sur un certificat papier. Le serveur ne reprend jamais un montant envoyé par l'écran : il recalcule tout." },
      { titre: "Des documents qui ne changent plus", texte: "Un PDF émis n'est jamais réécrit : une correction crée une nouvelle version, l'ancienne reste consultable." },
      { titre: "Pas d'écrasement entre collègues", texte: "Deux personnes qui modifient le même lot en même temps ne peuvent pas se marcher dessus : chaque écriture verrouille le lot le temps de l'enregistrer." },
    ],
    media: {
      type: "demo",
      apercu: { src: "/realisations/suivi-de-marches/apercu.webp", alt: "Écran des marchés de la démo : tableau des lots d'un chantier fictif", largeur: 1280, hauteur: 720 },
    },
  },
  {
    slug: "site-artisan",
    surtitre: "Site vitrine · Artisan",
    titre: "Un site d'artisan rapide, bien référencé, et enfin entre ses mains",
    sousTitre:
      "La refonte complète du site d'un électricien-plombier : design sur mesure, formulaire de contact fiable, mesure d'audience sans cookie et hébergement maîtrisé.",
    chiffres: [
      { valeur: "89", libelle: "sur 100, performance Lighthouse sur mobile" },
      { valeur: "100", libelle: "sur 100, référencement Lighthouse" },
      { valeur: "0", libelle: "cookie déposé : pas de bandeau de consentement" },
    ],
    besoin: [
      "L'artisan dépendait d'un ancien prestataire pour la moindre modification de son site, et ne savait plus précisément qui détenait son nom de domaine et ses comptes en ligne.",
      "Il voulait un site moderne qui donne confiance, qui se trouve bien sur Google dans sa zone, et dont il garde la maîtrise.",
    ],
    livre: [
      { titre: "Un design sur mesure", texte: "Pensé d'abord pour le téléphone, là où ses clients le cherchent, avec ses réalisations et ses services mis en avant." },
      { titre: "Un formulaire de contact fiable", texte: "Les demandes de devis arrivent dans sa boîte, les erreurs d'envoi sont gérées, et le spam est filtré sans casse-tête pour le visiteur." },
      { titre: "Le référencement local", texte: "Chaque ancienne adresse redirige vers la bonne page, les données structurées décrivent l'entreprise et sa zone d'intervention." },
      { titre: "Une mesure d'audience respectueuse", texte: "Il sait combien de personnes visitent son site, sans cookie ni donnée personnelle." },
      { titre: "Un hébergement maîtrisé", texte: "Le site tourne sur un serveur que je gère, se met à jour automatiquement après chaque modification testée, et la passation du domaine a été organisée." },
    ],
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Docker", "Coolify"],
    choix: [
      { titre: "Rien de perdu au changement de site", texte: "Les pages de l'ancien site redirigent vers les nouvelles : le référencement acquis est conservé." },
      { titre: "Aucun cookie", texte: "La mesure d'audience fonctionne sans cookie : pas de bandeau de consentement, pas de données personnelles." },
      { titre: "Déploiement automatique", texte: "Chaque modification passe les tests, puis le site se met à jour seul sur le serveur, sans coupure." },
    ],
    media: {
      type: "captures",
      images: [
        { src: "/realisations/site-artisan/ordinateur.webp", alt: "Page d'accueil du site sur ordinateur (nom et coordonnées de l'artisan remplacés)", largeur: 1440, hauteur: 900 },
        { src: "/realisations/site-artisan/mobile.webp", alt: "Page d'accueil du site sur téléphone (nom et coordonnées de l'artisan remplacés)", largeur: 390, hauteur: 844 },
      ],
    },
  },
];

export function trouverEtude(slug: string): EtudeDeCas | undefined {
  return etudesDeCas.find((etude) => etude.slug === slug);
}

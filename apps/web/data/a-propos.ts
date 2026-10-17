/**
 * Contenus de /a-propos (spec 2026-10-16-a-propos) : trois projets d'école mis en
 * avant, les deux études freelance de /realisations, puis le parcours détaillé.
 * Ton factuel : rien qui suggère une recherche d'emploi. Aucun nom de coéquipier ;
 * les médias ne montrent que des données fictives.
 */
import { parcours, type Logo } from "./accueil";
import type { Image, SlugEtude } from "./realisations";

export type VideoProjet = { type: "video"; webm: string; mp4: string; affiche: Image; description: string };

export type ProjetEcole = {
  slug: "time-manager" | "epitchat" | "asterix";
  /** École, année, taille de l'équipe : « Epitech · MSc 1 · 2026 · à cinq ». */
  contexte: string;
  titre: string;
  description: string;
  stack: string[];
  media: VideoProjet;
};

export type EtapeParcours = {
  annee: string;
  titre: string;
  recit: string;
  lieu?: { libelle: string; href?: string; logo?: Logo };
  lien?: { libelle: string; href: string };
};

export const enTeteAPropos = {
  surtitre: "À propos",
  titre: "Augustin Jouan",
  intro: "Développeur full stack : voici ce que j'ai construit, et d'où je viens.",
};

export const projetsEcole: ProjetEcole[] = [
  {
    slug: "time-manager",
    contexte: "Epitech · MSc 1 · 2026 · à cinq",
    titre: "Time Manager",
    description:
      "Application de pointage et de suivi du temps pour une entreprise fictive : API REST Spring Boot, interface Next.js, reverse proxy nginx, quatre services Docker.",
    stack: ["Java", "Spring Boot", "Next.js", "Docker", "nginx", "GitHub Actions"],
    media: {
      type: "video",
      webm: "/a-propos/time-manager.webm",
      mp4: "/a-propos/time-manager.mp4",
      affiche: { src: "/a-propos/time-manager-affiche.webp", alt: "", largeur: 1280, hauteur: 800 },
      description:
        "Démo de Time Manager : Inès, employée d'une entreprise fictive, pointe son arrivée à 08:47, puis consulte ses heures à la semaine et au mois.",
    },
  },
  {
    slug: "epitchat",
    contexte: "Epitech · Pré-MSc · 2026 · à quatre",
    titre: "EpitChat",
    description:
      "Messagerie collaborative en temps réel avec serveurs, canaux et messages, en web et en application desktop.",
    stack: ["TypeScript", "Express", "Socket.io", "Next.js", "Electron", "PostgreSQL"],
    media: {
      type: "video",
      webm: "/a-propos/epitchat.webm",
      mp4: "/a-propos/epitchat.mp4",
      affiche: { src: "/a-propos/epitchat-affiche.webp", alt: "", largeur: 1184, hauteur: 712 },
      description:
        "Démo d'EpitChat : deux utilisateurs fictifs côte à côte dans le même salon. Le message de l'un apparaît en direct chez l'autre, qui lui répond.",
    },
  },
  {
    slug: "asterix",
    contexte: "Epitech · Pré-MSc · 2025 · à trois",
    titre: "Asterix: Sit Them All",
    description:
      "Jeu de plateforme 2D en Java : on incarne Obélix, on saute sur les légionnaires pour les éliminer et on traverse le niveau jusqu'à Idéfix, avec des vies limitées et des potions de soin.",
    stack: ["Java", "JavaFX", "Maven", "JUnit"],
    media: {
      type: "video",
      webm: "/a-propos/asterix.webm",
      mp4: "/a-propos/asterix.mp4",
      affiche: { src: "/a-propos/asterix-affiche.webp", alt: "", largeur: 960, hauteur: 528 },
      description:
        "Démo d'Asterix: Sit Them All : depuis le menu, Obélix court à travers le niveau, écrase deux légionnaires en leur sautant dessus, prend une potion, franchit les fosses et rejoint Idéfix.",
    },
  },
];

/** Les deux études de /realisations, résumées en cartes : site vitrine d'abord, comme dans la spec. */
export const projetsFreelance: SlugEtude[] = ["site-artisan", "suivi-de-marches"];

const [scr, epitech] = parcours.map((ligne) => ligne.lien!);

export const etapesParcours: EtapeParcours[] = [
  {
    annee: "2021 – 2025",
    titre: "Licence MIASHS",
    lieu: { libelle: "Université de Rennes" },
    recit:
      "Mathématiques, informatique et sciences humaines : Python, R, SQL, statistiques et premiers modèles d'apprentissage. Projets d'analyse sur les ventes de pesticides en France et les données de la SNCF.",
  },
  {
    annee: "2024",
    titre: "Six mois en Irlande",
    recit:
      "Bénévole dans un temple bouddhiste tibétain, en immersion complète : anglais courant, vie en communauté, autonomie loin de ses repères.",
  },
  {
    annee: "2025",
    titre: "Voiturier",
    lieu: { libelle: "hôtel cinq étoiles" },
    recit: "Le service client au plus haut niveau d'exigence : ponctualité, discrétion, sang-froid.",
  },
  {
    annee: "2025 – 2026",
    titre: "Pré-MSc",
    lieu: { libelle: "Epitech Rennes", href: epitech!.href, logo: epitech!.logo },
    recit:
      "Une pédagogie par projets, en équipe : web full stack, temps réel, DevOps, IA et data. Projets de l'année : EpitChat, un jeu de plateforme 2D en Java, JOJA, Robocar (voiture autonome en simulateur).",
  },
  {
    annee: "2026 – 2028",
    titre: "Master of Science",
    lieu: { libelle: "Epitech Rennes", href: epitech!.href, logo: epitech!.logo },
    recit: "En cours, promo 2028. Time Manager, à cinq.",
  },
  {
    annee: "depuis 2025",
    titre: "Développeur full stack en alternance",
    lieu: { libelle: scr!.libelle, href: scr!.href, logo: scr!.logo },
    recit: "Développement d'applications web, de l'interface à l'API, au sein d'une équipe produit.",
  },
  {
    annee: "depuis 2026",
    titre: "Indépendant",
    lieu: { libelle: "applications métier et sites vitrines" },
    recit:
      "Conçus, développés et hébergés de A à Z : le site d'un électricien-plombier, une application de suivi des marchés de travaux.",
    lien: { libelle: "Voir les réalisations", href: "/realisations" },
  },
];

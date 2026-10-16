/**
 * Commandes de la palette (Cmd+K, sous-projet 7), dans l'ordre d'affichage :
 * navigation, actions, puis les commandes ludiques. Libellés et adresses viennent
 * des données existantes. La liste est construite côté serveur (app/layout.tsx) :
 * le morceau de JS de la palette n'embarque pas les textes de l'accueil.
 * Ajouter une commande : une entrée ici (type `Commande`, lib/commandes/types.ts).
 */
import { EVENEMENT_REJOUER_INTRO } from "@/lib/commandes/evenements";
import type { Commande } from "@/lib/commandes/types";
import { ANCRES, realisations, sections, type CleSection } from "./accueil";
import { contact } from "./contact";
import { cheminEtude } from "./realisations";
import { hoteSite } from "./site";

const CLES_SECTIONS = Object.keys(ANCRES) as CleSection[];

export const commandes: Commande[] = [
  {
    id: "accueil",
    libelle: "Accueil",
    groupe: "Navigation",
    motsCles: ["début", "page d'accueil"],
    action: { type: "lien", href: "/" },
  },
  ...CLES_SECTIONS.map(
    (cle): Commande => ({
      id: `section-${cle}`,
      libelle: `Accueil · ${sections[cle].surtitre}`,
      groupe: "Navigation",
      motsCles: [cle, sections[cle].titre],
      action: { type: "lien", href: `/#${ANCRES[cle]}` },
    }),
  ),
  ...realisations.map(
    (realisation): Commande => ({
      id: `etude-${realisation.slug}`,
      libelle: `Étude de cas · ${realisation.titre}`,
      groupe: "Navigation",
      motsCles: ["réalisation", realisation.contexte, ...realisation.stack],
      action: { type: "lien", href: cheminEtude(realisation.slug) },
    }),
  ),
  {
    id: "coulisses",
    libelle: "Coulisses",
    groupe: "Navigation",
    motsCles: ["architecture", "technique", "performances", "mesures"],
    action: { type: "lien", href: "/coulisses" },
  },
  {
    id: "a-propos",
    libelle: "À propos",
    groupe: "Navigation",
    motsCles: ["parcours", "projets", "portfolio", "formation", "epitech"],
    action: { type: "lien", href: "/a-propos" },
  },
  {
    id: "contact",
    libelle: "Contact",
    groupe: "Navigation",
    motsCles: ["écrire", "devis", "message", "formulaire"],
    action: { type: "lien", href: "/contact" },
  },
  {
    id: "mentions-legales",
    libelle: "Mentions légales",
    groupe: "Navigation",
    motsCles: ["éditeur", "hébergeur"],
    action: { type: "lien", href: "/mentions-legales" },
  },
  {
    id: "confidentialite",
    libelle: "Politique de confidentialité",
    groupe: "Navigation",
    motsCles: ["rgpd", "données personnelles", "cookies"],
    action: { type: "lien", href: "/politique-de-confidentialite" },
  },
  {
    id: "copier-email",
    libelle: "Copier l'e-mail",
    groupe: "Actions",
    motsCles: [contact.email, "mail", "adresse"],
    action: { type: "copier", texte: contact.email, confirmation: "E-mail copié" },
  },
  {
    id: "github",
    libelle: "Ouvrir GitHub",
    groupe: "Actions",
    motsCles: ["code", "dépôts", "profil"],
    action: { type: "lien", href: contact.github, nouvelOnglet: true },
  },
  {
    id: "copier-curl",
    libelle: "Copier la commande curl",
    groupe: "Actions",
    motsCles: [`curl -L ${hoteSite}`, "terminal", "cv", "ligne de commande"],
    action: { type: "copier", texte: `curl -L ${hoteSite}`, confirmation: "Commande copiée" },
  },
  {
    id: "cv-json",
    libelle: "Ouvrir le CV en JSON",
    groupe: "Actions",
    motsCles: ["api", "json resume", "/api/me"],
    action: { type: "lien", href: "/api/me", nouvelOnglet: true },
  },
  {
    id: "rejouer-intro",
    libelle: "Rejouer l'intro",
    groupe: "Pour le plaisir",
    motsCles: ["animation", "goutte", "lumière"],
    action: { type: "evenement", nom: EVENEMENT_REJOUER_INTRO },
    condition: "intro",
  },
  {
    id: "architecture-3d",
    libelle: "Voir l'architecture en 3D",
    groupe: "Pour le plaisir",
    motsCles: ["coulisses", "schéma", "webgl"],
    action: { type: "lien", href: "/coulisses?vue=3d" },
  },
];

/**
 * Architecture du site pour la page des coulisses : une seule source pour le
 * schéma 2D (deux variantes, large et étroite) et la vue 3D. Textes : première
 * version, à valider par Augustin (spec du sous-projet 5, §11). Anonymes : ni
 * adresse d'administration, ni IP, ni hébergeur au-delà de « VPS en France ».
 */
import type { Serie } from "@/lib/coulisses/magasin";

export type IdNoeud =
  | "navigateur"
  | "proxy"
  | "site"
  | "base"
  | "tempsReel"
  | "statistiques"
  | "mails"
  | "integration"
  | "registre"
  | "deploiement";
export type Point = { x: number; y: number };
export type Variante = "large" | "etroite";

export type Noeud = {
  id: IdNoeud;
  nom: string;
  role: string;
  techno: string;
  pourquoi: string;
  groupe: "requete" | "deploiement";
  mesure?: Serie;
  positions: Record<Variante, Point>;
};
export type Liaison = { de: IdNoeud; vers: IdNoeud; mesure?: Serie };

/** Cadres des deux variantes (viewBox) et taille des nœuds, en unités SVG. */
export const CADRES = {
  large: { largeur: 960, hauteur: 420, noeud: { largeur: 150, hauteur: 56 } },
  etroite: { largeur: 360, hauteur: 820, noeud: { largeur: 140, hauteur: 56 } },
} as const satisfies Record<Variante, { largeur: number; hauteur: number; noeud: { largeur: number; hauteur: number } }>;

export const NOEUDS: readonly Noeud[] = [
  {
    id: "navigateur",
    nom: "Navigateur",
    role: "Affiche les pages et mesure, depuis chez vous, les temps de réponse de cette page.",
    techno: "React 19, pages rendues par le serveur puis rendues interactives",
    pourquoi: "Les pages arrivent déjà rendues : le contenu s'affiche avant le JavaScript, qui n'ajoute que l'interactivité.",
    groupe: "requete",
    positions: { large: { x: 95, y: 90 }, etroite: { x: 180, y: 50 } },
  },
  {
    id: "proxy",
    nom: "Proxy",
    role: "Reçoit chaque requête en HTTPS et l'oriente vers le bon service.",
    techno: "Traefik, géré par Coolify, sur un VPS en France",
    pourquoi: "Un seul point d'entrée chiffré pour le site et le temps réel ; les certificats se renouvellent seuls.",
    groupe: "requete",
    positions: { large: { x: 335, y: 90 }, etroite: { x: 100, y: 160 } },
  },
  {
    id: "site",
    nom: "Site",
    role: "Rend les pages, traite le formulaire de contact et les liens personnalisés.",
    techno: "Next.js 16 sur Node 22, dans une image Docker",
    pourquoi: "La plupart des pages sont générées au build : servies telles quelles, elles restent rapides même sous charge.",
    groupe: "requete",
    mesure: "site",
    positions: { large: { x: 575, y: 90 }, etroite: { x: 100, y: 290 } },
  },
  {
    id: "base",
    nom: "Base",
    role: "Garde les liens personnalisés et leurs visites.",
    techno: "PostgreSQL 17, client Prisma",
    pourquoi: "Des données relationnelles simples : une base éprouvée et un client typé évitent les surprises.",
    groupe: "requete",
    mesure: "base",
    positions: { large: { x: 830, y: 50 }, etroite: { x: 80, y: 420 } },
  },
  {
    id: "tempsReel",
    nom: "Temps réel",
    role: "Partage les curseurs et le compteur de l'accueil, et renvoie l'écho de cette page.",
    techno: "Hono et WebSocket, sur Node 22",
    pourquoi: "Séparé du site : il garde ses connexions ouvertes sans ralentir le rendu des pages, et se déploie à part.",
    groupe: "requete",
    mesure: "tempsReel",
    positions: { large: { x: 335, y: 220 }, etroite: { x: 270, y: 290 } },
  },
  {
    id: "statistiques",
    nom: "Statistiques",
    role: "Compte les visites, sans cookie.",
    techno: "Umami Cloud",
    pourquoi: "Une mesure d'audience sans donnée personnelle : pas de bandeau de consentement à imposer.",
    groupe: "requete",
    positions: { large: { x: 95, y: 220 }, etroite: { x: 270, y: 160 } },
  },
  {
    id: "mails",
    nom: "Mails",
    role: "Achemine les messages du formulaire de contact.",
    techno: "SMTP chez un fournisseur de messagerie",
    pourquoi: "Confier l'envoi à un fournisseur établi garantit que les messages arrivent, plutôt qu'en indésirables.",
    groupe: "requete",
    positions: { large: { x: 830, y: 150 }, etroite: { x: 288, y: 420 } },
  },
  {
    id: "integration",
    nom: "CI",
    role: "À chaque modification : lint, types, tests, tests de bout en bout et Lighthouse.",
    techno: "GitHub Actions",
    pourquoi: "Rien n'est mis en ligne sans avoir passé toutes les vérifications ; les chiffres de cette page en viennent.",
    groupe: "deploiement",
    positions: { large: { x: 335, y: 360 }, etroite: { x: 270, y: 780 } },
  },
  {
    id: "registre",
    nom: "Registre",
    role: "Stocke les images Docker du site et du service temps réel.",
    techno: "GitHub Container Registry",
    pourquoi: "Le serveur ne compile rien : il tire une image déjà construite et vérifiée.",
    groupe: "deploiement",
    positions: { large: { x: 575, y: 360 }, etroite: { x: 270, y: 670 } },
  },
  {
    id: "deploiement",
    nom: "Déploiement",
    role: "Tire les nouvelles images et relance le site et le service temps réel.",
    techno: "Coolify, sur le même VPS",
    pourquoi: "Un déploiement déclenché par la CI, sans intervention manuelle sur le serveur.",
    groupe: "deploiement",
    positions: { large: { x: 830, y: 360 }, etroite: { x: 270, y: 560 } },
  },
];

export const LIAISONS: readonly Liaison[] = [
  { de: "navigateur", vers: "proxy", mesure: "site" },
  { de: "navigateur", vers: "statistiques" },
  { de: "proxy", vers: "site" },
  { de: "proxy", vers: "tempsReel", mesure: "tempsReel" },
  { de: "site", vers: "base", mesure: "base" },
  { de: "site", vers: "mails" },
  { de: "integration", vers: "registre" },
  { de: "registre", vers: "deploiement" },
  { de: "deploiement", vers: "site" },
];

export const NOEUD_PAR_DEFAUT: IdNoeud = "navigateur";

export function noeudDe(id: IdNoeud): Noeud {
  const noeud = NOEUDS.find((n) => n.id === id);
  if (!noeud) throw new Error(`Nœud inconnu : ${id}`);
  return noeud;
}

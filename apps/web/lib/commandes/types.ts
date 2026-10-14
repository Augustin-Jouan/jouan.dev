/**
 * Commandes de la palette (Cmd+K, sous-projet 7). La liste (`data/commandes.ts`)
 * est construite côté serveur et passée au navigateur : tout y est sérialisable,
 * d'où une condition d'affichage déclarative plutôt qu'une fonction.
 */
export const GROUPES = ["Navigation", "Actions", "Pour le plaisir"] as const;
export type GroupeCommande = (typeof GROUPES)[number];

export type ActionCommande =
  | { type: "lien"; href: string; nouvelOnglet?: boolean }
  | { type: "copier"; texte: string; confirmation: string }
  | { type: "evenement"; nom: string };

/**
 * Condition d'affichage, évaluée à l'ouverture de la palette :
 * - `intro` : sur l'accueil, quand l'intro WebGL peut s'y jouer.
 */
export type ConditionCommande = "intro";

export type Commande = {
  id: string;
  libelle: string;
  groupe: GroupeCommande;
  motsCles: string[];
  action: ActionCommande;
  condition?: ConditionCommande;
};

/** Ce que la palette lit de la page à son ouverture (`lib/commandes/contexte.ts`). */
export type ContexteCommandes = {
  chemin: string;
  introDisponible: boolean;
};

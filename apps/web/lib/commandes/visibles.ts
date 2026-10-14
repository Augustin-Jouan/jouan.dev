import type { Commande, ContexteCommandes } from "./types";

const surAccueil = (chemin: string) => chemin === "/" || chemin.startsWith("/pour/");

/** Les commandes à proposer dans ce contexte. */
export function commandesVisibles(commandes: Commande[], contexte: ContexteCommandes): Commande[] {
  return commandes.filter(
    (commande) => commande.condition !== "intro" || (contexte.introDisponible && surAccueil(contexte.chemin)),
  );
}

import type { Commande, ContexteCommandes } from "./types";

const surAccueil = (chemin: string) => chemin === "/" || chemin.startsWith("/pour/");

/** Les commandes à proposer dans ce contexte, libellé du curseur selon son état. */
export function commandesVisibles(commandes: Commande[], contexte: ContexteCommandes): Commande[] {
  return commandes.flatMap((commande) => {
    if (commande.condition === "intro" && !(contexte.introDisponible && surAccueil(contexte.chemin))) return [];
    if (commande.condition === "presence") {
      if (!contexte.presence) return [];
      if (contexte.presence === "masquee" && commande.libelleInverse) {
        return [{ ...commande, libelle: commande.libelleInverse }];
      }
    }
    return [commande];
  });
}

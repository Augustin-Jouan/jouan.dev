import { allerAAncre } from "@/lib/defilement";
import type { ActionCommande } from "./types";

export type OutilsExecution = {
  /** Navigation interne par le routeur Next. */
  naviguer: (href: string) => void;
  /** Message pour la zone `aria-live` (copie réussie, ou texte à copier). */
  annoncer: (message: string) => void;
};

/** Exécute l'action d'une commande, une fois la palette fermée. */
export async function executerAction(action: ActionCommande, outils: OutilsExecution): Promise<void> {
  switch (action.type) {
    case "lien": {
      if (action.nouvelOnglet) {
        window.open(action.href, "_blank", "noopener");
        return;
      }
      // Ancre de l'accueil, depuis l'accueil : on ne change que le hash, comme
      // LienSection, pour garder un lien personnalisé (`/?pour=…`).
      if (action.href.startsWith("/#") && window.location.pathname === "/") {
        allerAAncre(action.href.slice(1));
        return;
      }
      outils.naviguer(action.href);
      return;
    }
    case "copier":
      try {
        await navigator.clipboard.writeText(action.texte);
        outils.annoncer(action.confirmation);
      } catch {
        outils.annoncer(`Copie impossible. À copier : ${action.texte}`);
      }
      return;
    case "evenement":
      window.dispatchEvent(new Event(action.nom));
  }
}

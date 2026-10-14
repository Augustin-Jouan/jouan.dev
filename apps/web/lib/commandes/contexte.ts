import type { ContexteCommandes } from "./types";

/**
 * Contexte lu dans la page à l'ouverture de la palette : l'intro est disponible
 * quand le fond de l'accueil peut jouer l'encre (`data-mode` intro ou nuage animé,
 * pas le nuage figé du mouvement réduit ou sans WebGL).
 */
export function lireContexte(): ContexteCommandes {
  const mode = document.querySelector(".fond-accueil")?.getAttribute("data-mode");
  return {
    chemin: window.location.pathname,
    introDisponible: mode === "intro" || mode === "nuage-anime",
  };
}

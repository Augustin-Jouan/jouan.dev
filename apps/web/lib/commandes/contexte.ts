import type { ContexteCommandes } from "./types";

/**
 * Contexte lu dans la page à l'ouverture de la palette : l'intro est disponible
 * quand le fond de l'accueil peut jouer l'encre (`data-mode` intro ou halo animé,
 * pas le halo CSS du mouvement réduit ou sans WebGL) ; la présence, quand le
 * bouton du curseur est affiché (`data-presence`, components/direct/CompteurPresents.tsx).
 */
export function lireContexte(): ContexteCommandes {
  const mode = document.querySelector(".fond-accueil")?.getAttribute("data-mode");
  const presence = document.querySelector("[data-presence]")?.getAttribute("data-presence");
  return {
    chemin: window.location.pathname,
    introDisponible: mode === "intro" || mode === "halo-anime",
    presence: presence === "connectee" || presence === "masquee" ? presence : null,
  };
}

import { CLE_INTRO_VUE } from "./decision";

/**
 * Voile de l'intro : sans lui, la page s'affiche le temps que le JavaScript
 * décide de jouer l'intro et charge le moteur. Un script en tête de page
 * (`SCRIPT_VOILE`, app/layout.tsx), exécuté avant le premier affichage, pose
 * cet attribut sur <html> quand l'intro va se jouer ; le CSS couvre alors la page
 * de la couleur de la nuit, sous la goutte. IntroEncre le lève dès que la goutte
 * couvre l'écran, ou dès qu'il n'y aura pas d'intro.
 */
export const ATTRIBUT_VOILE = "data-voile-intro";

/** Si rien ne le lève (JavaScript de la page en échec), le voile part seul. */
export const DELAI_SECURITE_VOILE_MS = 4000;

/**
 * Mêmes conditions que `deciderMode` (decision.ts), sans le défilement, encore
 * inconnu en tête de page : accueil (ou accueil personnalisé), sans ancre, sans
 * mouvement réduit, avec WebGL2, intro pas encore vue dans cet onglet.
 */
export const SCRIPT_VOILE = `(function () {
  var p = location.pathname;
  if ((p !== "/" && p.indexOf("/pour/") !== 0) || location.hash) return;
  try {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch (e) {
    return;
  }
  if (typeof WebGL2RenderingContext === "undefined") return;
  try {
    if (sessionStorage.getItem(${JSON.stringify(CLE_INTRO_VUE)}) === "1") return;
  } catch (e) {}
  var racine = document.documentElement;
  racine.setAttribute(${JSON.stringify(ATTRIBUT_VOILE)}, "");
  setTimeout(function () {
    racine.removeAttribute(${JSON.stringify(ATTRIBUT_VOILE)});
  }, ${DELAI_SECURITE_VOILE_MS});
})();`;

export function leverVoile(): void {
  document.documentElement.removeAttribute(ATTRIBUT_VOILE);
}

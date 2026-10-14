/**
 * Défilement doux (Lenis) : la molette et le pavé tactile glissent au lieu
 * d'avancer par crans. Chargé à part, après l'affichage et seulement avec une
 * souris (components/layout/DefilementDoux.tsx) ; le tactile reste natif.
 */
import Lenis from "lenis";
import { allerAAncre, brancherDefilement } from "./defilement";

/** Repère ce morceau de JS dans le build (scripts/verifier-taille-defilement.mjs). */
export const MARQUEUR_DEFILEMENT = "defilement-lenis:v1";

/**
 * Clic sur un lien d'ancre de la page courante : glissé de Lenis au lieu du saut
 * natif. Restent au navigateur : modificateurs, nouvel onglet, autre page et le
 * lien d'évitement (`data-defilement-natif`), qui doit déplacer le focus d'un coup.
 */
function surClic(evenement: MouseEvent): void {
  if (evenement.defaultPrevented || evenement.button !== 0) return;
  if (evenement.metaKey || evenement.ctrlKey || evenement.shiftKey || evenement.altKey) return;
  const lien = (evenement.target as Element | null)?.closest?.("a[href]");
  if (!(lien instanceof HTMLAnchorElement) || lien.target || lien.hasAttribute("data-defilement-natif")) return;
  const url = new URL(lien.href);
  if (!url.hash || url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
  if (!document.getElementById(decodeURIComponent(url.hash.slice(1)))) return;
  evenement.preventDefault();
  allerAAncre(decodeURIComponent(url.hash));
}

export function demarrerDefilement(): () => void {
  const lenis = new Lenis({
    autoRaf: true,
    // Une zone qui défile elle-même (liste, champ de message) garde la molette.
    allowNestedScroll: true,
    // Changer de page coupe l'élan d'un glissé en cours.
    stopInertiaOnNavigate: true,
  });
  brancherDefilement(lenis);
  document.addEventListener("click", surClic);
  return () => {
    document.removeEventListener("click", surClic);
    brancherDefilement(null);
    lenis.destroy();
  };
}

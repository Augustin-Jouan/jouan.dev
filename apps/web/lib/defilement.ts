/**
 * Défilement de la page, avec ou sans le défilement doux (Lenis, chargé après
 * l'affichage par components/layout/DefilementDoux.tsx). Ce module reste léger :
 * il ne connaît Lenis que par `scrollTo`, branché une fois Lenis démarré.
 */
export type MoteurDefilement = {
  scrollTo(cible: HTMLElement | number, options?: { offset?: number; immediate?: boolean }): void;
};

let moteur: MoteurDefilement | null = null;

export function brancherDefilement(m: MoteurDefilement | null): void {
  moteur = m;
}

/**
 * Va à une ancre de la page (`#offre`) en ne changeant que le hash : la recherche
 * (`/?pour=…`) est gardée. Avec le défilement doux, la page glisse jusqu'à la
 * section (Lenis tient compte de sa marge `scroll-mt-*`) ; sinon, le navigateur
 * défile lui-même.
 */
export function allerAAncre(ancre: string): void {
  const cible = document.getElementById(ancre.slice(1));
  if (moteur && cible) {
    if (window.location.hash !== ancre) window.history.pushState(null, "", ancre);
    moteur.scrollTo(cible);
    return;
  }
  if (window.location.hash === ancre) cible?.scrollIntoView();
  else window.location.hash = ancre;
}

/** Retour en haut d'un coup (intro rejouée), sans laisser le défilement doux finir un glissé. */
export function remonterEnHaut(): void {
  if (moteur) moteur.scrollTo(0, { immediate: true });
  else window.scrollTo({ top: 0, behavior: "instant" });
}

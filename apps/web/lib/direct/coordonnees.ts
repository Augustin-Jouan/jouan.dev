/**
 * Coordonnées partagées : la section de l'accueil sous la souris et la position
 * relative dans cette section (0 à 1). Chaque visiteur reconvertit dans sa
 * propre mise en page : un curseur retombe dans la même zone de la même section
 * (même bande de lecture), quelle que soit la largeur d'écran — pas forcément
 * sur le même mot, le texte se recomposant. Les sections portent
 * `data-direct-section="<repère>"` ; l'intro « goutte d'encre » n'en est pas une.
 */
export type Boite = { gauche: number; haut: number; largeur: number; hauteur: number };
export type Repere = { s: number; x: number; y: number };

const arrondir = (v: number) => Math.round(v * 10_000) / 10_000;

/** Point de la page (px, défilement compris) → repère ; `null` hors de toute section. */
export function versRepere(px: number, py: number, sections: Boite[]): Repere | null {
  for (let s = 0; s < sections.length; s++) {
    const b = sections[s]!;
    if (b.largeur <= 0 || b.hauteur <= 0) continue;
    if (px >= b.gauche && px <= b.gauche + b.largeur && py >= b.haut && py < b.haut + b.hauteur) {
      return { s, x: arrondir((px - b.gauche) / b.largeur), y: arrondir((py - b.haut) / b.hauteur) };
    }
  }
  return null;
}

/** Repère → point de la page ; `null` si la section est absente ou vide ici. */
export function versPage(r: Repere, sections: Boite[]): { x: number; y: number } | null {
  const b = sections[r.s];
  if (!b || b.largeur <= 0 || b.hauteur <= 0) return null;
  return { x: b.gauche + r.x * b.largeur, y: b.haut + r.y * b.hauteur };
}

/**
 * Table des repères : l'indice `s` échangé avec le service est la position dans
 * cette table, indépendante de l'ordre du document (spec du sous-projet 4, §4).
 */
export const REPERES = ["accroche", "offre", "realisations", "methode", "parcours", "contact"] as const;

const BOITE_VIDE: Boite = { gauche: 0, haut: 0, largeur: 0, hauteur: 0 };

/** Une boîte par repère, en coordonnées de page ; vide si la section manque. */
export function boitesDesSections(racine: ParentNode = document): Boite[] {
  return REPERES.map((repere) => {
    const el = racine.querySelector<HTMLElement>(`[data-direct-section="${repere}"]`);
    if (!el) return BOITE_VIDE;
    const r = el.getBoundingClientRect();
    return { gauche: r.left + window.scrollX, haut: r.top + window.scrollY, largeur: r.width, hauteur: r.height };
  });
}

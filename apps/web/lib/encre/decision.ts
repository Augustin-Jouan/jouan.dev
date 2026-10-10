/** Ce que l'accueil affiche en fond. */
export type ModeEncre = "intro" | "nuage-anime" | "nuage-fige";

export type Contexte = {
  /** `prefers-reduced-motion: reduce`. */
  mouvementReduit: boolean;
  /** Le navigateur expose WebGL2 (la création du contexte peut encore échouer). */
  webgl2: boolean;
  /** L'intro a déjà été vue pendant cette visite (dans cet onglet). */
  dejaVu: boolean;
  /** La page n'est pas en haut (défilement restauré) : l'intro ne couvrirait pas l'écran. */
  defilee: boolean;
};

export function deciderMode(contexte: Contexte): ModeEncre {
  if (contexte.mouvementReduit || !contexte.webgl2) return "nuage-fige";
  if (contexte.dejaVu || contexte.defilee) return "nuage-anime";
  return "intro";
}

export const CLE_INTRO_VUE = "jouan.dev:intro-vue";

/**
 * `sessionStorage`, ou null quand le navigateur en refuse l'accès. L'intro se
 * joue à chaque visite (chaque nouvel onglet), mais pas au rechargement ni au
 * retour à l'accueil dans le même onglet.
 */
export function stockageSession(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Un stockage illisible vaut « jamais vue » : l'intro se rejoue, sans erreur. */
export function introDejaVue(stockage: Pick<Storage, "getItem"> | null): boolean {
  try {
    return stockage?.getItem(CLE_INTRO_VUE) === "1";
  } catch {
    return false;
  }
}

export function marquerIntroVue(stockage: Pick<Storage, "setItem"> | null): void {
  try {
    stockage?.setItem(CLE_INTRO_VUE, "1");
  } catch {
    // Stockage plein ou refusé : l'intro se rejouera au prochain affichage de l'accueil.
  }
}

/** Ce que l'accueil affiche en fond. */
export type ModeEncre = "intro" | "halo-anime" | "halo-css";

export type Contexte = {
  /** `prefers-reduced-motion: reduce`. */
  mouvementReduit: boolean;
  /** Le navigateur expose WebGL2 (la création du contexte peut encore échouer). */
  webgl2: boolean;
  /** L'intro a déjà été vue sur ce navigateur. */
  dejaVu: boolean;
  /** La page n'est pas en haut (défilement restauré) : l'intro ne couvrirait pas l'écran. */
  defilee: boolean;
};

export function deciderMode(contexte: Contexte): ModeEncre {
  if (contexte.mouvementReduit || !contexte.webgl2) return "halo-css";
  if (contexte.dejaVu || contexte.defilee) return "halo-anime";
  return "intro";
}

export const CLE_INTRO_VUE = "jouan.dev:intro-vue";

/** `localStorage`, ou null quand le navigateur en refuse l'accès. */
export function stockageLocal(): Storage | null {
  try {
    return window.localStorage;
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
    // Stockage plein ou refusé : l'intro se rejouera à la prochaine visite.
  }
}

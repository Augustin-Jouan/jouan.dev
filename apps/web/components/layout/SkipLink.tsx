/** Identifiant du contenu principal, cible du lien d'évitement. */
export const CONTENU_ID = "contenu";

/**
 * Premier élément focusable de la page : un utilisateur au clavier ou au
 * lecteur d'écran saute l'en-tête et sa navigation d'un seul Tab + Entrée.
 * Invisible tant qu'il n'a pas le focus. Le style au focus est à faire par
 * site ; ne pas retirer `sr-only` / `focus:not-sr-only`.
 */
export function SkipLink() {
  return (
    <a
      href={`#${CONTENU_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-papier focus:px-4 focus:py-2 focus:underline"
    >
      Aller au contenu
    </a>
  );
}

/**
 * Halo de repli, en CSS pur (`.halo-css` dans app/globals.css) : présent dans
 * le HTML dès la première réponse, il suffit sans JavaScript, avec le
 * mouvement réduit ou quand WebGL échoue. Il reproduit l'état final de
 * l'intro : le canvas s'y substitue sans saut visible.
 */
export function HaloCss() {
  return <div className="halo-css" />;
}

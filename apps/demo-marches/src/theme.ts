/**
 * Thème de la démo : claire quand on l'ouvre seule ; sombre quand le site
 * l'intègre (`?theme=sombre`), pour s'accorder à sa charte « Nuit mauve ».
 * Pose `data-theme="sombre"` : la règle CSS de styles/jetons.css déclare
 * `color-scheme: dark`, et c'est à elle que LightningCSS attache la bascule des
 * valeurs sombres de `light-dark()` (un style en ligne ne la déclencherait pas).
 * Appelé avant le premier rendu, sans script en ligne (la CSP du site s'applique).
 */
export function appliquerTheme(recherche: string, racine: HTMLElement): void {
  if (new URLSearchParams(recherche).get("theme") === "sombre") racine.dataset.theme = "sombre";
}

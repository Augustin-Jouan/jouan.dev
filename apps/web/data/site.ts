// Configuration globale du site.
// Ne pas utiliser `siteUrl` dans un composant client : `process.env.SITE_URL`
// n'y existe pas et la valeur retomberait sur le défaut.
export const siteUrl = resolveSiteUrl();

export const siteName = "Augustin Jouan";

export const siteDescription =
  "Développeur full stack indépendant : applications métier sur mesure et sites vitrines, conçus, développés et hébergés de A à Z.";

/**
 * Cette URL alimente les balises canonical, le sitemap, le robots.txt, les
 * données structurées et les métadonnées de partage. Un build de production
 * fait avec une URL locale produirait un référencement entièrement cassé :
 * on préfère faire échouer le build.
 */
function resolveSiteUrl(): string {
  const url = process.env.SITE_URL ?? "https://jouan.dev";

  if (
    process.env.NODE_ENV === "production" &&
    /localhost|127\.0\.0\.1|^http:\/\//.test(url)
  ) {
    throw new Error(
      `SITE_URL invalide pour un build de production : « ${url} ». ` +
        "Attendu : l'URL publique du site en https."
    );
  }

  // Pas de barre finale : les chemins sont concaténés tels quels.
  return url.replace(/\/+$/, "");
}

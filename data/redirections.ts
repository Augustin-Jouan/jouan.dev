/**
 * Anciennes adresses à rediriger vers le nouveau site (refonte d'un site
 * existant). Une redirection permanente transfère leur référencement.
 * Sources : sitemap de l'ancien site, Search Console, `site:` dans Google.
 *
 * Exemple : { source: "/contact.php", destination: "/contact", permanent: true }
 */
export type Redirection = {
  source: string;
  destination: string;
  permanent: true;
};

export const redirections: Redirection[] = [];

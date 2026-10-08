export type NavLink = {
  href: string;
  label: string;
};

/**
 * Liens de l'en-tête vers les sections de l'accueil. Des ancres absolues
 * (`/#offre`) : elles ramènent aussi à l'accueil depuis les pages légales.
 */
export const navLinks: NavLink[] = [
  { href: "/#realisations", label: "Réalisations" },
  { href: "/#offre", label: "Offre" },
  { href: "/#contact", label: "Contact" },
];

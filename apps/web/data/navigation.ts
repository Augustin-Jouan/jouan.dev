export type NavLink = {
  href: string;
  label: string;
};

/**
 * Liens de l'en-tête : la page des réalisations, puis des sections de l'accueil
 * en ancres absolues (`/#offre`), qui y ramènent aussi depuis les autres pages.
 */
export const navLinks: NavLink[] = [
  { href: "/realisations", label: "Réalisations" },
  { href: "/#offre", label: "Offre" },
  { href: "/#contact", label: "Contact" },
];

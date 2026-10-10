export type NavLink = {
  href: string;
  label: string;
};

/**
 * Liens de l'en-tête : les pages des réalisations et des coulisses, et des
 * sections de l'accueil en ancres absolues (`/#offre`), qui y ramènent aussi
 * depuis les autres pages.
 */
export const navLinks: NavLink[] = [
  { href: "/realisations", label: "Réalisations" },
  { href: "/#offre", label: "Offre" },
  { href: "/coulisses", label: "Coulisses" },
  { href: "/#contact", label: "Contact" },
];

export type NavLink = {
  href: string;
  label: string;
};

/**
 * Liens de l'en-tête : les pages des réalisations et des coulisses, et le
 * contact de l'accueil en ancre absolue (`/#contact`), qui y ramène aussi
 * depuis les autres pages.
 */
export const navLinks: NavLink[] = [
  { href: "/realisations", label: "Réalisations" },
  { href: "/coulisses", label: "Coulisses" },
  { href: "/#contact", label: "Contact" },
];

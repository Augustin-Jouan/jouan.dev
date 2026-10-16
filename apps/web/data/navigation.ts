export type NavLink = {
  href: string;
  label: string;
};

/**
 * Liens de l'en-tête (et de la colonne Site du pied de page) : les pages des
 * réalisations, de l'à-propos et des coulisses, et le
 * contact de l'accueil en ancre absolue (`/#contact`), qui y ramène aussi
 * depuis les autres pages.
 */
export const navLinks: NavLink[] = [
  { href: "/realisations", label: "Réalisations" },
  { href: "/a-propos", label: "À propos" },
  { href: "/coulisses", label: "Coulisses" },
  { href: "/#contact", label: "Contact" },
];

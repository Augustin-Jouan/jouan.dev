export type NavLink = {
  href: string;
  label: string;
};

/** Menu principal, dans l'ordre d'affichage. Ajouter une entrée par page créée. */
export const navLinks: NavLink[] = [
  { href: "/", label: "Accueil" },
  { href: "/contact", label: "Contact" },
];

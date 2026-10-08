"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinks } from "@/data/navigation";
import { siteName } from "@/data/site";

/**
 * En-tête minimal : nom du site et menu. `aria-current` marque la page
 * courante pour les lecteurs d'écran ; c'est la seule raison du `use client`.
 * Le design (logo, menu mobile, bouton d'appel) est à faire par site.
 */
export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold">
          {siteName}
        </Link>
        <nav aria-label="Navigation principale">
          <ul className="flex flex-wrap gap-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={estCourant(pathname, link.href) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

/** L'accueil ne s'allume que sur « / » ; les autres couvrent leurs sous-pages. */
function estCourant(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

import Link from "next/link";
import type { ReactNode } from "react";
import { BoutonCommandes } from "@/components/commandes/BoutonCommandes";
import { contact } from "@/data/contact";
import { navLinks } from "@/data/navigation";
import { hoteSite, siteName } from "@/data/site";

const lien = "hover:text-texte";

/** Lien vers un profil, ouvert dans un nouvel onglet ; `me` relie le profil au site. */
function Profil({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="me noopener" className={lien}>
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> (nouvel onglet)</span>
    </a>
  );
}

/**
 * Une colonne : son titre et ses liens, puis son indice. Sur ordinateur, les trois colonnes partagent les
 * rangées du pied de page (subgrid) : les indices s'alignent sur une même ligne, quelle que soit la
 * longueur des listes. Sur téléphone, la colonne s'efface (`contents`) : ses liens, centrés et en ligne,
 * s'empilent avec ceux des autres, et son indice rejoint les autres en bas (`order-last`).
 */
function Colonne({
  titre,
  indice,
  className = "",
  classeIndice = "",
  children,
}: {
  titre: string;
  indice: ReactNode;
  className?: string;
  classeIndice?: string;
  children: ReactNode;
}) {
  return (
    <div className={`max-sm:contents sm:row-span-2 sm:grid sm:grid-rows-subgrid sm:gap-y-10 ${className}`}>
      <div className="max-sm:mb-8">
        <h2 className="mb-3 text-xs uppercase tracking-[0.14em] text-texte">{titre}</h2>
        <ul className="flex flex-col gap-2 max-sm:flex-row max-sm:flex-wrap max-sm:justify-center max-sm:gap-x-5">{children}</ul>
      </div>
      <p className={`max-sm:order-last max-sm:mb-2 ${classeIndice}`}>{indice}</p>
    </div>
  );
}

/**
 * Pied de page en trois colonnes (spec 2026-10-15-pied-de-page-design) : Me joindre, Site, Légal, chacune
 * avec son indice (CV par curl, palette de commandes, ©).
 */
export function Footer() {
  return (
    <footer>
      <nav
        aria-label="Pied de page"
        className="mx-auto grid max-w-6xl grid-cols-1 justify-items-center px-5 pb-8 pt-12 text-center text-sm text-texte-doux sm:grid-cols-[1fr_auto_1fr] sm:justify-items-stretch sm:gap-x-6 sm:px-8 sm:text-left 2xl:max-w-page"
      >
        <Colonne
          titre="Me joindre"
          indice={<code className="font-mono">curl -L {hoteSite}</code>}
          // Sur téléphone, un filet sépare les liens des trois indices.
          classeIndice="max-sm:w-full max-sm:border-t max-sm:border-trait max-sm:pt-8"
        >
          {/* L'adresse seule sur sa ligne ; GitHub et LinkedIn ensemble dessous. */}
          <li className="max-sm:basis-full">
            <a href={`mailto:${contact.email}`} className={lien}>
              {contact.email}
            </a>
          </li>
          <li>
            <Profil href={contact.github}>GitHub</Profil>
          </li>
          <li>
            <Profil href={contact.linkedin}>LinkedIn</Profil>
          </li>
        </Colonne>
        <Colonne titre="Site" indice={<BoutonCommandes />} className="sm:justify-self-center">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={lien}>
                {l.label}
              </Link>
            </li>
          ))}
        </Colonne>
        <Colonne
          titre="Légal"
          indice={`© ${new Date().getFullYear()} ${siteName}`}
          className="sm:justify-self-end"
        >
          <li>
            <Link href="/mentions-legales" className={lien}>
              Mentions légales
            </Link>
          </li>
          <li>
            <Link href="/politique-de-confidentialite" className={lien}>
              Politique de confidentialité
            </Link>
          </li>
        </Colonne>
      </nav>
    </footer>
  );
}

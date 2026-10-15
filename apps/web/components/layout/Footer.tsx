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
 * longueur des listes.
 */
function Colonne({ titre, indice, className = "", children }: { titre: string; indice: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-4 sm:row-span-2 sm:grid sm:grid-rows-subgrid sm:gap-y-10 ${className}`}>
      <div>
        <h2 className="mb-3 text-xs uppercase tracking-[0.14em] text-texte">{titre}</h2>
        <ul className="flex flex-col gap-2">{children}</ul>
      </div>
      <p>{indice}</p>
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
        className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-5 pb-8 pt-12 text-sm text-texte-doux sm:grid-cols-[1fr_auto_1fr] sm:gap-y-0 sm:px-8 2xl:max-w-page"
      >
        <Colonne titre="Me joindre" indice={<code className="font-mono">curl -L {hoteSite}</code>}>
          <li>
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

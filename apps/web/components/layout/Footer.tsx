import Link from "next/link";
import { BoutonCommandes } from "@/components/commandes/BoutonCommandes";
import { contact } from "@/data/contact";
import { hoteSite, siteName } from "@/data/site";

/**
 * Pied de page : signature, e-mail, GitHub, coulisses et pages légales, puis
 * les indices des easter eggs (palette de commandes, CV dans le terminal).
 */
export function Footer() {
  return (
    <footer className="border-t border-trait">
      <div className="mx-auto flex max-w-6xl 2xl:max-w-page flex-col gap-4 px-5 pb-4 pt-8 text-sm text-texte-doux sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          © {new Date().getFullYear()} {siteName}
        </p>
        <nav aria-label="Pied de page">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <a href={`mailto:${contact.email}`} className="hover:text-texte">
                {contact.email}
              </a>
            </li>
            <li>
              <a href={contact.github} target="_blank" rel="me noopener" className="hover:text-texte">
                GitHub<span className="sr-only"> (nouvel onglet)</span>
              </a>
            </li>
            <li>
              <Link href="/coulisses" className="hover:text-texte">
                Coulisses
              </Link>
            </li>
            <li>
              <Link href="/mentions-legales" className="hover:text-texte">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/politique-de-confidentialite" className="hover:text-texte">
                Politique de confidentialité
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-5 pb-8 text-sm text-texte-doux sm:px-8 2xl:max-w-page">
        <BoutonCommandes />
        {" · "}
        <code className="font-mono">curl -L {hoteSite}</code>
      </p>
    </footer>
  );
}

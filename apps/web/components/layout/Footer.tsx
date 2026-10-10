import Link from "next/link";
import { contact } from "@/data/contact";
import { siteName } from "@/data/site";

/** Pied de page : signature, e-mail, GitHub, coulisses et pages légales. */
export function Footer() {
  return (
    <footer className="border-t border-trait">
      <div className="mx-auto flex max-w-6xl 2xl:max-w-page flex-col gap-4 px-5 py-8 text-sm text-texte-doux sm:flex-row sm:items-center sm:justify-between sm:px-8">
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
              <a href={contact.github} rel="me" className="hover:text-texte">
                GitHub
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
    </footer>
  );
}

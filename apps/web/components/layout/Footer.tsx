import Link from "next/link";
import { contact } from "@/data/contact";
import { siteName } from "@/data/site";

/** Pied de page minimal : coordonnées, liens légaux, copyright. */
export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 text-sm">
        <address className="not-italic">
          <p>{contact.adresse}</p>
          <p>
            <a href={contact.telephoneLien}>{contact.telephone}</a>
          </p>
          <p>
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </p>
        </address>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {siteName}</p>
          <nav aria-label="Liens légaux">
            <ul className="flex flex-wrap gap-4">
              <li>
                <Link href="/mentions-legales">Mentions légales</Link>
              </li>
              <li>
                <Link href="/politique-de-confidentialite">Politique de confidentialité</Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { navLinks } from "@/data/navigation";
import { siteName } from "@/data/site";
import { LienSection } from "./LienSection";

/** En-tête : nom du site et liens vers les sections de l'accueil. */
export function Header() {
  return (
    <header>
      <div className="mx-auto flex max-w-6xl 2xl:max-w-page flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-5 sm:px-8">
        <Link href="/" prefetch={false} className="font-serif text-2xl leading-none 2xl:text-3xl">
          {siteName}
        </Link>
        <nav aria-label="Navigation principale">
          <ul className="flex gap-5 text-sm text-encre-douce 2xl:gap-7 2xl:text-base">
            {navLinks.map((link) => (
              <li key={link.href}>
                <LienSection href={link.href} className="transition-colors hover:text-encre">
                  {link.label}
                </LienSection>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

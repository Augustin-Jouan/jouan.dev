import { navLinks } from "@/data/navigation";
import { siteName } from "@/data/site";
import { LienAuSurvol } from "./LienAuSurvol";
import { LienSection } from "./LienSection";

/** En-tête : nom du site et liens vers les sections de l'accueil. */
export function Header() {
  return (
    <header>
      <div className="mx-auto flex max-w-6xl 2xl:max-w-page flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-5 sm:px-8">
        <LienAuSurvol href="/" className="font-serif text-2xl leading-none 2xl:text-3xl">
          {siteName}
        </LienAuSurvol>
        <nav aria-label="Navigation principale">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-texte-doux sm:gap-x-5 2xl:gap-x-7 2xl:text-base">
            {navLinks.map((link) => (
              <li key={link.href} className="whitespace-nowrap">
                <LienSection href={link.href} className="transition-[color] hover:text-texte">
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

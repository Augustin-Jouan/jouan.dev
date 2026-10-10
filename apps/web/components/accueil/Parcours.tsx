import { Section } from "./Section";
import { ANCRES, parcours, sections } from "@/data/accueil";

/** Parcours en quelques lignes ; la version complète viendra avec /api/me. */
export function Parcours() {
  return (
    <Section id={ANCRES.parcours} {...sections.parcours}>
      <ul className="flex max-w-3xl flex-col divide-y divide-trait border-y border-trait">
        {parcours.map((ligne) => (
          <li key={ligne.avant} className="py-4 text-lg">
            {ligne.avant}
            {ligne.lien && (
              <a href={ligne.lien.href} className="underline underline-offset-4 transition-[color] hover:text-accent">
                {ligne.lien.libelle}
              </a>
            )}
            {ligne.apres}
          </li>
        ))}
      </ul>
    </Section>
  );
}

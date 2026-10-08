import { Section } from "./Section";
import { ANCRES, parcours, sections } from "@/data/accueil";

/** Parcours en quelques lignes ; la version complète viendra avec /api/me. */
export function Parcours() {
  return (
    <Section id={ANCRES.parcours} {...sections.parcours}>
      <ul className="flex max-w-3xl flex-col divide-y divide-trait border-y border-trait">
        {parcours.map((ligne) => (
          <li key={ligne} className="py-4 text-lg">
            {ligne}
          </li>
        ))}
      </ul>
    </Section>
  );
}

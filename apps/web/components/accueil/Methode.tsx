import { Section } from "./Section";
import { ANCRES, etapes, sections } from "@/data/accueil";

/** Les étapes d'un projet, numérotées. */
export function Methode() {
  return (
    <Section id={ANCRES.methode} {...sections.methode}>
      <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
        {etapes.map((etape, index) => (
          <li key={etape.titre} className="flex flex-col gap-2 border-t border-trait pt-5">
            <span aria-hidden="true" className="font-serif text-3xl text-accent">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="font-medium">{etape.titre}</h3>
            <p className="text-sm text-texte-doux">{etape.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

import type { CSSProperties } from "react";
import { FriseMethode } from "./FriseMethode";
import { Section } from "./Section";
import { ANCRES, etapes, sections } from "@/data/accueil";

/**
 * Les étapes d'un projet, reliées par un fil qui se trace quand la frise arrive à
 * l'écran : chaque étape s'allume à son passage (goutte de lumière sur le numéro),
 * puis un paquet de lumière parcourt le fil. Déclenchement : FriseMethode ;
 * effets : app/globals.css, « Méthode ». Sans JS ou en mouvement réduit, la frise
 * est affichée finie.
 */
export function Methode() {
  return (
    <Section id={ANCRES.methode} {...sections.methode}>
      <FriseMethode>
        <div aria-hidden="true" className="methode-fil">
          <span className="methode-fil__plein" />
          <span className="methode-paquet">
            <span className="methode-paquet__trajet" />
          </span>
        </div>
        <ol className="grid gap-10 lg:grid-cols-5 lg:gap-8">
          {etapes.map((etape, index) => (
            <li key={etape.titre} className="methode-etape" style={{ "--i": index } as CSSProperties}>
              <span aria-hidden="true" className="methode-noeud" />
              <span aria-hidden="true" className="methode-num font-serif text-5xl leading-none text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-medium">{etape.titre}</h3>
              <p className="mt-2 text-sm text-texte-doux">{etape.description}</p>
            </li>
          ))}
        </ol>
      </FriseMethode>
    </Section>
  );
}

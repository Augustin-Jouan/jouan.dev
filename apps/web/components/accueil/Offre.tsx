import { Section } from "./Section";
import { ANCRES, offresPour, sections, type Angle, type Offre as OffreType } from "@/data/accueil";

/** Les deux paliers de l'offre ; l'offre mise en avant est plus large et sombre. */
export function Offre({ angle = "application" }: { angle?: Angle }) {
  return (
    <Section id={ANCRES.offre} {...sections.offre}>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {offresPour(angle).map((offre) => (
          <CarteOffre key={offre.id} offre={offre} />
        ))}
      </div>
    </Section>
  );
}

function CarteOffre({ offre }: { offre: OffreType }) {
  const sombre = offre.miseEnAvant;

  return (
    <article
      className={`flex flex-col gap-6 rounded-3xl p-8 sm:p-10 ${
        sombre ? "bg-encre text-papier" : "border border-trait"
      }`}
    >
      <div>
        {sombre && (
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-braise-claire">
            Mon cœur de métier
          </p>
        )}
        <h3 className="font-serif text-3xl sm:text-4xl">{offre.titre}</h3>
        <p className={`mt-3 ${sombre ? "text-papier/75" : "text-encre-douce"}`}>{offre.pourQui}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {offre.livrables.map((livrable) => (
          <li key={livrable} className="flex gap-3">
            <span aria-hidden="true" className={sombre ? "text-braise-claire" : "text-brique"}>
              —
            </span>
            {livrable}
          </li>
        ))}
      </ul>
      <p className={`mt-auto text-sm ${sombre ? "text-papier/70" : "text-encre-douce"}`}>
        {offre.exemple}
      </p>
    </article>
  );
}

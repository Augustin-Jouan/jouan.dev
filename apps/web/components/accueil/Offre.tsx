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
  const enAvant = offre.miseEnAvant;

  return (
    <article
      className={`flex flex-col gap-6 rounded-3xl p-8 sm:p-10 ${
        enAvant ? "bg-surface ring-1 ring-accent" : "border border-trait"
      }`}
    >
      <div>
        {enAvant && (
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-accent">
            Mon cœur de métier
          </p>
        )}
        <h3 className="font-serif text-3xl sm:text-4xl">{offre.titre}</h3>
        <p className="mt-3 text-texte-doux">{offre.pourQui}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {offre.livrables.map((livrable) => (
          <li key={livrable} className="flex gap-3">
            <span aria-hidden="true" className="text-accent">
              —
            </span>
            {livrable}
          </li>
        ))}
      </ul>
      <p className="mt-auto text-sm text-texte-doux">{offre.exemple}</p>
    </article>
  );
}

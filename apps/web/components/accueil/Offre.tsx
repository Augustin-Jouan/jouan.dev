import { Section } from "./Section";
import { LienAuSurvol } from "@/components/layout/LienAuSurvol";
import { ANCRES, offresPour, realisations, sections, type Angle, type Offre as OffreType } from "@/data/accueil";
import { apercuEtude, cheminEtude } from "@/data/realisations";

/**
 * Les deux paliers de l'offre, chacun avec son exemple en image ; l'offre mise en avant est plus large et
 * sombre. Le détail des réalisations est sur /realisations.
 */
export function Offre({ angle = "application" }: { angle?: Angle }) {
  return (
    <Section id={ANCRES.offre} {...sections.offre}>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {offresPour(angle).map((offre) => (
          <CarteOffre key={offre.id} offre={offre} />
        ))}
      </div>
      {/* Préchargé à l'intention seulement : le JS de /realisations hors du budget de l'accueil. */}
      <LienAuSurvol href="/realisations" className="mt-8 inline-block font-medium text-accent underline-offset-4 hover:underline">
        Toutes les réalisations<span aria-hidden="true"> →</span>
      </LienAuSurvol>
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
      <Exemple offre={offre} />
    </article>
  );
}

/** La preuve de l'offre : la capture de la réalisation, dans une fenêtre, qui mène à son étude de cas. */
function Exemple({ offre }: { offre: OffreType }) {
  const realisation = realisations.find((r) => r.slug === offre.etude)!;
  const image = apercuEtude(offre.etude);

  return (
    <LienAuSurvol
      href={cheminEtude(offre.etude)}
      className="group mt-auto block overflow-hidden rounded-2xl border border-trait transition-[border-color] hover:border-accent focus-visible:border-accent"
    >
      <span aria-hidden="true" className="flex gap-1.5 border-b border-trait px-3 py-2">
        <span className="size-2 rounded-full bg-trait" />
        <span className="size-2 rounded-full bg-trait" />
        <span className="size-2 rounded-full bg-trait" />
      </span>
      {/* Simple <img> : `next/image` ajouterait du JS client à l'accueil, au-delà du budget Lighthouse.
          Chargée à l'approche de la section, à ses dimensions réelles : rien ne bouge. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt=""
        width={image.largeur}
        height={image.hauteur}
        loading="lazy"
        decoding="async"
        className="aspect-video w-full object-cover object-top"
      />
      <span className="flex items-center justify-between gap-4 border-t border-trait px-4 py-3 text-sm">
        <span className="font-medium">
          <span className="sr-only">Voir l&apos;exemple :</span> {realisation.titre}
        </span>
        <span aria-hidden="true" className="shrink-0 text-accent">
          Voir l&apos;exemple →
        </span>
      </span>
    </LienAuSurvol>
  );
}

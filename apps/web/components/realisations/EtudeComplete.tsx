import { Captures } from "@/components/realisations/Captures";
import { FenetreDemo } from "@/components/realisations/FenetreDemo";
import { ancresEtudes, type EtudeDeCas } from "@/data/realisations";

const classeBloc = "mx-auto w-full max-w-6xl 2xl:max-w-page px-5 py-14 sm:px-8 sm:py-20";
const classeTitreBloc = "mb-8 font-serif text-3xl sm:text-4xl";

/**
 * Une étude de cas complète, posée sur /realisations sous son ancre (`#site-vitrine`) : un titre court, la
 * démo (ou les captures) tout de suite, puis les explications (besoin, livré, sous le capot).
 */
export function EtudeComplete({ etude }: { etude: EtudeDeCas }) {
  const ancre = ancresEtudes[etude.slug];
  const id = (bloc: string) => `${ancre}-${bloc}`;
  const avecDemo = etude.media.type === "demo";

  return (
    <article id={ancre} aria-labelledby={id("titre")} className="scroll-mt-8 border-t border-trait">
      <header className="mx-auto w-full max-w-6xl 2xl:max-w-page px-5 pb-6 pt-8 sm:px-8 sm:pt-10">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-texte-doux">{etude.surtitre}</p>
        <h2 id={id("titre")} className="max-w-4xl font-serif text-3xl leading-[1.08] sm:text-4xl">
          {etude.titre}
        </h2>
        <p className="mt-3 text-texte-doux">{etude.sousTitre}</p>
        {etude.site && (
          <a
            href={etude.site}
            target="_blank"
            rel="noopener"
            className="mt-3 inline-block font-medium text-accent underline underline-offset-4"
          >
            Voir le site<span aria-hidden="true"> ↗</span>
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        )}
      </header>

      {/* La démo d'abord, juste sous le titre : la barre de la fenêtre la nomme, l'intitulé reste pour les lecteurs d'écran. */}
      <section aria-labelledby={id("media")} className="mx-auto w-full max-w-6xl 2xl:max-w-page px-5 sm:px-8">
        <h3 id={id("media")} className="sr-only">
          {avecDemo ? "La démo" : "Le résultat"}
        </h3>
        {etude.media.type === "demo" ? (
          <FenetreDemo demo={etude.media} />
        ) : (
          <Captures images={etude.media.images} />
        )}
      </section>

      <section aria-labelledby={id("besoin")} className={classeBloc}>
        <h3 id={id("besoin")} className={classeTitreBloc}>
          Le besoin
        </h3>
        <div className="flex flex-col gap-4 text-lg text-texte-doux">
          {etude.besoin.map((paragraphe) => (
            <p key={paragraphe}>{paragraphe}</p>
          ))}
        </div>
      </section>

      <section aria-labelledby={id("livre")} className={classeBloc}>
        <h3 id={id("livre")} className={classeTitreBloc}>
          Ce que j&apos;ai livré
        </h3>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {etude.livre.map((element) => (
            <div key={element.titre} className="rounded-3xl border border-trait p-7">
              <h4 className="font-serif text-2xl">{element.titre}</h4>
              <p className="mt-3 text-texte-doux">{element.texte}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby={id("capot")} className={classeBloc}>
        <h3 id={id("capot")} className={classeTitreBloc}>
          Sous le capot
        </h3>
        <ul aria-label="Technologies" className="mb-10 flex flex-wrap gap-2">
          {etude.stack.map((techno) => (
            <li key={techno} className="rounded-full border border-trait px-3 py-1 text-xs">
              {techno}
            </li>
          ))}
        </ul>
        <div className="grid gap-8 md:grid-cols-3">
          {etude.choix.map((choix) => (
            <div key={choix.titre}>
              <h4 className="font-serif text-2xl">{choix.titre}</h4>
              <p className="mt-3 text-texte-doux">{choix.texte}</p>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}

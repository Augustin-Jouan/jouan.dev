import type { ProjetEcole } from "@/data/a-propos";
import { VideoProjet } from "./VideoProjet";

const surtitre = "text-xs font-medium uppercase tracking-[0.14em] text-texte-doux";

/**
 * Un projet d'école en pleine largeur : la vidéo dans la grande colonne, le récit
 * dans l'autre. `inverse` passe la vidéo à droite sur ordinateur, pour alterner d'un projet à l'autre ;
 * sur téléphone, la vidéo reste au-dessus du texte.
 */
export function BlocProjet({
  projet,
  inverse,
  prioritaire = false,
}: {
  projet: ProjetEcole;
  inverse: boolean;
  /** Le premier bloc de la page : son média est le plus grand élément du premier écran. */
  prioritaire?: boolean;
}) {
  const { slug, contexte, titre, description, part, stack, media } = projet;
  return (
    <article
      aria-labelledby={`projet-${slug}`}
      className={`grid items-center gap-8 md:gap-12 ${inverse ? "md:grid-cols-[1fr_1.3fr]" : "md:grid-cols-[1.3fr_1fr]"}`}
    >
      <div data-media className={inverse ? "md:order-last" : undefined}>
        <VideoProjet video={media} prioritaire={prioritaire} />
      </div>
      <div>
        <p className={`mb-2 ${surtitre}`}>{contexte}</p>
        <h3 id={`projet-${slug}`} className="font-serif text-3xl sm:text-4xl">
          {titre}
        </h3>
        <p className="mt-4 text-lg text-texte-doux">{description}</p>
        {part && (
          <>
            <h4 className="mt-6 font-medium">Ma part</h4>
            <p className="mt-2 text-texte-doux">{part}</p>
          </>
        )}
        <ul aria-label="Technologies" className="mt-6 flex flex-wrap gap-2">
          {stack.map((techno) => (
            <li key={techno} className="rounded-full border border-trait px-3 py-1 text-xs">
              {techno}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

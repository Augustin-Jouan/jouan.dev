import Image from "next/image";
import Link from "next/link";
import { apercuEtude, categories, cheminEtude, etudesDeCas, type SlugEtude } from "@/data/realisations";

/** Une étude de /realisations en carte : son aperçu, une phrase, et le lien vers l'étude complète. */
export function CarteFreelance({ slug }: { slug: SlugEtude }) {
  const etude = etudesDeCas.find((e) => e.slug === slug)!;
  const apercu = apercuEtude(slug);
  const categorie = categories.find((c) => c.id === etude.categorie)!.libelle;

  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-trait">
      <Image
        src={apercu.src}
        alt={apercu.alt}
        width={apercu.largeur}
        height={apercu.hauteur}
        sizes="(min-width: 1152px) 540px, (min-width: 768px) 46vw, 100vw"
        className="block aspect-video h-auto w-full border-b border-trait object-cover object-top"
      />
      <div className="flex flex-1 flex-col gap-3 p-7">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-texte-doux">{categorie}</p>
        <h3 className="font-serif text-2xl">{etude.titre}</h3>
        <p className="text-texte-doux">{etude.sousTitre}</p>
        <Link href={cheminEtude(slug)} className="mt-auto pt-2 font-medium text-accent underline-offset-4 hover:underline">
          Voir l&apos;étude<span className="sr-only"> : {etude.titre}</span>
          <span aria-hidden="true"> →</span>
        </Link>
      </div>
    </article>
  );
}

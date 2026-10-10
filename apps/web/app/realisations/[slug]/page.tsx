import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Captures } from "@/components/realisations/Captures";
import { FenetreDemo } from "@/components/realisations/FenetreDemo";
import { cheminEtude, etudesDeCas, trouverEtude } from "@/data/realisations";
import { siteName } from "@/data/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return etudesDeCas.map((etude) => ({ slug: etude.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const etude = trouverEtude((await params).slug);
  if (!etude) return {};
  return {
    title: etude.titre,
    description: etude.sousTitre,
    alternates: { canonical: cheminEtude(etude.slug) },
    // La fusion des métadonnées est superficielle : sans ces blocs, l'étude
    // hériterait du titre, de la description et de l'URL de l'accueil. L'image
    // vient du fichier opengraph-image voisin (ne pas poser `images` ici).
    openGraph: {
      type: "article",
      locale: "fr_FR",
      siteName,
      url: cheminEtude(etude.slug),
      title: etude.titre,
      description: etude.sousTitre,
    },
    twitter: { card: "summary_large_image", title: etude.titre, description: etude.sousTitre },
  };
}

const classeSection = "mx-auto w-full max-w-6xl 2xl:max-w-page px-5 py-14 sm:px-8 sm:py-20";
const classeTitreSection = "mb-8 font-serif text-3xl sm:text-4xl";

export default async function EtudeDeCasPage({ params }: Props) {
  const etude = trouverEtude((await params).slug);
  if (!etude) notFound();
  const autre = etudesDeCas.find((e) => e.slug !== etude.slug)!;
  const avecDemo = etude.media.type === "demo";

  return (
    <article>
      <header className="mx-auto w-full max-w-6xl 2xl:max-w-page px-5 pb-6 pt-16 sm:px-8 sm:pt-24">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-texte-doux">{etude.surtitre}</p>
        <h1 className="max-w-4xl font-serif text-4xl leading-[1.05] sm:text-6xl">{etude.titre}</h1>
        <p className="mt-6 max-w-3xl text-lg text-texte-doux">{etude.sousTitre}</p>
        {etude.site && (
          <a href={etude.site} className="mt-6 inline-block font-medium text-accent underline underline-offset-4">
            Voir le site<span aria-hidden="true"> ↗</span>
          </a>
        )}
        <dl className="mt-10 grid gap-6 sm:grid-cols-3">
          {etude.chiffres.map((chiffre) => (
            <div key={chiffre.libelle} className="flex flex-col-reverse gap-1 border-t border-trait pt-4">
              <dt className="text-sm text-texte-doux">{chiffre.libelle}</dt>
              <dd className="font-serif text-5xl">{chiffre.valeur}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section aria-labelledby="besoin-titre" className={classeSection}>
        <h2 id="besoin-titre" className={classeTitreSection}>
          Le besoin
        </h2>
        <div className="flex max-w-3xl flex-col gap-4 text-lg text-texte-doux">
          {etude.besoin.map((paragraphe) => (
            <p key={paragraphe}>{paragraphe}</p>
          ))}
        </div>
      </section>

      <section aria-labelledby="media-titre" className={classeSection}>
        <h2 id="media-titre" className={classeTitreSection}>
          {avecDemo ? "La démo" : "Le résultat"}
        </h2>
        {etude.media.type === "demo" ? (
          <FenetreDemo apercu={etude.media.apercu} />
        ) : (
          <Captures images={etude.media.images} />
        )}
      </section>

      <section aria-labelledby="livre-titre" className={classeSection}>
        <h2 id="livre-titre" className={classeTitreSection}>
          Ce que j&apos;ai livré
        </h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {etude.livre.map((element) => (
            <div key={element.titre} className="rounded-3xl border border-trait p-7">
              <h3 className="font-serif text-2xl">{element.titre}</h3>
              <p className="mt-3 text-texte-doux">{element.texte}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="capot-titre" className={classeSection}>
        <h2 id="capot-titre" className={classeTitreSection}>
          Sous le capot
        </h2>
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
              <h3 className="font-serif text-2xl">{choix.titre}</h3>
              <p className="mt-3 text-texte-doux">{choix.texte}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className={`${classeSection} flex flex-col items-start gap-6 border-t border-trait`}>
        <p className="font-serif text-3xl">Un projet similaire ?</p>
        <Link
          href="/#contact"
          className="rounded-full bg-accent px-6 py-3 font-medium text-sur-accent transition-opacity hover:opacity-85"
        >
          Parlons-en
        </Link>
        <Link href={cheminEtude(autre.slug)} className="text-texte-doux underline">
          Voir aussi : {autre.titre}
        </Link>
      </footer>
    </article>
  );
}

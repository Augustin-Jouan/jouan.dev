import type { Metadata } from "next";
import Link from "next/link";
import { EtudeComplete } from "@/components/realisations/EtudeComplete";
import { sections } from "@/data/accueil";
import { etudesDeCas } from "@/data/realisations";
import { siteName } from "@/data/site";

const description = `Les projets de ${siteName} : une application de suivi de marchés de travaux et le site vitrine d'un artisan, en détail.`;

export const metadata: Metadata = {
  title: "Réalisations",
  description,
  alternates: { canonical: "/realisations" },
  // La fusion des métadonnées est superficielle : sans ces blocs, la page
  // hériterait du titre et de la description de l'accueil. L'image vient du
  // fichier opengraph-image voisin.
  openGraph: { type: "website", locale: "fr_FR", siteName, url: "/realisations", title: "Réalisations", description },
  twitter: { card: "summary_large_image", title: "Réalisations", description },
};

/** Les études de cas à la suite, dans l'ordre des données : le suivi de marchés d'abord. */
export default function RealisationsPage() {
  return (
    <div>
      <header className="mx-auto w-full max-w-6xl 2xl:max-w-page px-5 pb-10 pt-16 sm:px-8 sm:pt-24">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-texte-doux">{sections.realisations.surtitre}</p>
        <h1 className="max-w-4xl font-serif text-5xl leading-[1.02] sm:text-7xl">{sections.realisations.titre}</h1>
      </header>
      {etudesDeCas.map((etude) => (
        <EtudeComplete key={etude.slug} etude={etude} />
      ))}
      <footer className="mx-auto flex w-full max-w-6xl 2xl:max-w-page flex-col items-start gap-6 border-t border-trait px-5 py-14 sm:px-8 sm:py-20">
        <p className="font-serif text-3xl">Un projet similaire ?</p>
        <Link
          href="/#contact"
          className="rounded-full bg-accent px-6 py-3 font-medium text-sur-accent transition-opacity hover:opacity-85"
        >
          Parlons-en
        </Link>
      </footer>
    </div>
  );
}

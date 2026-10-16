import type { Metadata } from "next";
import Link from "next/link";
import { EtudeComplete } from "@/components/realisations/EtudeComplete";
import { OngletsRealisations } from "@/components/realisations/OngletsRealisations";
import { enTeteRealisations, etudesDeCas, type Categorie } from "@/data/realisations";
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

/** Les études d'une catégorie, dans l'ordre des données. */
const etudesDe = (categorie: Categorie) =>
  etudesDeCas.filter((etude) => etude.categorie === categorie).map((etude) => <EtudeComplete key={etude.slug} etude={etude} />);

/** Les études de cas, rangées sous deux onglets (application métier, site vitrine), dans l'ordre des données. */
export default function RealisationsPage() {
  return (
    <div>
      <header className="mx-auto w-full max-w-6xl 2xl:max-w-page px-5 pb-6 pt-10 sm:px-8 sm:pt-14">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-texte-doux">{enTeteRealisations.surtitre}</p>
        <h1 className="max-w-4xl font-serif text-4xl leading-[1.05] sm:text-5xl">{enTeteRealisations.titre}</h1>
      </header>
      <OngletsRealisations panneaux={{ "application-metier": etudesDe("application-metier"), "site-vitrine": etudesDe("site-vitrine") }} />
      <footer className="mx-auto flex w-full max-w-6xl 2xl:max-w-page flex-col items-center gap-6 border-t text-center sm:items-start sm:text-left border-trait px-5 py-14 sm:px-8 sm:py-20">
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

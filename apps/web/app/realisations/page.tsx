import type { Metadata } from "next";
import { CarteRealisation } from "@/components/realisations/CarteRealisation";
import { realisations, sections } from "@/data/accueil";
import { siteName } from "@/data/site";

export const metadata: Metadata = {
  title: "Réalisations",
  description: `Les projets de ${siteName} : une application de suivi de marchés de travaux et le site vitrine d'un artisan.`,
  alternates: { canonical: "/realisations" },
};

/** Toutes les réalisations, dans l'ordre des données : le suivi de marchés d'abord. */
export default function RealisationsPage() {
  return (
    <section
      aria-labelledby="realisations-titre"
      className="mx-auto w-full max-w-6xl 2xl:max-w-page px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24"
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-texte-doux">{sections.realisations.surtitre}</p>
      <h1 id="realisations-titre" className="mb-12 max-w-4xl font-serif text-4xl leading-[1.05] sm:text-6xl">
        {sections.realisations.titre}
      </h1>
      <div className="grid gap-5 md:grid-cols-2">
        {realisations.map((r) => (
          <CarteRealisation key={r.slug} realisation={r} niveau="h2" />
        ))}
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { ArchitectureVivante } from "@/components/coulisses/ArchitectureVivante";
import { SectionDeploiement } from "@/components/coulisses/SectionDeploiement";
import { lireBuildInfo } from "@/lib/coulisses/build-info";

const PHRASE = "Comment ce site est construit, hébergé et mesuré, en direct depuis votre navigateur.";

export const metadata: Metadata = {
  title: "Coulisses",
  description: PHRASE,
  alternates: { canonical: "/coulisses" },
};

/** Coulisses techniques (sous-projet 5) : pour les recruteurs et les développeurs, depuis le pied de page. */
export default function CoulissesPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-5 py-16 sm:px-8 2xl:max-w-page">
      <header className="flex flex-col gap-4">
        <h1 className="font-serif text-5xl">Coulisses</h1>
        <p className="max-w-2xl text-lg text-encre-douce">{PHRASE}</p>
      </header>
      <ArchitectureVivante />
      <SectionDeploiement infos={lireBuildInfo()} />
    </div>
  );
}

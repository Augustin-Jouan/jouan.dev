import type { Metadata } from "next";
import { Accroche } from "@/components/accueil/Accroche";
import { Methode } from "@/components/accueil/Methode";
import { Offre } from "@/components/accueil/Offre";
import { Parcours } from "@/components/accueil/Parcours";
import { Realisations } from "@/components/accueil/Realisations";
import { SectionContact } from "@/components/accueil/SectionContact";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Accroche />
      <Offre />
      <Realisations />
      <Methode />
      <Parcours />
      <SectionContact />
    </>
  );
}

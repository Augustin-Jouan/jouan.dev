import { Accroche } from "./Accroche";
import { IntroEncre } from "./IntroEncre";
import { Methode } from "./Methode";
import { Offre } from "./Offre";
import { Parcours } from "./Parcours";
import { Realisations } from "./Realisations";
import { SectionContact } from "./SectionContact";
import type { Personnalisation } from "@/data/accueil";

/** L'accueil complet ; personnalisé pour un prospect quand `personnalisation` est donnée. */
export function Accueil({ personnalisation }: { personnalisation?: Personnalisation }) {
  const angle = personnalisation?.angle ?? "application";
  return (
    <>
      <IntroEncre />
      <Accroche angle={angle} nom={personnalisation?.nom} />
      <Offre angle={angle} />
      <Realisations angle={angle} />
      <Methode />
      <Parcours />
      <SectionContact jeton={personnalisation?.jeton} />
    </>
  );
}

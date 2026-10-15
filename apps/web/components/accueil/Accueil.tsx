import { Accroche } from "./Accroche";
import { IntroEncre } from "./IntroEncre";
import { NuageFige } from "./NuageFige";
import { Methode } from "./Methode";
import { Offre } from "./Offre";
import { Parcours } from "./Parcours";
import { SectionContact } from "./SectionContact";
import { SignalVisite } from "./SignalVisite";
import { TraitConducteur } from "./TraitConducteur";
import { PresenceDirecte } from "@/components/direct/PresenceDirecte";
import type { Personnalisation } from "@/data/accueil";

/** L'accueil complet, avec la présence en direct (sous-projet 4) ; personnalisé pour un prospect quand `personnalisation` est donnée. */
export function Accueil({
  personnalisation,
  signalerVisite = false,
}: {
  personnalisation?: Personnalisation;
  signalerVisite?: boolean;
}) {
  const angle = personnalisation?.angle ?? "application";
  return (
    <PresenceDirecte>
      <IntroEncre repli={<NuageFige />} />
      <Accroche angle={angle} nom={personnalisation?.nom} />
      <Offre angle={angle} />
      <Methode />
      <Parcours />
      <SectionContact jeton={personnalisation?.jeton} />
      <TraitConducteur />
      {signalerVisite && personnalisation?.jeton ? <SignalVisite jeton={personnalisation.jeton} /> : null}
    </PresenceDirecte>
  );
}

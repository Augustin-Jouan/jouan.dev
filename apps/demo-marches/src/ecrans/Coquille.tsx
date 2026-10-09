import type { ReactNode } from "react";
import { Bouton } from "../briques/Bouton";
import { SURTITRE, TEXTE_ATTENU } from "../briques/typo";
import { CHANTIER } from "../donnees/chantier";

/** Le cadre de la démo : bandeau, titre, chantier, réinitialisation, puis le contenu. */
export function Coquille({ enTete, surReinitialisation, children }: {
  enTete: ReactNode;
  surReinitialisation(): void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-paper text-ink">
      <p className="bg-accent px-4 py-1 text-center text-12 text-on-accent">Démo — données fictives</p>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pt-5 pb-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="font-titre text-22">Suivi de marchés</h1>
          <p className={`mt-1 ${TEXTE_ATTENU}`}>
            <span className="font-medium text-ink-2">{CHANTIER.nom}</span>
            <span className={SURTITRE}> · </span>
            <span>{CHANTIER.adresse}</span>
          </p>
        </div>
        <Bouton variante="secondaire" taille="petite" onClick={surReinitialisation}>
          Réinitialiser la démo
        </Bouton>
      </header>
      <div className="px-4 sm:px-6">{enTete}</div>
      <main className="min-w-0 px-4 py-5 sm:px-6">{children}</main>
    </div>
  );
}

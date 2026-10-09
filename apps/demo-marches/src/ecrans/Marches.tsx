import { useState } from "react";
import type { Dispatch } from "react";
import { montantEngage } from "../domaine/avenants";
import { formaterEuros } from "../domaine/montants";
import { Etiquette } from "../briques/Etiquette";
import { Tableau } from "../briques/Tableau";
import { cx } from "../briques/cx";
import { CHIFFRES } from "../briques/typo";
import type { Lot } from "../donnees/chantier";
import { totauxChantier, type ActionDemo } from "../donnees/etat";
import { PanneauLot } from "./PanneauLot";

export const nomLot = (lot: Lot) => `Lot ${String(lot.numero).padStart(2, "0")}`;
const payeHT = (lot: Lot) => lot.acomptes.reduce((s, a) => s + a, 0);
const pourcentage = (paye: number, engage: number) => (engage > 0 ? Math.max(0, Math.min(100, Math.round((paye / engage) * 100))) : 0);

const COLLE = "sticky left-0 z-10! border-r border-rule bg-inherit";

function Avancement({ libelle, valeur }: { libelle: string; valeur: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        role="meter"
        aria-label={libelle}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valeur}
        aria-valuetext={`${valeur} %`}
        className="h-1.5 w-24 overflow-hidden rounded-full bg-band"
      >
        <div className="h-full bg-accent" style={{ width: `${valeur}%` }} />
      </div>
      <span aria-hidden="true" className={cx(CHIFFRES, "w-9 text-right text-12 text-muted")}>
        {valeur} %
      </span>
    </div>
  );
}

export function Marches({ lots, dispatch, surCertificat }: {
  lots: readonly Lot[];
  dispatch: Dispatch<ActionDemo>;
  surCertificat?(lotId: string): void;
}) {
  const [ouvertId, setOuvertId] = useState<string | null>(null);
  const ouvert = lots.find((l) => l.id === ouvertId);
  const totaux = totauxChantier(lots);
  return (
    <>
      <div className="overflow-x-auto rounded-md border border-rule-strong bg-paper shadow-ombre">
        <Tableau variante="lots">
          <thead>
            <tr>
              <th className={cx(COLLE, "top-0")}>Lot</th>
              <th>Entreprise</th>
              <th data-droite>Marché HT</th>
              <th data-droite>Avenants</th>
              <th data-droite>Engagé HT</th>
              <th data-droite>Payé HT</th>
              <th>Avancement</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => {
              const avenantsHT = lot.avenants.reduce((s, a) => s + a.montantHT, 0);
              const engage = montantEngage(lot.marcheHT, lot.avenants);
              const paye = payeHT(lot);
              return (
                <tr key={lot.id} className="bg-paper" data-ouvert={lot.id === ouvertId ? "" : undefined}
                  onClick={() => setOuvertId(lot.id)}>
                  <td className={cx(COLLE, "min-w-44")}>
                    <span className={cx(CHIFFRES, "mr-2 text-12 text-muted")}>{String(lot.numero).padStart(2, "0")}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOuvertId(lot.id);
                      }}
                      className="cursor-pointer bg-transparent p-0 text-left font-medium text-ink underline decoration-rule-strong underline-offset-3 hover:text-accent hover:decoration-accent"
                    >
                      {lot.intitule}
                    </button>
                    {lot.avenants.length > 0 && (
                      <span className="ml-2 align-middle">
                        <Etiquette ton="neutre">
                          {lot.avenants.length} avenant{lot.avenants.length > 1 ? "s" : ""}
                        </Etiquette>
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">{lot.entreprise}</td>
                  <td data-droite className="whitespace-nowrap">{formaterEuros(lot.marcheHT)}</td>
                  <td data-droite className="whitespace-nowrap text-muted">{formaterEuros(avenantsHT)}</td>
                  <td data-droite className="font-medium whitespace-nowrap">{formaterEuros(engage)}</td>
                  <td data-droite className="whitespace-nowrap">{formaterEuros(paye)}</td>
                  <td>
                    <Avancement libelle={`Avancement du ${nomLot(lot).toLowerCase()}`} valeur={pourcentage(paye, engage)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr aria-label="Total du chantier" className="bg-surface font-semibold">
              <th scope="row" className={cx(COLLE, "px-3 py-2.5 text-left")}>Total du chantier</th>
              <td />
              <td data-droite className="px-3 py-2.5 whitespace-nowrap">{formaterEuros(totaux.marcheHT)}</td>
              <td data-droite className="px-3 py-2.5 whitespace-nowrap">{formaterEuros(totaux.avenantsHT)}</td>
              <td data-droite className="px-3 py-2.5 whitespace-nowrap">{formaterEuros(totaux.engageHT)}</td>
              <td data-droite className="px-3 py-2.5 whitespace-nowrap">{formaterEuros(totaux.payeHT)}</td>
              <td className="px-3 py-2.5">
                <Avancement libelle="Avancement du chantier" valeur={pourcentage(totaux.payeHT, totaux.engageHT)} />
              </td>
            </tr>
          </tfoot>
        </Tableau>
      </div>
      {ouvert && (
        <PanneauLot
          lot={ouvert}
          dispatch={dispatch}
          surFermeture={() => setOuvertId(null)}
          surCertificat={() => surCertificat?.(ouvert.id)}
        />
      )}
    </>
  );
}

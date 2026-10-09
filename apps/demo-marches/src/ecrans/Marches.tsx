import { useState } from "react";
import type { Dispatch } from "react";
import { montantEngage } from "../domaine/avenants";
import { formaterEuros } from "../domaine/montants";
import { Bouton } from "../briques/Bouton";
import { Jauge } from "../briques/Jauge";
import { Etiquette } from "../briques/Etiquette";
import { Tableau } from "../briques/Tableau";
import type { Lot } from "../donnees/chantier";
import { totauxChantier, type ActionDemo } from "../donnees/etat";
import { PanneauLot } from "./PanneauLot";

export const nomLot = (lot: Lot) => `Lot ${String(lot.numero).padStart(2, "0")}`;
const payeHT = (lot: Lot) => lot.acomptes.reduce((s, a) => s + a, 0);
const pourcentage = (paye: number, engage: number) => (engage > 0 ? Math.max(0, Math.min(100, Math.round((paye / engage) * 100))) : 0);

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
              <th data-colle>Lot</th>
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
                <tr key={lot.id} data-ouvert={lot.id === ouvertId ? "" : undefined}
                  onClick={() => setOuvertId(lot.id)}>
                  <td data-colle>
                    <span data-numero>{String(lot.numero).padStart(2, "0")}</span>
                    <Bouton
                      variante="lien"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOuvertId(lot.id);
                      }}
                    >
                      {lot.intitule}
                    </Bouton>
                    {lot.avenants.length > 0 && (
                      <span className="ml-2 align-middle">
                        <Etiquette ton="neutre">
                          {lot.avenants.length} avenant{lot.avenants.length > 1 ? "s" : ""}
                        </Etiquette>
                      </span>
                    )}
                  </td>
                  <td data-nowrap>{lot.entreprise}</td>
                  <td data-droite>{formaterEuros(lot.marcheHT)}</td>
                  <td data-droite data-attenue>{formaterEuros(avenantsHT)}</td>
                  <td data-droite data-fort>{formaterEuros(engage)}</td>
                  <td data-droite>{formaterEuros(paye)}</td>
                  <td>
                    <Jauge libelle={`Avancement du ${nomLot(lot).toLowerCase()}`} valeur={pourcentage(paye, engage)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr aria-label="Total du chantier">
              <th scope="row" data-colle>Total du chantier</th>
              <td />
              <td data-droite>{formaterEuros(totaux.marcheHT)}</td>
              <td data-droite>{formaterEuros(totaux.avenantsHT)}</td>
              <td data-droite>{formaterEuros(totaux.engageHT)}</td>
              <td data-droite>{formaterEuros(totaux.payeHT)}</td>
              <td>
                <Jauge libelle="Avancement du chantier" valeur={pourcentage(totaux.payeHT, totaux.engageHT)} />
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

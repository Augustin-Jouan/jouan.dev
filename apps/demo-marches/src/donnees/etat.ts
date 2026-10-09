import { montantEngage } from "../domaine/avenants";
import type { Centimes } from "../domaine/montants";
import { CHANTIER, type Lot } from "./chantier";

export type EtatDemo = { lots: Lot[] };

export type ActionDemo =
  | { type: "ajouterAvenant"; lotId: string; libelle: string; montantHT: Centimes }
  | { type: "supprimerAvenant"; lotId: string; avenantId: string }
  | { type: "basculerCaution"; lotId: string }
  | { type: "reinitialiser" };

/** Copie profonde : la démo peut tout modifier, l'original reste intact. */
export const etatInitial = (): EtatDemo => ({ lots: structuredClone([...CHANTIER.lots]) });

function modifierLot(etat: EtatDemo, lotId: string, modifier: (lot: Lot) => Lot): EtatDemo {
  return { lots: etat.lots.map((lot) => (lot.id === lotId ? modifier(lot) : lot)) };
}

export function reducteur(etat: EtatDemo, action: ActionDemo): EtatDemo {
  switch (action.type) {
    case "ajouterAvenant": {
      const libelle = action.libelle.trim();
      if (!libelle || action.montantHT === 0) return etat;
      return modifierLot(etat, action.lotId, (lot) => {
        const numero = lot.compteurAvenants + 1;
        return {
          ...lot,
          compteurAvenants: numero,
          avenants: [...lot.avenants, { id: `${lot.id}a${numero}`, numero, libelle, montantHT: action.montantHT }],
        };
      });
    }
    case "supprimerAvenant":
      return modifierLot(etat, action.lotId, (lot) => ({
        ...lot,
        avenants: lot.avenants.filter((a) => a.id !== action.avenantId),
      }));
    case "basculerCaution":
      return modifierLot(etat, action.lotId, (lot) => ({ ...lot, caution: !lot.caution }));
    case "reinitialiser":
      return etatInitial();
  }
}

export function totauxChantier(lots: readonly Lot[]) {
  return lots.reduce(
    (t, lot) => {
      const avenantsHT = lot.avenants.reduce((s, a) => s + a.montantHT, 0);
      return {
        marcheHT: t.marcheHT + lot.marcheHT,
        avenantsHT: t.avenantsHT + avenantsHT,
        engageHT: t.engageHT + montantEngage(lot.marcheHT, lot.avenants),
        payeHT: t.payeHT + lot.acomptes.reduce((s, a) => s + a, 0),
      };
    },
    { marcheHT: 0, avenantsHT: 0, engageHT: 0, payeHT: 0 },
  );
}

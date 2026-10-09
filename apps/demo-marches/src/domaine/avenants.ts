import { lireMontant, type Centimes } from "./montants";

export type Avenant = { id: string; numero: number; libelle: string; montantHT: Centimes };

/** Marché initial + avenants (plus-values et moins-values), en HT. */
export function montantEngage(marcheHT: Centimes, avenants: readonly Avenant[]): Centimes {
  return avenants.reduce((total, avenant) => total + avenant.montantHT, marcheHT);
}

export type ValidationAvenant =
  | { ok: true; libelle: string; montantHT: Centimes }
  | { ok: false; champ: "libelle" | "montant"; message: string };

/** La situation du lot au moment de l'avenant, en centimes : montant engagé et déjà payé. */
export type ContexteAvenant = { engageHT: Centimes; payeHT: Centimes };

export function validerAvenant(libelle: string, montantTexte: string, contexte: ContexteAvenant): ValidationAvenant {
  const propre = libelle.trim();
  if (!propre) return { ok: false, champ: "libelle", message: "Donnez un libellé à l'avenant." };
  const montantHT = lireMontant(montantTexte);
  if (montantHT === null) {
    return { ok: false, champ: "montant", message: "Montant illisible : écrivez par exemple 1 250,00 ou -300." };
  }
  if (montantHT === 0) return { ok: false, champ: "montant", message: "Un avenant ne peut pas être nul." };
  if (contexte.engageHT + montantHT < contexte.payeHT) {
    return { ok: false, champ: "montant", message: "La moins-value dépasse le montant restant du marché." };
  }
  return { ok: true, libelle: propre, montantHT };
}

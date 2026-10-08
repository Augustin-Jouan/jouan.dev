import { appliquerTaux, lireMontant, type Centimes } from "./montants";

export type EntreeCertificat = {
  marcheHT: Centimes;
  /** Montants HT des avenants du lot. */
  avenants: readonly Centimes[];
  acomptesAnterieurs: readonly Centimes[];
  tauxTVA: number;
  tauxRetenue: number;
  caution: boolean;
  cumulTexte: string;
};

export type LignesCertificat = {
  numero: number;
  totalHT: Centimes;
  totalTVA: Centimes;
  totalTTC: Centimes;
  precedentsHT: Centimes;
  precedentsTVA: Centimes;
  precedentsTTC: Centimes;
  presentHT: Centimes;
  presentTVA: Centimes;
  presentTTC: Centimes;
  retenue: Centimes;
  mandate: Centimes;
};

export type ResultatCertificat = { ok: true; lignes: LignesCertificat } | { ok: false; message: string };

const somme = (montants: readonly Centimes[]) => montants.reduce((total, m) => total + m, 0);

/** Certificat de paiement mensuel : seule la saisie du cumul réalisé HT est libre. */
export function calculerCertificat(entree: EntreeCertificat): ResultatCertificat {
  if (!entree.cumulTexte.trim()) return { ok: false, message: "Saisissez le montant des travaux réalisés." };
  const cumul = lireMontant(entree.cumulTexte);
  if (cumul === null) return { ok: false, message: "Montant illisible : écrivez par exemple 9 850,00." };

  const totalHT = entree.marcheHT + somme(entree.avenants);
  if (cumul > totalHT) return { ok: false, message: "Le cumul dépasse le montant du marché avenants compris." };

  const precedentsHT = somme(entree.acomptesAnterieurs);
  const presentHT = cumul - precedentsHT;
  if (presentHT <= 0) return { ok: false, message: "Le présent acompte doit être positif." };

  const totalTVA = appliquerTaux(totalHT, entree.tauxTVA);
  const precedentsTVA = appliquerTaux(precedentsHT, entree.tauxTVA);
  const presentTVA = appliquerTaux(presentHT, entree.tauxTVA);
  const presentTTC = presentHT + presentTVA;
  const retenue = entree.caution ? 0 : appliquerTaux(presentTTC, entree.tauxRetenue);

  return {
    ok: true,
    lignes: {
      numero: entree.acomptesAnterieurs.length + 1,
      totalHT,
      totalTVA,
      totalTTC: totalHT + totalTVA,
      precedentsHT,
      precedentsTVA,
      precedentsTTC: precedentsHT + precedentsTVA,
      presentHT,
      presentTVA,
      presentTTC,
      retenue,
      mandate: presentTTC - retenue,
    },
  };
}

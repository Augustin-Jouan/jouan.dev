/** Montants en centimes entiers : aucun calcul ne passe par un nombre à virgule. */
export type Centimes = number;

/**
 * Montant × taux (en %), arrondi au centime, demi-centime au-dessus en valeur
 * absolue (ROUND_HALF_UP), comme sur un certificat papier.
 */
export function appliquerTaux(montant: Centimes, tauxPourCent: number): Centimes {
  const centiemesDePourCent = Math.round(tauxPourCent * 100); // 20 % → 2000
  const produit = Math.abs(montant) * centiemesDePourCent; // en 1/10 000 de centime
  const arrondi = Math.floor((produit + 5_000) / 10_000);
  return montant < 0 ? -arrondi : arrondi;
}

const SEPARATEURS = /[\s\u00a0\u202f]/g;
const MOTIF = /^([+-])?\s*(\d{1,3}(?:[\s\u00a0\u202f]\d{3})+|\d+)(?:[,.](\d{1,2}))?\s*€?$/;
const MAXIMUM = 99_999_999_999; // 999 999 999,99 € : au-delà, la saisie est une erreur de frappe

/** Lit un montant tapé à la française ; `null` s'il est illisible. */
export function lireMontant(texte: string): Centimes | null {
  const correspondance = MOTIF.exec(texte.trim());
  if (!correspondance) return null;
  const [, signe, entiers = "", decimales = ""] = correspondance;
  const valeur = Number(entiers.replace(SEPARATEURS, "")) * 100 + Number(decimales.padEnd(2, "0"));
  if (valeur === 0) return 0;
  if (valeur > MAXIMUM) return null;
  return signe === "-" ? -valeur : valeur;
}

const EUROS = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const ECART = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", signDisplay: "exceptZero" });

export const formaterEuros = (montant: Centimes) => EUROS.format(montant / 100);
export const formaterEcart = (montant: Centimes) => ECART.format(montant / 100);

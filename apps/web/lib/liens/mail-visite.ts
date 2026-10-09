/** Contenu du mail envoyé à Augustin quand un prospect ouvre son lien. */
import { dateHeureParis, ilYA } from "./temps";
import type { Appareil } from "./visites";

export type DonneesMailVisite = {
  nom: string;
  numero: number;
  appareil: Appareil;
  le: Date;
  precedente: Date | null;
  urlAdmin: string;
};

export function ordinalVisite(n: number): string {
  return n === 1 ? "1re" : `${n}e`;
}

export function contenuMailVisite(d: DonneesMailVisite): { sujet: string; texte: string } {
  const lignes = [
    `${d.nom} a ouvert son lien personnalisé.`,
    "",
    `Visite : ${ordinalVisite(d.numero)}, sur ${d.appareil}`,
    `Date : ${dateHeureParis(d.le)}`,
  ];
  if (d.precedente) lignes.push(`Visite précédente : ${ilYA(d.precedente, d.le)}`);
  lignes.push("", `Tous les liens : ${d.urlAdmin}`);
  return { sujet: `${d.nom} a ouvert son lien — ${ordinalVisite(d.numero)} visite`, texte: lignes.join("\n") };
}

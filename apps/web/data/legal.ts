import { contact } from "@/data/contact";
import { siteName } from "@/data/site";

/** Valeur affichée tant que l'information n'a pas été fournie. */
export const A_COMPLETER = "[À compléter]"; // placeholder-ok

export type MentionsLegales = {
  raisonSociale: string;
  /** Sociétés uniquement ; pour une entreprise individuelle, mettre "Sans objet". */
  capitalSocial: string;
  adresse: string;
  telephone: string;
  email: string;
  /** Ville du greffe + numéro, ex. « Nantes 123 456 789 ». RM pour un artisan. */
  rcs: string;
  tvaIntracommunautaire: string;
  directeurPublication: string;
  hebergeur: {
    nom: string;
    adresse: string;
    telephone: string;
  };
  /** Obligatoire dès que l'entreprise vend à des particuliers (art. L.616-1 code conso). */
  mediateur: {
    nom: string;
    adresse: string;
    site: string;
  };
  /**
   * Assurance professionnelle : obligatoire pour les artisans du bâtiment
   * (art. 22-2 de la loi n° 96-603). Laisser absente pour les autres métiers.
   */
  assurance?: {
    assureur: string;
    adresse: string;
    contrat: string;
    garanties: string;
    couvertureGeographique: string;
  };
  /** Phrase décrivant un éventuel transfert hors UE, une fois l'hébergeur connu. */
  transfertHorsUe: string;
};

export const mentionsLegales: MentionsLegales = {
  raisonSociale: siteName,
  capitalSocial: A_COMPLETER,
  adresse: contact.adresse,
  telephone: contact.telephone,
  email: contact.email,
  rcs: A_COMPLETER,
  tvaIntracommunautaire: A_COMPLETER,
  directeurPublication: A_COMPLETER,
  // Hébergement par défaut : VPS OVH (voir README, étape 9).
  hebergeur: {
    nom: "OVH SAS",
    adresse: "2 rue Kellermann, 59100 Roubaix, France",
    telephone: "1007 (depuis la France) / +33 9 72 10 10 07",
  },
  mediateur: {
    nom: A_COMPLETER,
    adresse: A_COMPLETER,
    site: A_COMPLETER,
  },
  // OVH héberge en France : aucun transfert hors UE lié à l'hébergement.
  transfertHorsUe:
    "Le site est hébergé par OVH SAS sur des serveurs situés en France. Les données collectées via le formulaire de contact ne sont pas transférées hors de l'Union européenne.",
};

/** Chemins (ex. `hebergeur.nom`) des valeurs encore égales à `A_COMPLETER`. */
function champsIncomplets(objet: object, prefixe = ""): string[] {
  return Object.entries(objet).flatMap(([cle, valeur]) => {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle;
    if (typeof valeur === "object" && valeur !== null) {
      return champsIncomplets(valeur, chemin);
    }
    return valeur === A_COMPLETER ? [chemin] : [];
  });
}

/** Champs légalement dus qui restent à renseigner avant la mise en ligne. */
export const mentionsLegalesManquantes: string[] =
  champsIncomplets(mentionsLegales);

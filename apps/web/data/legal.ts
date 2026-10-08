import { contact } from "@/data/contact";
import { siteName } from "@/data/site";

/** Valeur affichée tant que l'information n'a pas été fournie. */
export const A_COMPLETER = "[À compléter]"; // placeholder-ok

export type MentionsLegales = {
  /** Nom et prénom de l'entrepreneur individuel. */
  editeur: string;
  statut: string;
  /** Adresse de domiciliation de l'entreprise (art. 6 III de la LCEN). */
  adresse: string;
  telephone: string;
  email: string;
  siren: string;
  /** Numéro de TVA intracommunautaire, ou mention de franchise en base. */
  tva: string;
  directeurPublication: string;
  hebergeur: {
    nom: string;
    adresse: string;
    telephone: string;
  };
  /** Obligatoire dès qu'une prestation peut être vendue à un particulier (art. L.616-1 code conso). */
  mediateur: {
    nom: string;
    adresse: string;
    site: string;
  };
  /** Phrase décrivant un éventuel transfert hors UE, selon l'hébergeur. */
  transfertHorsUe: string;
};

export const mentionsLegales: MentionsLegales = {
  editeur: siteName,
  statut: "Entrepreneur individuel (EI)",
  adresse: A_COMPLETER,
  telephone: A_COMPLETER,
  email: contact.email,
  siren: A_COMPLETER,
  tva: A_COMPLETER,
  directeurPublication: siteName,
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
export const mentionsLegalesManquantes: string[] = champsIncomplets(mentionsLegales);

import { contact } from "@/data/contact";
import { siteName } from "@/data/site";

/** Valeur affichée tant que l'information n'a pas été fournie. */
export const A_COMPLETER = "[À compléter]"; // placeholder-ok

export type MentionsLegales = {
  /** Nom et prénom de l'entrepreneur individuel. */
  editeur: string;
  statut: string;
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
  /** Prestations réservées aux professionnels : pas de médiateur de la consommation (art. L.616-1 code conso). */
  clientele: string;
  /** Phrase décrivant un éventuel transfert hors UE, selon l'hébergeur. */
  transfertHorsUe: string;
};

export const mentionsLegales: MentionsLegales = {
  editeur: siteName,
  statut: "Entrepreneur individuel (EI)",
  telephone: "06 95 93 59 28",
  email: contact.email,
  siren: "109 461 350",
  tva: "TVA non applicable, art. 293 B du CGI",
  directeurPublication: siteName,
  hebergeur: {
    nom: "OVH SAS",
    adresse: "2 rue Kellermann, 59100 Roubaix, France",
    telephone: "1007 (depuis la France) / +33 9 72 10 10 07",
  },
  clientele:
    "Les prestations présentées sur ce site sont réservées aux professionnels. Le dispositif de médiation de la consommation ne s'applique donc pas.",
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

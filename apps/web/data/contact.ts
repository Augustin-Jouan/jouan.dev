export type AdressePostale = {
  rue: string;
  codePostal: string;
  ville: string;
  /** Département ou région, pour schema.org `addressRegion`. */
  region: string;
};

export type Contact = {
  telephone: string;
  /** Format `tel:+33…`, sans espaces. */
  telephoneLien: string;
  adressePostale: AdressePostale;
  /** Adresse sur une ligne, pour l'affichage. */
  adresse: string;
  email: string;
  /**
   * Coordonnées de l'adresse, pour les données structurées (pack local).
   * À relever sur https://adresse.data.gouv.fr (Base Adresse Nationale).
   * Absentes tant que non relevées : le JSON-LD n'émet alors pas de `geo`,
   * plutôt qu'un point faux.
   */
  geo?: { latitude: number; longitude: number };
  /** Lien vers l'adresse sur Google Maps. */
  lienCarte: string;
  /**
   * Profils de l'entreprise ailleurs sur le web (fiche Google, PagesJaunes,
   * Facebook…). Google s'en sert pour recouper l'identité de l'entreprise.
   */
  profils: string[];
};

const adressePostale: AdressePostale = {
  rue: "[12 rue Exemple]",
  codePostal: "[Code postal]",
  ville: "[Ville]",
  region: "[Département]",
};

const adresse = `${adressePostale.rue}, ${adressePostale.codePostal} ${adressePostale.ville}`;

export const contact: Contact = {
  telephone: "[01 23 45 67 89]",
  telephoneLien: "tel:[+33123456789]",
  adressePostale,
  adresse,
  email: "[contact@exemple.fr]",
  // geo : à ajouter une fois relevé, ex. { latitude: 47.2184, longitude: -1.5536 }
  lienCarte: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`,
  profils: [],
};

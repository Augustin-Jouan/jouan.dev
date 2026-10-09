/** Règles d'une visite sur un lien personnalisé (sans base ni réseau). */

export type Appareil = "mobile" | "ordinateur";

/** Une ouverture compte comme nouvelle visite 30 minutes après la précédente. */
export const DELAI_NOUVELLE_VISITE_MS = 30 * 60 * 1000;
/** Les visites sont conservées douze mois (politique de confidentialité). */
export const CONSERVATION_VISITES_MS = 365 * 24 * 60 * 60 * 1000;

export function estNouvelleVisite(derniere: Date | null, maintenant: Date): boolean {
  return derniere === null || maintenant.getTime() - derniere.getTime() >= DELAI_NOUVELLE_VISITE_MS;
}

/**
 * Aperçus de messageries et réseaux, moteurs, navigateurs sans interface
 * (scanners de liens) et Lighthouse : rien de tout cela n'est un prospect.
 */
const ROBOTS =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|slack|linkedin|skype|embedly|pinterest|vkshare|headlesschrome|lighthouse/i;

export function estRobot(ua: string | null): boolean {
  return !ua || ROBOTS.test(ua);
}

export function appareilDepuis(indiceMobile: string | null, ua: string | null): Appareil {
  if (indiceMobile === "?1") return "mobile";
  if (indiceMobile === "?0") return "ordinateur";
  return ua && /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "ordinateur";
}

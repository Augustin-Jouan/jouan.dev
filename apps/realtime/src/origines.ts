/** Liste `ORIGINES_AUTORISEES` : origines séparées par des virgules. */
export function lireOrigines(valeur: string | undefined): string[] {
  return (valeur ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Comparaison exacte : pas de préfixe, pas de joker. */
export function origineAutorisee(origine: string | undefined, autorisees: string[]): boolean {
  return origine !== undefined && autorisees.includes(origine);
}

/**
 * Adresse du visiteur. Derrière le proxy de Coolify (Traefik), l'adresse réelle
 * est la **dernière** de `X-Forwarded-For` : les précédentes viennent du client
 * et peuvent être forgées. Le service n'est joignable que par ce proxy.
 */
export function ipDuClient(xForwardedFor: string | undefined, adresseSocket: string | undefined): string {
  const derniere = xForwardedFor
    ?.split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .at(-1);
  return derniere ?? adresseSocket ?? "inconnue";
}

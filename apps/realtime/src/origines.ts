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
 * Sert de clé de limitation : une adresse IPv6 est ramenée à son préfixe /64.
 */
export function ipDuClient(xForwardedFor: string | undefined, adresseSocket: string | undefined): string {
  const derniere = xForwardedFor
    ?.split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .at(-1);
  const ip = derniere ?? adresseSocket;
  return ip ? cleDAdresse(ip) : "inconnue";
}

/**
 * Clé de limitation d'une adresse : un abonné IPv6 reçoit en général tout un
 * préfixe /64, on compte donc par /64 ; une IPv4 (écrite ou non en IPv6) reste telle quelle.
 */
function cleDAdresse(ip: string): string {
  const v4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (v4) return v4[1]!;
  if (!ip.includes(":")) return ip;
  const [tete = "", queue] = ip.split("%")[0]!.toLowerCase().split("::");
  const debut = tete ? tete.split(":") : [];
  const fin = queue ? queue.split(":") : [];
  const groupes = queue === undefined ? debut : [...debut, ...Array<string>(Math.max(0, 8 - debut.length - fin.length)).fill("0"), ...fin];
  return `${groupes.slice(0, 4).map((g) => parseInt(g || "0", 16).toString(16)).join(":")}::/64`;
}


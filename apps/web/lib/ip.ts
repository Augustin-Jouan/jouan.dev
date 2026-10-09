/**
 * Adresse du client derrière le proxy de Coolify (Traefik), qui l'ajoute en
 * **dernier** dans `X-Forwarded-For` : les entrées précédentes, comme
 * `X-Real-IP`, peuvent venir du client et être forgées. Même règle que
 * `ipDuClient` du service temps réel. Sans en-tête exploitable, tous les
 * appels partagent le même compteur : le plafond s'applique alors
 * globalement, ce qui reste le comportement sûr. Sert de clé de limitation :
 * une adresse IPv6 est ramenée à son préfixe /64.
 */
export function ipDeRequete(enTetes: Pick<Headers, "get">): string {
  const derniere = enTetes
    .get("x-forwarded-for")
    ?.split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .at(-1);
  return derniere ? cleDAdresse(derniere) : "inconnu";
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


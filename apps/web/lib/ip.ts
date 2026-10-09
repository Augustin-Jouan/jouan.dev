/**
 * Adresse du client derrière le proxy de Coolify (Traefik), qui l'ajoute en
 * **dernier** dans `X-Forwarded-For` : les entrées précédentes, comme
 * `X-Real-IP`, peuvent venir du client et être forgées. Même règle que
 * `ipDuClient` du service temps réel. Sans en-tête exploitable, tous les
 * appels partagent le même compteur : le plafond s'applique alors
 * globalement, ce qui reste le comportement sûr.
 */
export function ipDeRequete(enTetes: Pick<Headers, "get">): string {
  const derniere = enTetes
    .get("x-forwarded-for")
    ?.split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .at(-1);
  return derniere || "inconnu";
}

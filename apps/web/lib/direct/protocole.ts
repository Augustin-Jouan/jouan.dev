/**
 * Messages du service temps réel, côté navigateur : même forme que
 * `apps/realtime/src/protocole.ts` (les deux paquets ne s'importent pas ;
 * le test de bout en bout garde les deux côtés d'accord). Le navigateur
 * n'envoie rien : il écoute le nombre de personnes présentes.
 */
export type MessageServeur = { type: "bienvenue"; presents: number } | { type: "presents"; nombre: number };

/**
 * Un message du serveur, ou `null` (binaire, JSON invalide, type inconnu d'une
 * autre version). Seul le nombre est gardé : l'accueil d'un ancien service, qui
 * portait aussi les curseurs, reste lisible.
 */
export function lireMessageServeur(brut: unknown): MessageServeur | null {
  if (typeof brut !== "string") return null;
  let m: { type?: unknown; presents?: unknown; nombre?: unknown } | null;
  try {
    m = JSON.parse(brut) as typeof m;
  } catch {
    return null;
  }
  if (typeof m !== "object" || m === null) return null;
  if (m.type === "bienvenue" && typeof m.presents === "number") return { type: "bienvenue", presents: m.presents };
  if (m.type === "presents" && typeof m.nombre === "number") return { type: "presents", nombre: m.nombre };
  return null;
}

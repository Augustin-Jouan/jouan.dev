/**
 * Messages du service temps réel, côté navigateur : même forme que
 * `apps/realtime/src/protocole.ts` (les deux paquets ne s'importent pas ;
 * le test de bout en bout garde les deux côtés d'accord).
 */
export type Curseur = [id: string, couleur: string, s: number, x: number, y: number];

export type MessageClient = { type: "position"; s: number; x: number; y: number } | { type: "masque" };

export type MessageServeur =
  | { type: "bienvenue"; id: string; couleur: string; presents: number; curseurs: Curseur[] }
  | { type: "presents"; nombre: number }
  | { type: "positions"; curseurs: Curseur[] }
  | { type: "depart"; id: string };

const TYPES = new Set(["bienvenue", "presents", "positions", "depart"]);

/** Un message du serveur, ou `null` (binaire, JSON invalide, type inconnu d'une autre version). */
export function lireMessageServeur(brut: unknown): MessageServeur | null {
  if (typeof brut !== "string") return null;
  try {
    const m: unknown = JSON.parse(brut);
    if (typeof m === "object" && m !== null && TYPES.has((m as { type?: unknown }).type as string)) return m as MessageServeur;
  } catch {
    // ignoré
  }
  return null;
}

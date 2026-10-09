/**
 * Messages échangés sur `/direct` (spec du sous-projet 4, §3). Courts et en
 * JSON : la position est relative à une section de l'accueil (`s`), `x` et `y`
 * entre 0 et 1, pour retomber au même endroit quelle que soit la largeur
 * d'écran du visiteur qui la reçoit.
 */
export const TAILLE_MAX_MESSAGE = 128;
/** Borne haute de l'indice de section : l'accueil en compte six. */
export const NB_SECTIONS_MAX = 20;

export type MessageClient = { type: "position"; s: number; x: number; y: number } | { type: "masque" };

export type Curseur = [id: string, couleur: string, s: number, x: number, y: number];

export type MessageServeur =
  | { type: "bienvenue"; id: string; couleur: string; presents: number; curseurs: Curseur[] }
  | { type: "presents"; nombre: number }
  | { type: "positions"; curseurs: Curseur[] }
  | { type: "depart"; id: string };

const entre0et1 = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

/** Quatre décimales suffisent (0,1 px sur 1 000 px) et allègent les lots. */
const arrondir = (v: number) => Math.round(v * 10_000) / 10_000;

/** Lit un message du navigateur ; `null` s'il est trop long, mal formé ou d'un type inconnu. */
export function lireMessage(brut: string): MessageClient | null {
  if (brut.length > TAILLE_MAX_MESSAGE) return null;
  let donnees: unknown;
  try {
    donnees = JSON.parse(brut);
  } catch {
    return null;
  }
  if (typeof donnees !== "object" || donnees === null) return null;
  const m = donnees as Record<string, unknown>;
  if (m.type === "masque") return { type: "masque" };
  if (
    m.type === "position" &&
    typeof m.s === "number" &&
    Number.isInteger(m.s) &&
    m.s >= 0 &&
    m.s < NB_SECTIONS_MAX &&
    entre0et1(m.x) &&
    entre0et1(m.y)
  ) {
    return { type: "position", s: m.s, x: arrondir(m.x), y: arrondir(m.y) };
  }
  return null;
}

export const encoder = (m: MessageServeur): string => JSON.stringify(m);

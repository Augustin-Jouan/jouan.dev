/**
 * Jeton d'un lien personnalisé : le nom du prospect, lisible, suivi d'un
 * suffixe aléatoire qui empêche de deviner le lien d'un autre prospect
 * (« boulangerie-martin-k7f3 »).
 */
import { randomInt } from "node:crypto";

export const LONGUEUR_NOM_MAX = 60;
const LONGUEUR_BASE_MAX = 40;
const LONGUEUR_SUFFIXE = 4;
export const LONGUEUR_JETON_MAX = LONGUEUR_BASE_MAX + 1 + LONGUEUR_SUFFIXE;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const FORMAT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function nettoyerNom(brut: string): { ok: true; nom: string } | { ok: false; erreur: string } {
  const nom = brut.replace(/[\s\p{Cc}]+/gu, " ").trim();
  if (!nom) return { ok: false, erreur: "Indiquez le nom du prospect." };
  if (nom.length > LONGUEUR_NOM_MAX) {
    return { ok: false, erreur: `Le nom ne doit pas dépasser ${LONGUEUR_NOM_MAX} caractères.` };
  }
  return { ok: true, nom };
}

export function baseDuJeton(nom: string): string {
  const base = nom
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "Oe")
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "Ae")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LONGUEUR_BASE_MAX)
    .replace(/-+$/, "");
  return base || "prospect";
}

export function genererJeton(nom: string, tirer: (n: number) => number = randomInt): string {
  let suffixe = "";
  for (let i = 0; i < LONGUEUR_SUFFIXE; i++) suffixe += ALPHABET[tirer(ALPHABET.length)];
  return `${baseDuJeton(nom)}-${suffixe}`;
}

export function estJetonValide(jeton: string): boolean {
  return jeton.length <= LONGUEUR_JETON_MAX && FORMAT.test(jeton);
}

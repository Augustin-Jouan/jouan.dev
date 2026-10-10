/**
 * Nuage de traits de l'accueil (sous-projet 9) : semis des traits et nuage au
 * repos, sans WebGL ni DOM. Le moteur (lib/encre/moteur.ts) envoie le semis à
 * la carte graphique, qui applique les mêmes formules (SOURCE_TRAITS_SOMMET,
 * lib/encre/shader.ts) ; le nuage figé (components/accueil/NuageFige.tsx) les
 * applique ici, une fois, au rendu serveur.
 *
 * Unités : pixels CSS.
 */
import { couleur } from "../charte";

/** Un trait par carré de PAS px de côté, TRAITS_MAX au plus. */
export const PAS = 28;
export const TRAITS_MAX = 1600;

/** Rôles de la charte, répartis selon l'angle autour du centre du nuage. */
export const COULEURS_NUAGE = [couleur("goutte"), couleur("lueur"), couleur("lueur-chaude"), couleur("texte-doux")];

export type Trait = { x: number; y: number; longueur: number; phase: number };

/** Tirage pseudo-aléatoire reproductible (mulberry32) : même graine, même nuage. */
function hasard(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Traits d'une surface de `largeur` × `hauteur` px : une grille de pas PAS (élargi tant qu'elle dépasse TRAITS_MAX cases), chaque trait décalé au hasard dans sa case. */
export function semerTraits(largeur: number, hauteur: number, graine = 9): Trait[] {
  if (largeur <= 0 || hauteur <= 0) return [];
  // Cases réellement parcourues par les boucles ci-dessous : le pas est élargi
  // jusqu'à ce qu'elles tiennent sous le plafond, sans tronquer la dernière rangée.
  const cases = (p: number) => Math.ceil(largeur / p - 0.5) * Math.ceil(hauteur / p - 0.5);
  let pas = Math.max(PAS, Math.sqrt((largeur * hauteur) / TRAITS_MAX));
  while (cases(pas) > TRAITS_MAX) pas *= 1.01;
  const tirer = hasard(graine);
  const borner = (v: number, max: number) => Math.min(max, Math.max(0, v));
  const traits: Trait[] = [];
  for (let y = pas / 2; y < hauteur; y += pas) {
    for (let x = pas / 2; x < largeur; x += pas) {
      traits.push({
        x: borner(x + (tirer() - 0.5) * pas * 0.9, largeur),
        y: borner(y + (tirer() - 0.5) * pas * 0.9, hauteur),
        longueur: 4 + tirer() * 4,
        phase: tirer() * Math.PI * 2,
      });
    }
  }
  return traits;
}

/** Opacité d'un trait à la distance `d` du centre d'un nuage de rayon `rayon` : vide au centre, estompe au loin (nulle au-delà de 1,95 rayon). */
export function opaciteTrait(d: number, rayon: number): number {
  const vide = Math.min(1, Math.max(0, (d - 0.14 * rayon) / (0.25 * rayon)));
  const loin = Math.max(0, 1 - Math.pow(Math.max(0, d - 0.35 * rayon) / (1.6 * rayon), 1.4));
  return vide * loin;
}

/** Rayon du nuage dans le repère du nuage figé (viewBox de -400 à 400) : assez grand pour des coordonnées entières. */
export const RAYON_FIGE = 200;

export type GroupeFige = { couleur: string; opacite: number; chemin: string };

/**
 * Le nuage au repos, tel que le moteur le dessine sur un écran de 800 px de
 * haut (rayon 160 px), ramené au repère du SVG. Les traits sont regroupés par
 * couleur et par palier d'opacité : un `<path>` par groupe, pour un HTML léger.
 */
export function nuageFige(): GroupeFige[] {
  const rayon = 160;
  const echelle = RAYON_FIGE / rayon;
  const cote = (4 * RAYON_FIGE) / echelle;
  const groupes = new Map<string, GroupeFige>();
  const arrondi = (v: number) => Math.round(v * 10) / 10;
  const entier = Math.round;
  for (const t of semerTraits(cote, cote)) {
    const dx = t.x - cote / 2;
    const dy = t.y - cote / 2;
    const d = Math.hypot(dx, dy) || 0.001;
    const opacite = opaciteTrait(d, rayon);
    // Les traits presque invisibles alourdiraient le HTML sans se voir.
    if (opacite < 0.2) continue;
    const proche = Math.exp(-d / rayon);
    const [ux, uy] = [dx / d, dy / d];
    const longueur = t.longueur * (0.6 + 0.6 * proche);
    const cx = dx + ux * 14 * proche;
    const cy = dy + uy * 14 * proche;
    const angle = (((Math.atan2(dy, dx) / (2 * Math.PI)) % 1) + 1) % 1;
    const teinte = COULEURS_NUAGE[Math.floor(angle * COULEURS_NUAGE.length + 0.5) % COULEURS_NUAGE.length]!;
    const palier = Math.ceil(opacite * 4) / 4;
    const cle = `${teinte}-${palier}`;
    const groupe = groupes.get(cle) ?? { couleur: teinte, opacite: arrondi(palier * 0.9), chemin: "" };
    groupe.chemin +=
      `M${entier((cx - (ux * longueur) / 2) * echelle)} ${entier((cy - (uy * longueur) / 2) * echelle)}` +
      `l${entier(ux * longueur * echelle)} ${entier(uy * longueur * echelle)}`;
    groupes.set(cle, groupe);
  }
  return [...groupes.values()];
}

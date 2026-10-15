/**
 * Calculs de la vue 3D, sans Three.js (testables) : la disposition au sol, les
 * plateaux et socles déduits du lieu de chaque nœud, le cadrage de la caméra.
 * Repère de Three.js : `y` vers le haut, le sol est le plan (`x`, `z`), la
 * caméra regarde vers les `z` négatifs.
 *
 * Deux dispositions, comme le schéma 2D : « large » (cadre plus large que haut)
 * et « étroite » (téléphone : la scène s'allonge en profondeur, la caméra plonge
 * davantage, pour remplir le cadre haut).
 */
import type { IdNoeud, Lieu, Noeud } from "@/data/architecture";

export type Disposition = "large" | "etroite";
export type Point3 = { x: number; y: number; z: number };
export type Plateau = {
  lieu: Lieu;
  nom: string;
  x: number;
  z: number;
  largeur: number;
  profondeur: number;
  /** Un autre plateau le cache par devant : son nom se met derrière lui, au milieu. */
  nomDerriere: boolean;
};
export type Socle = { id: IdNoeud; lieu: Lieu; nom?: string; x: number; z: number; rayon: number };

/**
 * Place de chaque nœud au sol. Large : le VPS au centre, GitHub derrière, les services externes et le
 * visiteur sur les côtés. Étroite : de l'arrière vers l'avant, GitHub, le VPS sur deux colonnes, puis le
 * visiteur et les mails, enfin les statistiques (derrière le visiteur : aucune liaison ne les traverse).
 */
const SOL: Record<Disposition, Record<IdNoeud, { x: number; z: number }>> = {
  large: {
    navigateur: { x: -6.2, z: 0.3 },
    statistiques: { x: -6.2, z: 3.0 },
    proxy: { x: -2.3, z: 0.4 },
    tempsReel: { x: -2.3, z: 2.5 },
    site: { x: 0.5, z: 0.4 },
    base: { x: 2.8, z: 2.0 },
    deploiement: { x: 2.3, z: -1.2 },
    mails: { x: 6.2, z: 0.4 },
    integration: { x: -1.2, z: -4.7 },
    registre: { x: 1.6, z: -4.7 },
  },
  etroite: {
    integration: { x: -1.1, z: -8.0 },
    registre: { x: 1.1, z: -8.0 },
    base: { x: -1.1, z: -4.9 },
    deploiement: { x: 1.1, z: -4.9 },
    site: { x: 0, z: -2.8 },
    proxy: { x: -1.1, z: -0.7 },
    tempsReel: { x: 1.1, z: -0.7 },
    navigateur: { x: -1.2, z: 2.4 },
    mails: { x: 1.3, z: 2.4 },
    statistiques: { x: -1.2, z: 4.9 },
  },
};

export const positionSol = (id: IdNoeud, d: Disposition) => SOL[d][id];

/** Noms des plateaux, et des socles qui en ont un (le navigateur s'en passe : son étiquette suffit). */
const NOMS_PLATEAUX: Partial<Record<Lieu, string>> = { vps: "VPS en France · Coolify", github: "GitHub" };
const NOMS_SOCLES: Partial<Record<IdNoeud, string>> = { statistiques: "Umami Cloud", mails: "Fournisseur SMTP" };
/** Marge d'un plateau autour des nœuds qu'il porte ; rayon d'un socle. */
const MARGE_PLATEAU = 1.25;
const RAYON_SOCLE = 1;

/** Un plateau par lieu nommé : le rectangle qui englobe ses nœuds, plus une marge. */
export function plateaux(noeuds: readonly Noeud[], d: Disposition): Plateau[] {
  const rectangles = (Object.keys(NOMS_PLATEAUX) as Lieu[]).map((lieu) => {
    const pts = noeuds.filter((n) => n.lieu === lieu).map((n) => SOL[d][n.id]);
    const [x0, x1] = [Math.min(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.x))];
    const [z0, z1] = [Math.min(...pts.map((p) => p.z)), Math.max(...pts.map((p) => p.z))];
    return {
      lieu,
      nom: NOMS_PLATEAUX[lieu]!,
      x: (x0 + x1) / 2,
      z: (z0 + z1) / 2,
      largeur: x1 - x0 + 2 * MARGE_PLATEAU,
      profondeur: z1 - z0 + 2 * MARGE_PLATEAU,
    };
  });
  return rectangles.map((p) => ({
    ...p,
    nomDerriere: rectangles.some((q) => q !== p && q.z > p.z && Math.abs(q.x - p.x) < (q.largeur + p.largeur) / 2),
  }));
}

/** Un socle rond sous chaque nœud qui n'est sur aucun plateau. */
export function socles(noeuds: readonly Noeud[], d: Disposition): Socle[] {
  return noeuds
    .filter((n) => !NOMS_PLATEAUX[n.lieu])
    .map((n) => ({ id: n.id, lieu: n.lieu, nom: NOMS_SOCLES[n.id], ...SOL[d][n.id], rayon: RAYON_SOCLE }));
}

/** Hauteur des étiquettes des nœuds, au-dessus du sol : le point le plus haut de la scène. */
export const HAUTEUR_ETIQUETTE = 1.65;

/** Ce que la caméra doit voir : les coins des plateaux, le pourtour des socles, et chaque nœud jusqu'à son étiquette. */
export function pointsAVoir(noeuds: readonly Noeud[], d: Disposition): Point3[] {
  const points: Point3[] = [];
  for (const p of plateaux(noeuds, d))
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) points.push({ x: p.x + (sx * p.largeur) / 2, y: 0, z: p.z + (sz * p.profondeur) / 2 });
  for (const s of socles(noeuds, d))
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      points.push({ x: s.x + s.rayon * Math.cos(a), y: 0, z: s.z + s.rayon * Math.sin(a) });
    }
  for (const n of noeuds) points.push({ x: SOL[d][n.id].x, y: HAUTEUR_ETIQUETTE, z: SOL[d][n.id].z });
  return points;
}

/** Champ vertical de la caméra, en degrés. */
export const CHAMP_VERTICAL = 40;
/** Inclinaison de la caméra depuis la verticale, en radians : elle plonge davantage sur un cadre étroit. */
export const ANGLE_CAMERA: Record<Disposition, number> = { large: 0.95, etroite: 0.6 };
/**
 * Amplitude du balancement lent de la scène autour de son centre (au lieu d'une rotation complète, qui
 * sortirait du cadre) ; faible sur un cadre étroit, où la scène est longue.
 */
export const BALANCEMENT: Record<Disposition, number> = { large: 0.35, etroite: 0.1 };
/** Marge autour de la scène, dans le champ. */
const MARGE_CHAMP = 0.94;

/** Tourne `p` de `angle` autour de l'axe vertical passant par `c` (convention de Three.js, `rotation.y`). */
export function tourner(p: Point3, angle: number, c: Point3): Point3 {
  const [x, z] = [p.x - c.x, p.z - c.z];
  return { x: c.x + x * Math.cos(angle) + z * Math.sin(angle), y: p.y, z: c.z - x * Math.sin(angle) + z * Math.cos(angle) };
}

/** Centre de la scène au sol : le milieu de ce qu'il faut voir. Le balancement tourne autour de lui. */
export function centre(noeuds: readonly Noeud[], d: Disposition): Point3 {
  const points = pointsAVoir(noeuds, d);
  const milieu = (v: number[]) => (Math.min(...v) + Math.max(...v)) / 2;
  return { x: milieu(points.map((p) => p.x)), y: 0.4, z: milieu(points.map((p) => p.z)) };
}

/** Le point vu au centre de l'image, et la distance de la caméra qui fait tenir toute la scène, balancement compris. */
export function cadrage(noeuds: readonly Noeud[], d: Disposition, aspect: number): { cible: Point3; distance: number } {
  const points = pointsAVoir(noeuds, d);
  const cible = centre(noeuds, d);
  const t = Math.tan((CHAMP_VERTICAL * Math.PI) / 360) * MARGE_CHAMP;
  const [cos, sin] = [Math.cos(ANGLE_CAMERA[d]), Math.sin(ANGLE_CAMERA[d])];
  const tient = (distance: number) =>
    [-BALANCEMENT[d], 0, BALANCEMENT[d]].every((b) =>
      points.every((p0) => {
        const p = tourner(p0, b, cible);
        const v = { x: p.x - cible.x, y: p.y - cible.y - distance * cos, z: p.z - cible.z - distance * sin };
        // Base de la caméra : avant (0, −cos, −sin), droite (1, 0, 0), haut (0, sin, −cos).
        const profondeur = -v.y * cos - v.z * sin;
        return profondeur > 0 && Math.abs(v.x) <= profondeur * t * aspect && Math.abs(v.y * sin - v.z * cos) <= profondeur * t;
      }),
    );
  let [bas, haut] = [1, 200];
  while (haut - bas > 0.05) {
    const milieu = (bas + haut) / 2;
    if (tient(milieu)) haut = milieu;
    else bas = milieu;
  }
  return { cible, distance: Math.ceil(haut * 10) / 10 };
}

/** Durée, en secondes, du trajet d'un paquet sur une liaison : plus court quand la latence est basse. */
export function periodePaquet(ms: number | null): number {
  if (ms === null) return 1.5;
  return Math.round(Math.min(4, Math.max(0.6, ms / 50)) * 10) / 10;
}

/**
 * Tracé du trait conducteur de l'accueil (spec docs/superpowers/specs/2026-10-14-trait-conducteur-design.md,
 * § 3). Pur : des repères mesurés dans la page (coordonnées du document, en px) donnent le chemin SVG,
 * ses échantillons (pour placer la tête) et ses jalons (progression, allumages).
 *
 * Le chemin n'est fait que de courbes de Bézier cubiques : leur longueur se mesure ici, sans DOM.
 */
import { ordonnerReperes, PAS_ECHANTILLON, type Point, type Repere } from "./progression";

export type { Point };
export type Cercle = Point & { r: number };
export type Boite = { gauche: number; haut: number; droite: number; bas: number };
export type Variante = "marges" | "bord";

/** Ce que la page fournit (lib/trait/trait-conducteur.ts). */
export type Reperes = {
  /** Largeur utile de l'écran (`clientWidth`). */
  largeur: number;
  hauteurEcran: number;
  /** `(width >= 64rem)` : la ligne de la Méthode est horizontale. */
  ordinateur: boolean;
  /** Du bord de l'écran au bord gauche du contenu (`#methode h2`). */
  marge: number;
  /** Bas de l'accroche. */
  departY: number;
  /** Milieu vertical de la section Réalisations. */
  realisationsY: number;
  /** Centres des cinq nœuds de la Méthode. */
  noeuds: Point[];
  /** Axe de la ligne de la Méthode, de son début à sa fin. */
  fil: { debut: Point; fin: Point };
  /** Images des logos du parcours, dans l'ordre de la page. */
  logos: Cercle[];
  /** Bouton d'envoi du formulaire de contact. */
  envoi: Boite;
};

export type Cible = { type: "etape"; indice: number } | { type: "logo"; indice: number } | { type: "envoi" };

export type Trace = {
  variante: Variante;
  /** Chemin SVG, en coordonnées du document. */
  d: string;
  longueur: number;
  /** Un point tous les `PAS_ECHANTILLON` px de longueur, du départ à l'arrivée. */
  echantillons: Point[];
  /** Progression : longueur à atteindre quand la ligne de lecture passe `y`. */
  reperes: Repere[];
  /** Ce qui s'allume quand la longueur tracée dépasse `l`, dans l'ordre du trait. */
  allumables: { l: number; cible: Cible }[];
};

/** Marge sous laquelle le trait longe le bord de l'écran au lieu de dessiner dans la marge. */
export const MARGE_MIN = 56;
/** Écart entre le trait et l'image d'un logo : il passe sur l'anneau pêche (2 px, décalé de 4 px). */
export const ECART_LOGO = 6;
/** Graine fixe : la même mise en page donne toujours le même trait. */
const GRAINE = 20261014;
/** Pas vertical moyen entre deux inflexions du tracé libre. */
const PAS_ONDULATION = 200;
/** Quart de cercle en Bézier : poignées à 0,5523 × le rayon. */
const K_ARC = 0.5523;
const DEGRES = 180 / Math.PI;
const angle = (p: Point, c: Point) => Math.atan2(p.y - c.y, p.x - c.x) * DEGRES;

export function choisirVariante(r: Pick<Reperes, "ordinateur" | "marge" | "logos">): Variante {
  return r.ordinateur && r.marge >= MARGE_MIN && r.logos.length === 2 ? "marges" : "bord";
}

const ajouter = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const retirer = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const fois = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const borner = (p: Point, [min, max]: Bornes): Point => ({ x: Math.min(max, Math.max(min, p.x)), y: p.y });

type Bornes = [number, number];
type Segment = [Point, Point, Point, Point];

const BAS: Point = { x: 0, y: 1 };
const DROITE: Point = { x: 1, y: 0 };

/** Générateur pseudo-aléatoire (mulberry32) : nombres dans [0, 1[, toujours les mêmes pour une graine. */
function generateur(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Points intermédiaires du tracé libre entre deux hauteurs, à peu près tous les `PAS_ONDULATION` px. */
function inflexions(alea: () => number, haut: number, bas: number, [min, max]: Bornes): Point[] {
  const n = Math.max(1, Math.round((bas - haut) / PAS_ONDULATION));
  return Array.from({ length: n - 1 }, (_, i) => ({ x: min + alea() * (max - min), y: haut + ((i + 1) * (bas - haut)) / n }));
}

/** Chemin en construction : une suite de courbes de Bézier cubiques. */
class Chemin {
  readonly segments: Segment[] = [];

  constructor(private fin: Point) {}

  /** Repère d'un point du chemin : le nombre de segments déjà posés. */
  get jalon(): number {
    return this.segments.length;
  }

  courbe(c1: Point, c2: Point, p: Point): this {
    this.segments.push([this.fin, c1, c2, p]);
    this.fin = p;
    return this;
  }

  ligne(p: Point): this {
    const a = this.fin;
    return this.courbe(ajouter(a, fois(retirer(p, a), 1 / 3)), ajouter(a, fois(retirer(p, a), 2 / 3)), p);
  }

  /**
   * Arc de cercle de centre `c`, de l'angle `de` à l'angle `a` (degrés, y vers le bas : 90 = en bas), en
   * morceaux d'au plus un quart de tour ; part de la position courante, qui doit être sur le cercle.
   */
  arc(c: Point, r: number, de: number, a: number): this {
    const morceaux = Math.max(1, Math.ceil(Math.abs(a - de) / 90));
    const pas = (a - de) / morceaux;
    const poignee = (4 / 3) * Math.tan((Math.abs(pas) * Math.PI) / 720) * r;
    const sens = Math.sign(pas);
    const point = (angle: number) => ({ x: c.x + r * Math.cos((angle * Math.PI) / 180), y: c.y + r * Math.sin((angle * Math.PI) / 180) });
    const tangente = (angle: number) => ({
      x: -Math.sin((angle * Math.PI) / 180) * sens,
      y: Math.cos((angle * Math.PI) / 180) * sens,
    });
    for (let i = 1; i <= morceaux; i++) {
      const debut = de + (i - 1) * pas;
      const fin = de + i * pas;
      const p = point(fin);
      this.courbe(ajouter(this.fin, fois(tangente(debut), poignee)), retirer(p, fois(tangente(fin), poignee)), p);
    }
    return this;
  }

  /**
   * Courbe lisse (Catmull-Rom) par `points`, qui part dans la direction `depart` et arrive dans la direction
   * `arrivee` (vecteurs unitaires). Les poignées sont bornées en x : la courbe reste entre `bornes`.
   */
  lisse(points: Point[], depart: Point, arrivee: Point, bornes: Bornes): this {
    const pts = [this.fin, ...points];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const ta = i === 0 ? fois(depart, distance(a, b)) : fois(retirer(b, pts[i - 1]!), 0.5);
      const tb = i === pts.length - 2 ? fois(arrivee, distance(a, b)) : fois(retirer(pts[i + 2]!, a), 0.5);
      this.courbe(borner(ajouter(a, fois(ta, 1 / 3)), bornes), borner(retirer(b, fois(tb, 1 / 3)), bornes), b);
    }
    return this;
  }
}

type Jalon = number;
/** Ce que chaque variante construit : le chemin, ses repères de progression et ses allumables. */
type Construction = {
  chemin: Chemin;
  reperes: { jalon: Jalon; y: number }[];
  allumables: { jalon: Jalon; decalage: number; cible: Cible }[];
};

/** Les cinq nœuds, allumés le long de la ligne qui part du jalon `jalon` (nœud 1). */
function etapes(r: Reperes, jalon: Jalon) {
  const n1 = r.noeuds[0]!;
  return r.noeuds.map((noeud, indice) => ({ jalon, decalage: distance(n1, noeud), cible: { type: "etape", indice } as Cible }));
}

function tracerMarges(r: Reperes, alea: () => number): Construction {
  const { marge: M, largeur: W, hauteurEcran: h } = r;
  const gauche: Bornes = [12, M - 16];
  const droite: Bornes = [W - M + 16, W - 12];
  const resserre = ([min, max]: Bornes): Bornes => [min + 4, max - 4];
  const milieuGauche = (gauche[0] + gauche[1]) / 2;
  const milieuDroite = (droite[0] + droite[1]) / 2;

  const depart = { x: M / 2, y: r.departY - 24 };
  const chemin = new Chemin(depart);

  // Descente libre jusqu'à la boucle, à hauteur des Réalisations, puis la boucle.
  const rayon = Math.min(14, Math.max(10, (gauche[1] - gauche[0]) / 2));
  const boucle = { x: milieuGauche, y: r.realisationsY };
  const pied = { x: boucle.x, y: boucle.y + rayon };
  chemin.lisse([...inflexions(alea, depart.y, pied.y, resserre(gauche)), pied], BAS, DROITE, gauche);
  chemin.arc(boucle, rayon, 90, 0).arc(boucle, rayon, 0, -90).arc(boucle, rayon, -90, -180).arc(boucle, rayon, -180, -270);

  // Descente libre jusqu'au nœud 1, où le trait entre dans la ligne de la Méthode par la gauche.
  const n1 = r.noeuds[0]!;
  const approche = { x: milieuGauche, y: n1.y - 80 };
  chemin.lisse([...inflexions(alea, pied.y, approche.y, resserre(gauche)), approche], DROITE, BAS, gauche);
  chemin.courbe({ x: approche.x, y: approche.y + 50 }, { x: n1.x - 40, y: n1.y }, n1);
  const jalonN1 = chemin.jalon;
  const fin = r.fil.fin;
  chemin.ligne(fin);
  const jalonFin = chemin.jalon;

  // Sortie à droite, descente libre jusqu'au-dessus du logo de droite.
  const sortie = { x: milieuDroite, y: fin.y + 80 };
  chemin.courbe({ x: fin.x + 40, y: fin.y }, { x: sortie.x, y: sortie.y - 40 }, sortie);
  const [logoGauche, logoDroite] = [...r.logos].sort((a, b) => a.x - b.x) as [Cercle, Cercle];
  const r1 = logoGauche.r + ECART_LOGO;
  const r2 = logoDroite.r + ECART_LOGO;
  const haut2 = { x: logoDroite.x, y: logoDroite.y - r2 };
  const avantLogos = { x: milieuDroite, y: haut2.y - 60 };
  chemin.lisse([...inflexions(alea, sortie.y, avantLogos.y, resserre(droite)), avantLogos], BAS, BAS, droite);
  chemin.courbe({ x: avantLogos.x, y: avantLogos.y + 40 }, { x: haut2.x + K_ARC * r2, y: haut2.y }, haut2);
  const jalonLogoDroite = chemin.jalon;

  // ∞ : le trait épouse l'anneau de droite par le haut, croise en ligne droite (tangentes intérieures
  // communes aux deux anneaux), fait le tour de l'anneau de gauche par le bas, recroise et finit en bas de
  // l'anneau de droite. Il ne passe jamais sur les images.
  const ecart = distance(logoGauche, logoDroite);
  const axe = fois(retirer(logoDroite, logoGauche), 1 / ecart);
  const normale = { x: -axe.y, y: axe.x };
  const croisement = ajouter(logoGauche, fois(axe, (ecart * r1) / (r1 + r2)));
  const sinus = Math.min(0.95, (r1 + r2) / ecart);
  const cosinus = Math.sqrt(1 - sinus * sinus);
  const descendGauche = ajouter(fois(axe, -cosinus), fois(normale, sinus));
  const descendDroite = ajouter(fois(axe, cosinus), fois(normale, sinus));
  const brin1 = distance(croisement, logoGauche) * cosinus;
  const brin2 = distance(croisement, logoDroite) * cosinus;
  const contact2 = retirer(croisement, fois(descendGauche, brin2));
  const contact1 = ajouter(croisement, fois(descendGauche, brin1));
  const retour1 = retirer(croisement, fois(descendDroite, brin1));
  const retour2 = ajouter(croisement, fois(descendDroite, brin2));
  const bas1 = { x: logoGauche.x, y: logoGauche.y + r1 };
  const haut1 = { x: logoGauche.x, y: logoGauche.y - r1 };
  const bas2 = { x: logoDroite.x, y: logoDroite.y + r2 };
  chemin.arc(logoDroite, r2, -90, angle(contact2, logoDroite)).ligne(contact1);
  const jalonLogoGauche = chemin.jalon;
  const depuis1 = angle(contact1, logoGauche);
  chemin.arc(logoGauche, r1, depuis1, angle(retour1, logoGauche) + (angle(retour1, logoGauche) < depuis1 ? 360 : 0));
  chemin.ligne(retour2).arc(logoDroite, r2, angle(retour2, logoDroite), 90);
  const jalonApresLogos = chemin.jalon;

  // Retour dans la marge droite, descente libre, puis arrivée sur le bord droit du bouton d'envoi.
  const reprise = { x: milieuDroite, y: bas2.y + 70 };
  chemin.courbe({ x: bas2.x + 60, y: bas2.y }, { x: reprise.x, y: reprise.y - 40 }, reprise);
  const arrivee = { x: r.envoi.droite, y: (r.envoi.haut + r.envoi.bas) / 2 };
  const avantEnvoi = { x: milieuDroite, y: arrivee.y - 90 };
  chemin.lisse([...inflexions(alea, reprise.y, avantEnvoi.y, resserre(droite)), avantEnvoi], BAS, BAS, droite);
  chemin.courbe({ x: avantEnvoi.x, y: arrivee.y }, { x: arrivee.x + 80, y: arrivee.y }, arrivee);
  const jalonArrivee = chemin.jalon;

  return {
    chemin,
    reperes: [
      { jalon: 0, y: depart.y },
      { jalon: jalonN1, y: n1.y - 0.25 * h },
      { jalon: jalonFin, y: n1.y + 0.25 * h },
      { jalon: jalonLogoDroite, y: Math.min(haut1.y, haut2.y) },
      { jalon: jalonApresLogos, y: Math.max(bas1.y, bas2.y) },
      { jalon: jalonArrivee, y: arrivee.y },
    ],
    allumables: [
      ...etapes(r, jalonN1),
      { jalon: jalonLogoDroite, decalage: 0, cible: { type: "logo", indice: r.logos.indexOf(logoDroite) } },
      { jalon: jalonLogoGauche, decalage: 0, cible: { type: "logo", indice: r.logos.indexOf(logoGauche) } },
      { jalon: jalonArrivee, decalage: 0, cible: { type: "envoi" } },
    ],
  };
}

/**
 * Variante « bord » : le long du bord gauche, puis la ligne de la Méthode. Ligne verticale (téléphone) :
 * retour au bord gauche. Ligne horizontale (portable à marge étroite) : on finit le long du bord droit.
 */
function tracerBord(r: Reperes, alea: () => number): Construction {
  const { largeur: W, hauteurEcran: h, ordinateur } = r;
  const depart = { x: 8, y: r.departY - 24 };
  const chemin = new Chemin(depart);

  const n1 = r.noeuds[0]!;
  const approche = { x: 8, y: n1.y - 60 };
  chemin.lisse([...inflexions(alea, depart.y, approche.y, [5, 11]), approche], BAS, BAS, [4, 12]);
  chemin.courbe({ x: approche.x, y: approche.y + 30 }, ordinateur ? { x: n1.x - 30, y: n1.y } : { x: n1.x, y: n1.y - 30 }, n1);
  const jalonN1 = chemin.jalon;
  const fin = r.fil.fin;
  chemin.ligne(fin);
  const jalonFin = chemin.jalon;

  const x = ordinateur ? W - 8 : 8;
  const bornes: Bornes = ordinateur ? [W - 12, W - 4] : [4, 12];
  const reprise = { x, y: fin.y + 60 };
  chemin.courbe(ordinateur ? { x: fin.x + 30, y: fin.y } : { x: fin.x, y: fin.y + 30 }, { x, y: reprise.y - 30 }, reprise);
  const centreEnvoi = (r.envoi.haut + r.envoi.bas) / 2;
  const arrivee = ordinateur ? { x: r.envoi.droite, y: centreEnvoi } : { x: r.envoi.gauche, y: centreEnvoi };
  const avantEnvoi = { x, y: arrivee.y - 60 };
  chemin.lisse([...inflexions(alea, reprise.y, avantEnvoi.y, [bornes[0] + 1, bornes[1] - 1]), avantEnvoi], BAS, BAS, bornes);
  chemin.courbe({ x, y: avantEnvoi.y + 40 }, ordinateur ? { x: arrivee.x + 40, y: arrivee.y } : { x: arrivee.x - 12, y: arrivee.y }, arrivee);
  const jalonArrivee = chemin.jalon;

  return {
    chemin,
    reperes: [
      { jalon: 0, y: depart.y },
      { jalon: jalonN1, y: ordinateur ? n1.y - 0.25 * h : n1.y },
      { jalon: jalonFin, y: ordinateur ? n1.y + 0.25 * h : fin.y },
      { jalon: jalonArrivee, y: arrivee.y },
    ],
    allumables: [...etapes(r, jalonN1), { jalon: jalonArrivee, decalage: 0, cible: { type: "envoi" } }],
  };
}

function bezier([p0, c1, c2, p1]: Segment, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p1.x, y: a * p0.y + b * c1.y + c * c2.y + d * p1.y };
}

const arrondi = (n: number) => Math.round(n * 10) / 10;

export function tracer(r: Reperes): Trace {
  const variante = choisirVariante(r);
  const alea = generateur(GRAINE);
  const { chemin, reperes, allumables } = variante === "marges" ? tracerMarges(r, alea) : tracerBord(r, alea);
  const { segments } = chemin;

  // Mesure : chaque segment découpé en cordes d'environ 6 px.
  const points: Point[] = [segments[0]![0]];
  const cumul = [0];
  const debutSegment: number[] = [];
  for (const segment of segments) {
    debutSegment.push(cumul.at(-1)!);
    const [p0, c1, c2, p1] = segment;
    const n = Math.max(8, Math.ceil((distance(p0, c1) + distance(c1, c2) + distance(c2, p1)) / 6));
    for (let k = 1; k <= n; k++) {
      const p = bezier(segment, k / n);
      cumul.push(cumul.at(-1)! + distance(points.at(-1)!, p));
      points.push(p);
    }
  }
  const longueur = cumul.at(-1)!;
  debutSegment.push(longueur);

  // Échantillons réguliers le long du trait.
  const echantillons: Point[] = [];
  for (let l = 0, i = 1; l < longueur; l += PAS_ECHANTILLON) {
    while (cumul[i]! < l) i++;
    const f = (l - cumul[i - 1]!) / (cumul[i]! - cumul[i - 1]! || 1);
    echantillons.push(ajouter(points[i - 1]!, fois(retirer(points[i]!, points[i - 1]!), f)));
  }
  echantillons.push(points.at(-1)!);

  const d =
    `M${arrondi(points[0]!.x)} ${arrondi(points[0]!.y)}` +
    segments.map(([, c1, c2, p]) => `C${[c1, c2, p].map((q) => `${arrondi(q.x)} ${arrondi(q.y)}`).join(" ")}`).join("");

  return {
    variante,
    d,
    longueur,
    echantillons,
    reperes: ordonnerReperes(reperes.map(({ jalon, y }) => ({ l: debutSegment[jalon]!, y }))),
    allumables: allumables
      .map(({ jalon, decalage, cible }) => ({ l: Math.min(longueur, debutSegment[jalon]! + decalage), cible }))
      .sort((a, b) => a.l - b.l),
  };
}

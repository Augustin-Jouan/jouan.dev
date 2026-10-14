import { describe, expect, it } from "vitest";
import { pointA } from "./progression";
import { choisirVariante, ECART_LOGO, MARGE_MIN, tracer, type Reperes, type Trace } from "./trace";

/** Accueil sur un écran de 1280 × 720 : marge de 96 px, Méthode horizontale. */
const ORDINATEUR: Reperes = {
  largeur: 1280,
  hauteurEcran: 720,
  ordinateur: true,
  marge: 96,
  departY: 800,
  realisationsY: 1900,
  noeuds: [104, 324, 544, 764, 984].map((x) => ({ x, y: 2600 })),
  fil: { debut: { x: 96, y: 2600 }, fin: { x: 1184, y: 2600 } },
  logos: [
    { x: 904, y: 3100, r: 80 },
    { x: 1104, y: 3100, r: 80 },
  ],
  envoi: { gauche: 96, haut: 3900, droite: 210, bas: 3944 },
};

/** Accueil sur un téléphone de 390 px : gouttière de 20 px, Méthode verticale. */
const TELEPHONE: Reperes = {
  largeur: 390,
  hauteurEcran: 844,
  ordinateur: false,
  marge: 20,
  departY: 700,
  realisationsY: 2200,
  noeuds: [0, 1, 2, 3, 4].map((i) => ({ x: 28, y: 3600 + i * 250 })),
  fil: { debut: { x: 28, y: 3590 }, fin: { x: 28, y: 4700 } },
  logos: [
    { x: 120, y: 5300, r: 56 },
    { x: 270, y: 5300, r: 56 },
  ],
  envoi: { gauche: 20, haut: 6400, droite: 134, bas: 6444 },
};

/** Portable de 1100 px : Méthode horizontale, mais marge trop étroite. */
const PORTABLE: Reperes = {
  ...ORDINATEUR,
  largeur: 1100,
  marge: 32,
  noeuds: [40, 246, 452, 658, 864].map((x) => ({ x, y: 2600 })),
  fil: { debut: { x: 32, y: 2600 }, fin: { x: 1068, y: 2600 } },
  logos: [
    { x: 788, y: 3100, r: 80 },
    { x: 988, y: 3100, r: 80 },
  ],
  envoi: { gauche: 32, haut: 3900, droite: 146, bas: 3944 },
};

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const longueurDe = (trace: Trace, type: string, indice?: number) =>
  trace.allumables.find((a) => a.cible.type === type && (indice === undefined || ("indice" in a.cible && a.cible.indice === indice)))!.l;

describe("choisirVariante", () => {
  it("prend les marges sur ordinateur quand elles font au moins 56 px", () => {
    expect(choisirVariante({ ordinateur: true, marge: MARGE_MIN, logos: ORDINATEUR.logos })).toBe("marges");
    expect(choisirVariante({ ordinateur: true, marge: MARGE_MIN - 1, logos: ORDINATEUR.logos })).toBe("bord");
    expect(choisirVariante({ ordinateur: false, marge: 200, logos: ORDINATEUR.logos })).toBe("bord");
  });

  it("prend le bord sans les deux logos", () => {
    expect(choisirVariante({ ordinateur: true, marge: 96, logos: ORDINATEUR.logos.slice(0, 1) })).toBe("bord");
  });
});

describe("tracer, variante « marges »", () => {
  const trace = tracer(ORDINATEUR);
  const { marge: M, largeur: W } = ORDINATEUR;

  it("est déterministe", () => {
    expect(trace.variante).toBe("marges");
    expect(tracer(ORDINATEUR).d).toBe(trace.d);
    expect(trace.d.startsWith("M48 776C")).toBe(true);
  });

  it("échantillonne le trait tous les 4 px, du départ à l'arrivée", () => {
    expect(trace.echantillons[0]).toEqual({ x: M / 2, y: ORDINATEUR.departY - 24 });
    expect(trace.echantillons.length).toBe(Math.ceil(trace.longueur / 4) + 1);
    const fin = trace.echantillons.at(-1)!;
    expect(fin.x).toBeCloseTo(ORDINATEUR.envoi.droite, 5);
    expect(fin.y).toBeCloseTo(3922, 5);
  });

  it("reste dans les marges, hors de la Méthode, des logos et de l'arrivée", () => {
    const n1 = ORDINATEUR.noeuds[0]!;
    const hautLogos = 3100 - 80 - ECART_LOGO;
    const basLogos = 3100 + 80 + ECART_LOGO;
    for (const p of trace.echantillons) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(W);
      const aGauche = p.y < n1.y - 80;
      const aDroite = (p.y > n1.y + 80 && p.y < hautLogos - 60) || (p.y > basLogos + 70 && p.y < 3922 - 90);
      if (aGauche) {
        expect(p.x, `(${p.x}, ${p.y})`).toBeGreaterThanOrEqual(12);
        expect(p.x, `(${p.x}, ${p.y})`).toBeLessThanOrEqual(M - 16);
      }
      if (aDroite) {
        expect(p.x, `(${p.x}, ${p.y})`).toBeGreaterThanOrEqual(W - M + 16);
        expect(p.x, `(${p.x}, ${p.y})`).toBeLessThanOrEqual(W - 12);
      }
    }
  });

  it("fait une boucle à hauteur des Réalisations", () => {
    const autour = trace.echantillons.filter((p) => Math.abs(p.y - ORDINATEUR.realisationsY) <= 14);
    // Une descente simple passe une fois par chaque hauteur ; la boucle y repasse.
    const montees = autour.filter((p, i) => i > 0 && p.y < autour[i - 1]!.y);
    expect(montees.length).toBeGreaterThan(3);
  });

  it("passe par le centre des cinq nœuds, dans l'ordre", () => {
    const longueurs = ORDINATEUR.noeuds.map((_, i) => longueurDe(trace, "etape", i));
    expect([...longueurs].sort((a, b) => a - b)).toEqual(longueurs);
    ORDINATEUR.noeuds.forEach((noeud, i) => {
      const p = pointA(longueurs[i]!, trace.echantillons, trace.longueur);
      expect(distance(p, noeud), `nœud ${i + 1}`).toBeLessThan(1);
    });
  });

  it("enlace les deux logos sur leur anneau", () => {
    ORDINATEUR.logos.forEach((logo, i) => {
      const p = pointA(longueurDe(trace, "logo", i), trace.echantillons, trace.longueur);
      expect(Math.abs(distance(p, logo) - (logo.r + ECART_LOGO)), `logo ${i + 1}`).toBeLessThanOrEqual(1);
    });
    // Le logo de gauche est longé du bas au haut, par la gauche : un demi-tour.
    const gauche = ORDINATEUR.logos[0]!;
    const angles = trace.echantillons
      .filter((p) => Math.abs(distance(p, gauche) - (gauche.r + ECART_LOGO)) <= 1.5)
      .map((p) => (Math.atan2(p.y - gauche.y, p.x - gauche.x) * 180) / Math.PI);
    expect(angles.some((a) => Math.abs(Math.abs(a) - 180) < 5)).toBe(true);
    expect(angles.some((a) => Math.abs(a - 90) < 5)).toBe(true);
    expect(angles.some((a) => Math.abs(a + 90) < 5)).toBe(true);
  });

  it("ne passe jamais sur l'image d'un logo : il épouse leurs anneaux et croise entre les deux", () => {
    for (const logo of ORDINATEUR.logos) {
      const plusPres = Math.min(...trace.echantillons.map((p) => distance(p, logo)));
      expect(plusPres).toBeGreaterThanOrEqual(logo.r + ECART_LOGO - 1);
    }
  });

  it("allume les étapes, le logo de droite, celui de gauche, puis l'envoi", () => {
    expect(trace.allumables.map((a) => ("indice" in a.cible ? `${a.cible.type}${a.cible.indice}` : a.cible.type))).toEqual([
      "etape0",
      "etape1",
      "etape2",
      "etape3",
      "etape4",
      "logo1",
      "logo0",
      "envoi",
    ]);
    expect(trace.allumables.at(-1)!.l).toBe(trace.longueur);
  });

  it("étale la traversée de la Méthode sur un demi-écran de défilement", () => {
    const n1 = longueurDe(trace, "etape", 0);
    const i = trace.reperes.findIndex((r) => r.l === n1);
    expect(trace.reperes[i]!.y).toBe(2600 - 0.25 * 720);
    expect(trace.reperes[i + 1]!.y).toBe(2600 + 0.25 * 720);
    expect(trace.reperes[i + 1]!.l - n1).toBeCloseTo(1184 - 104, 5);
  });

  it("a des repères strictement croissants, du départ (0) à l'envoi (longueur totale)", () => {
    expect(trace.reperes[0]).toEqual({ l: 0, y: ORDINATEUR.departY - 24 });
    expect(trace.reperes.at(-1)!.l).toBe(trace.longueur);
    trace.reperes.slice(1).forEach((r, i) => {
      expect(r.y).toBeGreaterThan(trace.reperes[i]!.y);
      expect(r.l).toBeGreaterThanOrEqual(trace.reperes[i]!.l);
    });
  });
});

describe("tracer, variante « bord »", () => {
  it("téléphone : longe le bord gauche, suit la ligne verticale, finit sur le bord gauche du bouton", () => {
    const trace = tracer(TELEPHONE);
    expect(trace.variante).toBe("bord");
    const n1 = TELEPHONE.noeuds[0]!;
    for (const p of trace.echantillons) {
      if (p.y < n1.y - 60 || (p.y > TELEPHONE.fil.fin.y + 60 && p.y < 6422 - 60)) {
        expect(p.x, `(${p.x}, ${p.y})`).toBeGreaterThanOrEqual(4);
        expect(p.x, `(${p.x}, ${p.y})`).toBeLessThanOrEqual(12);
      }
    }
    TELEPHONE.noeuds.forEach((noeud, i) => {
      expect(distance(pointA(longueurDe(trace, "etape", i), trace.echantillons, trace.longueur), noeud)).toBeLessThan(1);
    });
    expect(trace.allumables.some((a) => a.cible.type === "logo")).toBe(false);
    const fin = trace.echantillons.at(-1)!;
    expect(fin.x).toBeCloseTo(TELEPHONE.envoi.gauche, 5);
    expect(fin.y).toBeCloseTo(6422, 5);
  });

  it("téléphone : la traversée suit le défilement, sans étalement", () => {
    const trace = tracer(TELEPHONE);
    const i = trace.reperes.findIndex((r) => r.l === longueurDe(trace, "etape", 0));
    expect(trace.reperes[i]!.y).toBe(3600);
    expect(trace.reperes[i + 1]!.y).toBe(4700);
  });

  it("portable à marge étroite : bord gauche, ligne horizontale, puis bord droit jusqu'au bouton", () => {
    const trace = tracer(PORTABLE);
    expect(trace.variante).toBe("bord");
    const n1 = PORTABLE.noeuds[0]!;
    for (const p of trace.echantillons) {
      if (p.y < n1.y - 60) {
        expect(p.x).toBeGreaterThanOrEqual(4);
        expect(p.x).toBeLessThanOrEqual(12);
      }
      if (p.y > n1.y + 60 && p.y < 3922 - 60) {
        expect(p.x).toBeGreaterThanOrEqual(PORTABLE.largeur - 12);
        expect(p.x).toBeLessThanOrEqual(PORTABLE.largeur - 4);
      }
    }
    const fin = trace.echantillons.at(-1)!;
    expect(fin.x).toBeCloseTo(PORTABLE.envoi.droite, 5);
    expect(trace.allumables.some((a) => a.cible.type === "logo")).toBe(false);
  });
});

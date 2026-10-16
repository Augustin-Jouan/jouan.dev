import { describe, expect, it } from "vitest";
import { LIGNE_DE_LECTURE, pointA } from "./progression";
import { choisirVariante, ECART_ANNEAU, MARGE_MIN, tracer, type Reperes, type Trace } from "./trace";

/** Accueil sur un écran de 1280 × 720 : marge de 96 px, Méthode horizontale. */
const ORDINATEUR: Reperes = {
  largeur: 1280,
  hauteurEcran: 720,
  ordinateur: true,
  marge: 96,
  portrait: { x: 176, y: 400, r: 80 },
  offreY: 1900,
  noeuds: [104, 324, 544, 764, 984].map((x) => ({ x, y: 2600 })),
  fil: { debut: { x: 96, y: 2600 }, fin: { x: 1184, y: 2600 } },
  logos: [
    { x: 904, y: 3100, r: 80 },
    { x: 1104, y: 3100, r: 80 },
  ],
  envoi: { gauche: 96, haut: 3900, droite: 210, bas: 3944 },
  finLecture: 4155,
};

/** Accueil sur un téléphone de 390 px : gouttière de 20 px, Méthode verticale. */
const TELEPHONE: Reperes = {
  largeur: 390,
  hauteurEcran: 844,
  ordinateur: false,
  marge: 20,
  portrait: { x: 68, y: 300, r: 48 },
  offreY: 2200,
  noeuds: [0, 1, 2, 3, 4].map((i) => ({ x: 28, y: 3600 + i * 250 })),
  fil: { debut: { x: 28, y: 3590 }, fin: { x: 28, y: 4700 } },
  logos: [
    { x: 120, y: 5300, r: 56 },
    { x: 270, y: 5300, r: 56 },
  ],
  envoi: { gauche: 20, haut: 6400, droite: 124, bas: 6444 },
  finLecture: 6613,
};

/** Portable de 1100 px : Méthode horizontale, mais marge trop étroite. */
const PORTABLE: Reperes = {
  ...ORDINATEUR,
  largeur: 1100,
  marge: 32,
  portrait: { x: 112, y: 400, r: 80 },
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
    expect(trace.d.startsWith("M176 314C")).toBe(true);
  });

  it("échantillonne le trait tous les 4 px, du départ à l'arrivée", () => {
    expect(trace.echantillons[0]).toEqual({ x: 176, y: 400 - 80 - ECART_ANNEAU });
    expect(trace.echantillons.length).toBe(Math.ceil(trace.longueur / 4) + 1);
    const fin = trace.echantillons.at(-1)!;
    expect(fin.x).toBeCloseTo(ORDINATEUR.envoi.droite, 5);
    expect(fin.y).toBeCloseTo(3922, 5);
  });

  it("reste dans les marges, hors de la Méthode, des logos et de l'arrivée", () => {
    const n1 = ORDINATEUR.noeuds[0]!;
    const hautLogos = 3100 - 80 - ECART_ANNEAU;
    const basLogos = 3100 + 80 + ECART_ANNEAU;
    for (const p of trace.echantillons) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(W);
      // Sous la photo et sa sortie, jusqu'à l'approche de la Méthode.
      const aGauche = p.y > 400 + 86 + 60 && p.y < n1.y - 80;
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

  it("fait une boucle à hauteur de l'offre", () => {
    const autour = trace.echantillons.filter((p) => Math.abs(p.y - ORDINATEUR.offreY) <= 14);
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
      expect(Math.abs(distance(p, logo) - (logo.r + ECART_ANNEAU)), `logo ${i + 1}`).toBeLessThanOrEqual(1);
    });
    // Le logo de gauche est longé du bas au haut, par la gauche : un demi-tour.
    const gauche = ORDINATEUR.logos[0]!;
    const angles = trace.echantillons
      .filter((p) => Math.abs(distance(p, gauche) - (gauche.r + ECART_ANNEAU)) <= 1.5)
      .map((p) => (Math.atan2(p.y - gauche.y, p.x - gauche.x) * 180) / Math.PI);
    expect(angles.some((a) => Math.abs(Math.abs(a) - 180) < 5)).toBe(true);
    expect(angles.some((a) => Math.abs(a - 90) < 5)).toBe(true);
    expect(angles.some((a) => Math.abs(a + 90) < 5)).toBe(true);
  });

  it("ne passe jamais sur l'image d'un logo : il épouse leurs anneaux et croise entre les deux", () => {
    for (const logo of ORDINATEUR.logos) {
      const plusPres = Math.min(...trace.echantillons.map((p) => distance(p, logo)));
      expect(plusPres).toBeGreaterThanOrEqual(logo.r + ECART_ANNEAU - 1);
    }
  });

  it("allume les étapes, le logo de droite, celui de gauche, puis l'envoi", () => {
    expect(trace.allumables.map((a) => ("indice" in a.cible ? `${a.cible.type}${a.cible.indice}` : a.cible.type))).toEqual([
      "portrait",
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
    expect(trace.reperes[0]!.l).toBe(0);
    expect(trace.reperes.at(-1)!.l).toBe(trace.longueur);
    trace.reperes.slice(1).forEach((r, i) => {
      expect(r.y).toBeGreaterThan(trace.reperes[i]!.y);
      expect(r.l).toBeGreaterThanOrEqual(trace.reperes[i]!.l);
    });
  });
});

describe("tracer, départ sur la photo de l'accroche", () => {
  for (const [nom, r] of [["marges", ORDINATEUR], ["téléphone", TELEPHONE], ["portable", PORTABLE]] as const) {
    describe(nom, () => {
      const trace = tracer(r);
      const { portrait } = r;
      const R = portrait.r + ECART_ANNEAU;
      const lTour = longueurDe(trace, "portrait");

      it("part du haut de l'anneau de la photo et en fait le tour complet, puis repart de sa gauche", () => {
        expect(trace.echantillons[0]).toEqual({ x: portrait.x, y: portrait.y - R });
        // Un tour et quart : du haut, par la gauche, le bas, la droite, le haut, jusqu'à la gauche.
        expect(Math.abs(lTour - 2.5 * Math.PI * R)).toBeLessThan(2);
        const tour = trace.echantillons.filter((_, i) => i * 4 <= lTour);
        for (const p of tour) expect(Math.abs(distance(p, portrait) - R), `(${p.x}, ${p.y})`).toBeLessThanOrEqual(1);
        const angles = tour.map((p) => (Math.atan2(p.y - portrait.y, p.x - portrait.x) * 180) / Math.PI);
        for (const cap of [-90, 0, 90]) expect(angles.some((a) => Math.abs(a - cap) < 5), `${cap}°`).toBe(true);
        expect(angles.some((a) => Math.abs(Math.abs(a) - 180) < 5)).toBe(true);
        expect(distance(pointA(lTour, trace.echantillons, trace.longueur), { x: portrait.x - R, y: portrait.y })).toBeLessThan(1);
      });

      it("ne passe jamais sur la photo", () => {
        const plusPres = Math.min(...trace.echantillons.map((p) => distance(p, portrait)));
        expect(plusPres).toBeGreaterThanOrEqual(R - 1);
      });

      it("allume la photo d'abord : le tour s'étale sur un quart d'écran à partir de la ligne de lecture au repos", () => {
        expect(trace.allumables[0]!.cible.type).toBe("portrait");
        const debut = Math.max(portrait.y, LIGNE_DE_LECTURE * r.hauteurEcran);
        expect(trace.reperes[0]!.l).toBe(0);
        expect(trace.reperes[0]!.y).toBeCloseTo(debut, 5);
        expect(trace.reperes[1]!.l).toBe(lTour);
        expect(trace.reperes[1]!.y).toBeCloseTo(debut + 0.25 * r.hauteurEcran, 5);
      });
    });
  }

  it("photo sous la ligne de lecture au repos : le tour attend que la ligne de lecture atteigne son centre", () => {
    const trace = tracer({ ...ORDINATEUR, portrait: { x: 176, y: 600, r: 80 } });
    expect(trace.reperes[0]).toEqual({ l: 0, y: 600 });
  });
});

describe("tracer, signature sous l'adresse e-mail", () => {
  // Colonne de l'adresse : à droite du formulaire, de l'e-mail (3600) jusqu'en bas du formulaire.
  const SIGNE: Reperes = { ...ORDINATEUR, signature: { gauche: 760, haut: 3600, droite: 1184, bas: 4000 } };
  const zone = SIGNE.signature!;
  const dansZone = (p: { x: number; y: number }) => p.x > zone.gauche && p.x < zone.droite && p.y > zone.haut - 40 && p.y < zone.bas;

  it("le trait écrit dans la colonne, sous l'e-mail sans le toucher, puis finit sur le bouton d'envoi", () => {
    const trace = tracer(SIGNE);
    const ecrits = trace.echantillons.filter(dansZone);
    // Une signature, pas une simple traversée : plusieurs centaines de pixels de trait dans la colonne.
    expect(ecrits.length * 4).toBeGreaterThan(1_200);
    for (const p of ecrits) {
      expect(p.y).toBeGreaterThan(zone.haut + 8);
      expect(p.x).toBeLessThan(zone.droite);
    }
    expect(distance(trace.echantillons.at(-1)!, { x: 210, y: 3922 })).toBeLessThan(1);
    expect(longueurDe(trace, "envoi")).toBe(trace.longueur);
  });

  it("l'écriture s'étale au défilement : du haut de la signature jusqu'après le bouton", () => {
    const trace = tracer(SIGNE);
    const [avant, fin] = trace.reperes.slice(-2);
    // L'écriture commence à hauteur de la signature (pas dès les logos) et dure au moins un quart d'écran.
    expect(avant!.y).toBeGreaterThan(zone.haut - 0.5 * SIGNE.hauteurEcran);
    expect(fin!.y - avant!.y).toBeGreaterThan(0.25 * SIGNE.hauteurEcran);
  });

  it("sans place sous l'adresse, le tracé reste celui d'avant", () => {
    const etroit = tracer({ ...SIGNE, signature: { ...zone, haut: 3850 } });
    expect(etroit.d).toBe(tracer(ORDINATEUR).d);
    expect(tracer({ ...ORDINATEUR, signature: { ...zone, droite: zone.gauche + 200 } }).d).toBe(tracer(ORDINATEUR).d);
  });

  it("pas de signature sur téléphone ni sur la variante « bord »", () => {
    expect(tracer({ ...PORTABLE, signature: zone }).d).toBe(tracer(PORTABLE).d);
  });
});

describe("tracer, écran haut", () => {
  // Grand écran : sous le bouton, moins de 34 % d'écran de page ; la ligne de lecture s'arrête au-dessus.
  for (const [nom, r] of [["marges", ORDINATEUR], ["bord", PORTABLE]] as const) {
    it(`variante « ${nom} » : le trait finit quand même au bas de la page, la Méthode n'a pas bougé`, () => {
      const normal = tracer(r);
      const haut = tracer({ ...r, hauteurEcran: 1440, finLecture: 3800 });
      expect(haut.reperes.at(-1)!.y).toBeLessThanOrEqual(3800);
      expect(haut.reperes.at(-1)!.l).toBe(haut.longueur);
      haut.reperes.slice(1).forEach((p, i) => expect(p.y).toBeGreaterThan(haut.reperes[i]!.y));
      expect(haut.reperes.slice(0, 2).map((p) => p.l)).toEqual(normal.reperes.slice(0, 2).map((p) => p.l));
      expect(haut.reperes[0]!.y).toBeCloseTo(LIGNE_DE_LECTURE * 1440, 5);
    });
  }
});

describe("tracer, variante « bord »", () => {
  it("téléphone : longe le bord gauche jusqu'à la Méthode et en suit la ligne verticale", () => {
    const trace = tracer(TELEPHONE);
    expect(trace.variante).toBe("bord");
    const n1 = TELEPHONE.noeuds[0]!;
    for (const p of trace.echantillons) {
      if (p.y > 300 + 54 + 40 && p.y < n1.y - 60) {
        expect(p.x, `(${p.x}, ${p.y})`).toBeGreaterThanOrEqual(4);
        expect(p.x, `(${p.x}, ${p.y})`).toBeLessThanOrEqual(12);
      }
    }
    TELEPHONE.noeuds.forEach((noeud, i) => {
      expect(distance(pointA(longueurDe(trace, "etape", i), trace.echantillons, trace.longueur), noeud)).toBeLessThan(1);
    });
  });

  it("téléphone : après l'étape 05, le trait passe sur le bord droit, puis enlace les deux logos sans passer sur leurs images", () => {
    const trace = tracer(TELEPHONE);
    const { largeur: W, logos } = TELEPHONE;
    const hautLogos = Math.min(...logos.map((l) => l.y - l.r));
    const basLogos = Math.max(...logos.map((l) => l.y + l.r));
    for (const p of trace.echantillons) {
      if ((p.y > TELEPHONE.fil.fin.y + 140 && p.y < hautLogos - 70) || (p.y > basLogos + 80 && p.y < 6300)) {
        expect(p.x, `(${p.x}, ${p.y})`).toBeGreaterThanOrEqual(W - 12);
        expect(p.x, `(${p.x}, ${p.y})`).toBeLessThanOrEqual(W - 4);
      }
      for (const logo of logos) expect(distance(p, logo), `(${p.x}, ${p.y})`).toBeGreaterThan(logo.r + 2);
    }
    for (const logo of logos) {
      const surAnneau = trace.echantillons.filter((p) => Math.abs(distance(p, logo) - (logo.r + ECART_ANNEAU)) < 1);
      expect(surAnneau.length * 4).toBeGreaterThan(Math.PI * (logo.r + ECART_ANNEAU) * 0.8);
    }
    // Le logo de droite d'abord (le trait arrive par la droite), puis celui de gauche, puis l'envoi.
    const ordre = trace.allumables.filter((a) => a.cible.type !== "etape").map((a) => ("indice" in a.cible ? `logo${a.cible.indice}` : a.cible.type));
    expect(ordre).toEqual(["portrait", "logo1", "logo0", "envoi"]);
  });

  it("téléphone : signe à droite du bouton d'envoi, puis finit sur son bord droit", () => {
    const trace = tracer(TELEPHONE);
    const { envoi, largeur: W } = TELEPHONE;
    const centre = (envoi.haut + envoi.bas) / 2;
    const ecrits = trace.echantillons.filter((p) => p.x > envoi.droite + 8 && p.x < W - 4 && p.y > centre - 90 && p.y < centre + 30);
    expect(ecrits.length * 4).toBeGreaterThan(800);
    // La signature reste à côté du bouton, sans déborder de l'écran.
    for (const p of trace.echantillons.filter((q) => q.y > centre - 90)) {
      expect(p.x).toBeLessThanOrEqual(W - 4);
      if (p.y > envoi.haut - 4 && p.y < envoi.bas + 4) expect(p.x).toBeGreaterThanOrEqual(envoi.droite - 0.5);
    }
    const fin = trace.echantillons.at(-1)!;
    expect(fin.x).toBeCloseTo(envoi.droite, 5);
    expect(fin.y).toBeCloseTo(centre, 5);
    expect(longueurDe(trace, "envoi")).toBe(trace.longueur);
    // L'écriture s'étale au défilement : au moins un quart d'écran.
    const [avant, arrivee] = trace.reperes.slice(-2);
    expect(arrivee!.y - avant!.y).toBeGreaterThan(0.25 * TELEPHONE.hauteurEcran);
  });

  it("tablette (768 px) : la signature ne grandit pas au-delà de 0,8, pour ne pas monter sur le champ Message", () => {
    const TABLETTE: Reperes = { ...TELEPHONE, largeur: 768, logos: [{ x: 300, y: 5300, r: 56 }, { x: 460, y: 5300, r: 56 }] };
    const trace = tracer(TABLETTE);
    const centre = (TABLETTE.envoi.haut + TABLETTE.envoi.bas) / 2;
    const signature = trace.echantillons.filter((p) => p.x > TABLETTE.envoi.droite + 8 && p.x < 768 - 20 && p.y > centre - 200);
    expect(signature.length * 4).toBeGreaterThan(800);
    // Haut de la signature (110 unités au-dessus de la ligne de base, elle-même 4 px au-dessus du milieu du bouton).
    for (const p of signature) expect(p.y).toBeGreaterThanOrEqual(centre - 4 - 110 * 0.8 - 1);
  });

  it("téléphone étroit (360 px) : signature trop petite, le trait arrive directement sur le bord droit du bouton", () => {
    const ETROIT: Reperes = { ...TELEPHONE, largeur: 360, logos: [{ x: 110, y: 5300, r: 52 }, { x: 250, y: 5300, r: 52 }] };
    const trace = tracer(ETROIT);
    const { envoi } = ETROIT;
    const centre = (envoi.haut + envoi.bas) / 2;
    const ecrits = trace.echantillons.filter((p) => p.x > envoi.droite + 8 && p.x < 360 - 20 && p.y > centre - 90 && p.y < centre + 30);
    expect(ecrits.length * 4).toBeLessThan(400);
    const fin = trace.echantillons.at(-1)!;
    expect(fin.x).toBeCloseTo(envoi.droite, 5);
    expect(fin.y).toBeCloseTo(centre, 5);
  });

  it("téléphone sans les deux logos : le trait descend le long du bord droit, sans enlacer", () => {
    const trace = tracer({ ...TELEPHONE, logos: TELEPHONE.logos.slice(0, 1) });
    expect(trace.allumables.some((a) => a.cible.type === "logo")).toBe(false);
    expect(trace.echantillons.at(-1)!.x).toBeCloseTo(TELEPHONE.envoi.droite, 5);
  });

  it("téléphone : des repères strictement croissants, du départ (0) à l'envoi (longueur totale)", () => {
    const trace = tracer(TELEPHONE);
    expect(trace.reperes[0]!.l).toBe(0);
    expect(trace.reperes.at(-1)!.l).toBe(trace.longueur);
    trace.reperes.slice(1).forEach((p, i) => {
      expect(p.l).toBeGreaterThan(trace.reperes[i]!.l);
      expect(p.y).toBeGreaterThan(trace.reperes[i]!.y);
    });
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
      if (p.y > 400 + 86 + 40 && p.y < n1.y - 60) {
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

import { afterEach, describe, expect, it, vi } from "vitest";
import { boitesDesSections, REPERES, versPage, versRepere, type Boite } from "./coordonnees";

const etroit: Boite[] = [
  { gauche: 20, haut: 0, largeur: 400, hauteur: 600 },
  { gauche: 20, haut: 600, largeur: 400, hauteur: 1_000 },
];
const large: Boite[] = [
  { gauche: 240, haut: 0, largeur: 1_440, hauteur: 800 },
  { gauche: 240, haut: 800, largeur: 1_440, hauteur: 500 },
];

describe("coordonnées relatives aux sections", () => {
  it("repère un point dans sa section", () => {
    expect(versRepere(220, 850, etroit)).toEqual({ s: 1, x: 0.5, y: 0.25 });
  });
  it("retombe au même endroit relatif sur un autre écran", () => {
    const r = versRepere(220, 850, etroit)!;
    expect(versPage(r, large)).toEqual({ x: 960, y: 925 });
  });
  it("aller-retour exact sur une même mise en page", () => {
    const r = versRepere(120, 300, etroit)!;
    expect(versPage(r, etroit)).toEqual({ x: 120, y: 300 });
  });
  it("hors de toute section : null", () => {
    expect(versRepere(5, 100, etroit)).toBeNull();
    expect(versRepere(100, 5_000, etroit)).toBeNull();
  });
  it("ignore une section vide", () => {
    expect(versRepere(0, 0, [{ gauche: 0, haut: 0, largeur: 0, hauteur: 0 }])).toBeNull();
  });
  it("section inconnue ou vide chez le destinataire : null", () => {
    expect(versPage({ s: 5, x: 0.5, y: 0.5 }, etroit)).toBeNull();
    expect(versPage({ s: 0, x: 0.5, y: 0.5 }, [{ gauche: 0, haut: 0, largeur: 0, hauteur: 0 }])).toBeNull();
  });
});

describe("boitesDesSections", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("suit la table des repères, pas l'ordre du document", () => {
    expect(REPERES).toEqual(["accroche", "offre", "realisations", "methode", "parcours", "contact"]);
    document.body.innerHTML = '<section data-direct-section="contact"></section><section data-direct-section="accroche"></section>';
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const haut = this.dataset.directSection === "accroche" ? 0 : 900;
      return { left: 10, top: haut, width: 800, height: 600 } as DOMRect;
    });
    const boites = boitesDesSections();
    expect(boites).toHaveLength(6);
    expect(boites[0]).toEqual({ gauche: 10, haut: 0, largeur: 800, hauteur: 600 });
    expect(boites[5]).toEqual({ gauche: 10, haut: 900, largeur: 800, hauteur: 600 });
    expect(boites[1]).toEqual({ gauche: 0, haut: 0, largeur: 0, hauteur: 0 });
  });
});

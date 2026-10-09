import { describe, expect, it, vi } from "vitest";
import { MagasinDirect } from "./magasin";

describe("MagasinDirect", () => {
  it("part de rien, puis applique la bienvenue", () => {
    const m = new MagasinDirect();
    expect(m.etat()).toEqual({ connecte: false, presents: 0, curseurs: [] });
    m.appliquer({ type: "bienvenue", id: "moi", couleur: "#c84a1f", presents: 3, curseurs: [["a", "#2f6f6a", 1, 0.5, 0.5]] }, 100);
    expect(m.etat()).toEqual({ connecte: true, presents: 3, curseurs: [{ id: "a", couleur: "#2f6f6a", s: 1, x: 0.5, y: 0.5, vuLe: 100 }] });
  });
  it("met à jour le compteur, les positions et les départs", () => {
    const m = new MagasinDirect();
    m.appliquer({ type: "positions", curseurs: [["a", "#2f6f6a", 0, 0.1, 0.1], ["b", "#3b5b8c", 2, 0.2, 0.2]] }, 1);
    m.appliquer({ type: "positions", curseurs: [["a", "#2f6f6a", 0, 0.3, 0.3]] }, 2);
    m.appliquer({ type: "presents", nombre: 4 }, 3);
    m.appliquer({ type: "depart", id: "b" }, 4);
    expect(m.etat()).toEqual({ connecte: false, presents: 4, curseurs: [{ id: "a", couleur: "#2f6f6a", s: 0, x: 0.3, y: 0.3, vuLe: 2 }] });
  });
  it("prévient les abonnés et garde un état stable entre deux changements", () => {
    const m = new MagasinDirect();
    const abonne = vi.fn();
    const desabonner = m.abonner(abonne);
    const avant = m.etat();
    expect(m.etat()).toBe(avant);
    m.appliquer({ type: "presents", nombre: 2 }, 0);
    expect(abonne).toHaveBeenCalledTimes(1);
    desabonner();
    m.vider();
    expect(abonne).toHaveBeenCalledTimes(1);
    expect(m.etat()).toEqual({ connecte: false, presents: 0, curseurs: [] });
  });
  it("un curseur masqué qui bouge de nouveau réapparaît", () => {
    const m = new MagasinDirect();
    m.appliquer({ type: "positions", curseurs: [["a", "#2f6f6a", 0, 0.1, 0.1]] }, 1);
    m.appliquer({ type: "depart", id: "a" }, 2);
    m.appliquer({ type: "positions", curseurs: [["a", "#2f6f6a", 0, 0.2, 0.2]] }, 3);
    expect(m.etat().curseurs.map((c) => c.id)).toEqual(["a"]);
  });
});

import { describe, expect, it, vi } from "vitest";
import { MagasinDirect } from "./magasin";

describe("MagasinDirect", () => {
  it("part de rien, puis applique l'accueil et le compteur", () => {
    const m = new MagasinDirect();
    expect(m.etat()).toEqual({ connecte: false, presents: 0 });
    m.appliquer({ type: "bienvenue", presents: 3 });
    expect(m.etat()).toEqual({ connecte: true, presents: 3 });
    m.appliquer({ type: "presents", nombre: 4 });
    expect(m.etat()).toEqual({ connecte: true, presents: 4 });
  });
  it("prévient les abonnés et garde un état stable entre deux changements", () => {
    const m = new MagasinDirect();
    const abonne = vi.fn();
    const desabonner = m.abonner(abonne);
    const avant = m.etat();
    expect(m.etat()).toBe(avant);
    m.appliquer({ type: "presents", nombre: 2 });
    expect(abonne).toHaveBeenCalledTimes(1);
    desabonner();
    m.vider();
    expect(abonne).toHaveBeenCalledTimes(1);
    expect(m.etat()).toEqual({ connecte: false, presents: 0 });
  });
});

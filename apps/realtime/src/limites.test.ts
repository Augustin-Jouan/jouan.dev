import { describe, expect, it } from "vitest";
import { Debit, Gardien } from "./limites.js";

describe("Gardien", () => {
  it("plafonne par adresse IP", () => {
    const g = new Gardien(300, 2);
    expect(g.admettre("a")).toBe(true);
    expect(g.admettre("a")).toBe(true);
    expect(g.peutAdmettre("a")).toBe(false);
    expect(g.admettre("a")).toBe(false);
    expect(g.admettre("b")).toBe(true);
  });
  it("plafonne au total", () => {
    const g = new Gardien(2, 5);
    g.admettre("a");
    g.admettre("b");
    expect(g.admettre("c")).toBe(false);
    expect(g.connexions).toBe(2);
  });
  it("libère une place", () => {
    const g = new Gardien(300, 1);
    g.admettre("a");
    g.liberer("a");
    expect(g.connexions).toBe(0);
    expect(g.admettre("a")).toBe(true);
  });
  it("libérer une IP inconnue ne fait rien", () => {
    const g = new Gardien();
    g.liberer("inconnue");
    expect(g.connexions).toBe(0);
  });
});

describe("Debit", () => {
  it("accepte 40 messages par seconde, pas un de plus", () => {
    const d = new Debit(40);
    for (let i = 0; i < 40; i++) expect(d.accepter(1_000 + i)).toBe(true);
    expect(d.accepter(1_500)).toBe(false);
  });
  it("repart à zéro la seconde suivante", () => {
    const d = new Debit(2);
    d.accepter(0);
    d.accepter(10);
    expect(d.accepter(999)).toBe(false);
    expect(d.accepter(1_000)).toBe(true);
  });
});

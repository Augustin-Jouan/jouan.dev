import { describe, expect, it } from "vitest";
import { baseDuJeton, estJetonValide, genererJeton, nettoyerNom } from "./jeton";

describe("nettoyerNom", () => {
  it("retire les espaces autour", () => {
    expect(nettoyerNom("  Boulangerie Martin ")).toEqual({ ok: true, nom: "Boulangerie Martin" });
  });
  it("remplace blancs et caractères de contrôle par une espace", () => {
    expect(nettoyerNom("A\nB\tC\u0007D")).toEqual({ ok: true, nom: "A B C D" });
  });
  it("refuse un nom vide ou fait d'espaces", () => {
    expect(nettoyerNom("   ").ok).toBe(false);
  });
  it("refuse plus de 60 caractères", () => {
    expect(nettoyerNom("a".repeat(61)).ok).toBe(false);
    expect(nettoyerNom("a".repeat(60)).ok).toBe(true);
  });
  it("garde le texte tel quel, balises comprises (React l'échappe)", () => {
    expect(nettoyerNom("<b>Café</b> 🍞")).toEqual({ ok: true, nom: "<b>Café</b> 🍞" });
  });
});

describe("baseDuJeton", () => {
  it("met en minuscules, retire accents et ligatures, sépare par des tirets", () => {
    expect(baseDuJeton("Boulangerie Martin")).toBe("boulangerie-martin");
    expect(baseDuJeton("Pâtisserie Œuvre & Cœur")).toBe("patisserie-oeuvre-coeur");
    expect(baseDuJeton("  --L'Atelier--  ")).toBe("l-atelier");
  });
  it("tronque à 40 caractères sans tiret final", () => {
    const base = baseDuJeton("abcdefghij ".repeat(6));
    expect(base.length).toBeLessThanOrEqual(40);
    expect(base.endsWith("-")).toBe(false);
  });
  it("retombe sur « prospect » si rien ne reste", () => {
    expect(baseDuJeton("🍞🍞")).toBe("prospect");
  });
});

describe("genererJeton", () => {
  it("ajoute un suffixe de 4 caractères tirés de [a-z0-9]", () => {
    const tirages = [0, 25, 26, 35];
    expect(genererJeton("Boulangerie Martin", () => tirages.shift()!)).toBe("boulangerie-martin-az09");
  });
  it("produit un jeton valide", () => {
    expect(estJetonValide(genererJeton("Pâtisserie Œuvre & Cœur"))).toBe(true);
  });
});

describe("estJetonValide", () => {
  it.each(["boulangerie-martin-k7f3", "exemple-0000"])("accepte %s", (j) => {
    expect(estJetonValide(j)).toBe(true);
  });
  it.each(["", "Boulangerie-Martin-K7F3", "a b", "a--b", "-a", "a-", "a/b", "a".repeat(46)])(
    "refuse %s",
    (j) => {
      expect(estJetonValide(j)).toBe(false);
    },
  );
});

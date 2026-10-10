import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Garde-fou de la démo « Suivi de marchés » (sous-projet 8) : la maquette publiée ne doit
// porter aucune donnée réelle. Elle est générée hors du dépôt par un script d'anonymisation ;
// ce test vérifie ce qui se vérifie sans connaître les vraies valeurs.
const html = readFileSync(join(process.cwd(), "public/demo/suivi-de-marches/index.html"), "utf8");

/** Tranches de numéros que l'ARCEP réserve à la fiction (6 premiers chiffres). */
const TRANCHES_FICTION = ["019900", "026191", "035301", "046571", "053649", "063998"];

describe("démo « Suivi de marchés » : anonymat", () => {
  it("toute adresse e-mail est en .example (domaine réservé)", () => {
    const adresses = html.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [];
    expect(adresses.length).toBeGreaterThan(0);
    expect(adresses.filter((a) => !a.endsWith(".example"))).toEqual([]);
  });

  it("tout numéro de téléphone est dans une tranche réservée à la fiction", () => {
    const numeros = (html.match(/\b0[1-9](?:[ .-]?\d{2}){4}\b/g) ?? []).map((n) => n.replace(/\D/g, ""));
    expect(numeros.length).toBeGreaterThan(0);
    expect(numeros.filter((n) => !TRANCHES_FICTION.includes(n.slice(0, 6)))).toEqual([]);
  });

  it("n'intègre aucune image matricielle (le logo est un monogramme SVG)", () => {
    expect(html).not.toMatch(/data:image\/(?:jpeg|png|gif|webp)/);
  });

  it("ne charge aucune ressource externe, polices comprises", () => {
    expect(html).not.toMatch(/(?:src|href)\s*=\s*["']?\s*https?:/i);
    expect(html).not.toMatch(/url\(\s*["']?https?:/i);
    expect(html).not.toMatch(/@import/i);
  });

  it("les polices sont servies par le site, en adresses absolues", () => {
    expect(html).toContain("/demo/suivi-de-marches/polices/figtree-400.woff2");
  });

  it("garde ses données le temps de l'onglet seulement", () => {
    expect(html).toContain("sessionStorage.getItem(CLE)");
    expect(html).not.toMatch(/localStorage\.(?:getItem|setItem)/);
  });
});

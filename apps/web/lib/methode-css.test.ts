// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const MOUVEMENT = "@media (prefers-reduced-motion: no-preference)";

/** Le bloc qui commence à `depuis`, jusqu'à son accolade fermante. */
function bloc(depuis: number): string {
  const ouverture = css.indexOf("{", depuis);
  let profondeur = 0;
  for (let i = ouverture; i < css.length; i++) {
    if (css[i] === "{") profondeur++;
    else if (css[i] === "}" && --profondeur === 0) return css.slice(depuis, i + 1);
  }
  throw new Error("bloc non fermé");
}

/** Blocs « sans mouvement réduit » qui animent la méthode. */
const blocsAnimes: string[] = [];
for (let i = css.indexOf(MOUVEMENT); i >= 0; i = css.indexOf(MOUVEMENT, i + 1)) {
  const b = bloc(i);
  if (b.includes(".methode-")) blocsAnimes.push(b);
}
const reste = blocsAnimes.reduce((texte, b) => texte.replace(b, ""), css);
const regles = (texte: string) => texte.match(/[^{}]*\.methode-[^{}]*\{[^{}]*\}/g) ?? [];

describe("animation de la méthode (app/globals.css)", () => {
  it("n'est jamais liée au défilement : elle se figerait à mi-chemin quand on s'arrête", () => {
    expect(css).not.toMatch(/animation-timeline|view-timeline/);
  });

  it("ne s'applique qu'à une frise prise en main par le script (`data-animation`), sans mouvement réduit", () => {
    expect(blocsAnimes.length).toBeGreaterThan(0);
    for (const regle of regles(blocsAnimes.join("\n"))) {
      expect(regle.slice(0, regle.indexOf("{")), regle).toContain("[data-animation]");
    }
  });

  it("hors de ces blocs, la méthode est dans son état final : rien de caché ni d'animé", () => {
    // La goutte (`::before`) n'est qu'un éclat pendant l'animation : invisible au repos, par construction.
    const finales = regles(reste).filter((r) => !r.includes("::before"));
    expect(finales.length).toBeGreaterThan(0);
    for (const regle of finales) {
      expect(regle, regle).not.toMatch(/animation(?:-name|-delay|-play-state)?\s*:|transition\s*:|opacity:\s*0[;\s]|scale[XY]?\(0\)|data-animation/);
    }
  });
});

// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

/** Le bloc qui commence à `debut`, jusqu'à son accolade fermante. */
function bloc(depuis: number): string {
  const ouverture = css.indexOf("{", depuis);
  let profondeur = 0;
  for (let i = ouverture; i < css.length; i++) {
    if (css[i] === "{") profondeur++;
    else if (css[i] === "}" && --profondeur === 0) return css.slice(depuis, i + 1);
  }
  throw new Error("bloc non fermé");
}

describe("animation de la méthode (app/globals.css)", () => {
  const debut = css.indexOf("@supports (animation-timeline: view())");
  const anime = debut >= 0 ? bloc(debut) : "";
  const reste = css.replace(anime, "");

  it("n'anime qu'au défilement, sans mouvement réduit, sur la frise de la méthode", () => {
    expect(anime).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(anime).toContain("animation-timeline: --methode");
    expect(reste).toContain("view-timeline-name: --methode");
  });

  it("hors de ce bloc, la méthode est dans son état final : rien de caché ni d'animé", () => {
    // La goutte (`::before`) n'est qu'un éclat pendant l'animation : invisible au repos, par construction.
    const reglesMethode = (reste.match(/\.methode-[^{}]*\{[^}]*\}/g) ?? []).filter((r) => !r.includes("::before"));
    expect(reglesMethode.length).toBeGreaterThan(0);
    for (const regle of reglesMethode) {
      expect(regle, regle).not.toMatch(/animation(?:-name|-timeline|-range)?\s*:|opacity:\s*0[;\s]|scale[XY]?\(0\)/);
    }
  });
});

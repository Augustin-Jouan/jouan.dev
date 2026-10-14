import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demarrerTrait, lireReperes } from "./trait-conducteur";

/** Une frise de cinq étapes, armée par FriseMethode (`data-animation`). */
function frise({ allumee = false } = {}) {
  document.body.innerHTML = `
    <div class="fond-accueil"></div>
    <div class="methode-frise" data-animation>
      ${[0, 1, 2, 3, 4].map((i) => `<li class="methode-etape" ${allumee && i === 0 ? "data-allumee" : ""}><span class="methode-noeud"></span></li>`).join("")}
    </div>`;
  return document.querySelector<HTMLElement>(".methode-frise")!;
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("lireReperes", () => {
  it("ne renvoie rien quand un point de passage manque", () => {
    frise();
    expect(lireReperes()).toBeNull();
  });
});

describe("demarrerTrait", () => {
  it("pose un calque décoratif, caché tant que les points de passage manquent, et le retire à l'arrêt", async () => {
    frise();
    const arreter = demarrerTrait();
    const calque = document.querySelector<HTMLElement>(".trait-calque")!;
    expect(calque.getAttribute("aria-hidden")).toBe("true");
    await new Promise((fin) => requestAnimationFrame(fin));
    expect(calque.hidden).toBe(true);
    arreter();
    expect(document.querySelector(".trait-calque")).toBeNull();
  });

  it("prend la main sur une Méthode qui attend son allumage, et la rend à l'arrêt", () => {
    const f = frise();
    const arreter = demarrerTrait();
    expect(f.hasAttribute("data-trait")).toBe(true);
    arreter();
    expect(f.hasAttribute("data-trait")).toBe(false);
  });

  it("laisse une Méthode déjà allumée telle quelle", () => {
    const f = frise({ allumee: true });
    const arreter = demarrerTrait();
    expect(f.hasAttribute("data-trait")).toBe(false);
    arreter();
  });

  it("se cache pendant l'intro", async () => {
    frise();
    const fond = document.querySelector(".fond-accueil")!;
    fond.setAttribute("data-intro", "en-cours");
    const arreter = demarrerTrait();
    const calque = document.querySelector<HTMLElement>(".trait-calque")!;
    expect(calque.style.opacity).toBe("0");
    fond.setAttribute("data-intro", "terminee");
    await Promise.resolve();
    expect(calque.style.opacity).toBe("");
    arreter();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { allerAAncre, brancherDefilement, remonterEnHaut } from "./defilement";

const moteur = { scrollTo: vi.fn() };

beforeEach(() => {
  document.body.innerHTML = '<section id="offre" style="scroll-margin-top: 32px"></section>';
  window.history.replaceState(null, "", "/?pour=boulangerie-k7f3");
  moteur.scrollTo.mockReset();
});
afterEach(() => {
  brancherDefilement(null);
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

describe("allerAAncre", () => {
  it("sans défilement doux : change le hash, recherche gardée (le navigateur défile)", () => {
    allerAAncre("#offre");
    expect(window.location.search).toBe("?pour=boulangerie-k7f3");
    expect(window.location.hash).toBe("#offre");
  });

  it("sans défilement doux, déjà sur l'ancre : y revient", () => {
    window.location.hash = "#offre";
    // jsdom ne défile pas : `scrollIntoView` n'y existe pas.
    const vers = vi.fn();
    document.getElementById("offre")!.scrollIntoView = vers;
    allerAAncre("#offre");
    expect(vers).toHaveBeenCalledTimes(1);
  });

  it("avec le défilement doux : glisse jusqu'à la section (Lenis lit sa marge de défilement) et note l'ancre", () => {
    brancherDefilement(moteur);
    allerAAncre("#offre");
    expect(moteur.scrollTo).toHaveBeenCalledWith(document.getElementById("offre"));
    expect(window.location.search).toBe("?pour=boulangerie-k7f3");
    expect(window.location.hash).toBe("#offre");
  });

  it("ancre absente : ne glisse pas, le navigateur garde la main", () => {
    brancherDefilement(moteur);
    allerAAncre("#inconnue");
    expect(moteur.scrollTo).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#inconnue");
  });
});

describe("remonterEnHaut", () => {
  it("passe par le défilement doux quand il est actif, d'un coup", () => {
    brancherDefilement(moteur);
    remonterEnHaut();
    expect(moteur.scrollTo).toHaveBeenCalledWith(0, { immediate: true });
  });

  it("sinon, défile la fenêtre d'un coup", () => {
    const defiler = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    remonterEnHaut();
    expect(defiler).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
  });
});

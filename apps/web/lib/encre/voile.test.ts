import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLE_INTRO_VUE } from "./decision";
import { ATTRIBUT_VOILE, DELAI_SECURITE_VOILE_MS, SCRIPT_VOILE, leverVoile } from "./voile";

const racine = document.documentElement;

function navigateur({ mouvementReduit = false, webgl2 = true } = {}) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce") ? mouvementReduit : false }));
  if (webgl2) vi.stubGlobal("WebGL2RenderingContext", class {});
  else vi.stubGlobal("WebGL2RenderingContext", undefined);
}

/** Exécute le script de tête comme le navigateur, à l'adresse donnée. */
function executer(adresse = "/") {
  window.history.replaceState(null, "", adresse);
  new Function(SCRIPT_VOILE)();
}

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
  racine.removeAttribute(ATTRIBUT_VOILE);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("voile de l'intro (script de tête)", () => {
  it("couvre l'accueil quand l'intro va se jouer", () => {
    navigateur();
    executer("/");
    expect(racine.hasAttribute(ATTRIBUT_VOILE)).toBe(true);
  });

  it("couvre aussi l'accueil personnalisé d'un prospect", () => {
    navigateur();
    executer("/?pour=exemple-0000");
    expect(racine.hasAttribute(ATTRIBUT_VOILE)).toBe(true);
    racine.removeAttribute(ATTRIBUT_VOILE);
    executer("/pour/exemple-0000");
    expect(racine.hasAttribute(ATTRIBUT_VOILE)).toBe(true);
  });

  it("ne couvre rien quand l'intro ne se jouera pas", () => {
    for (const [cas, preparer, adresse] of [
      ["mouvement réduit", () => navigateur({ mouvementReduit: true }), "/"],
      ["sans WebGL2", () => navigateur({ webgl2: false }), "/"],
      ["déjà vue", () => (navigateur(), window.sessionStorage.setItem(CLE_INTRO_VUE, "1")), "/"],
      ["avec une ancre", () => navigateur(), "/#contact"],
      ["autre page", () => navigateur(), "/realisations"],
    ] as const) {
      window.sessionStorage.clear();
      preparer();
      executer(adresse);
      expect(racine.hasAttribute(ATTRIBUT_VOILE), cas).toBe(false);
    }
  });

  it("se lève de lui-même au bout du délai de sécurité", () => {
    navigateur();
    executer("/");
    vi.advanceTimersByTime(DELAI_SECURITE_VOILE_MS - 1);
    expect(racine.hasAttribute(ATTRIBUT_VOILE)).toBe(true);
    vi.advanceTimersByTime(1);
    expect(racine.hasAttribute(ATTRIBUT_VOILE)).toBe(false);
  });

  it("couvre quand même si le stockage est illisible (l'intro se jouera)", () => {
    navigateur();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("refusé");
    });
    executer("/");
    expect(racine.hasAttribute(ATTRIBUT_VOILE)).toBe(true);
  });

  it("leverVoile retire le voile", () => {
    racine.setAttribute(ATTRIBUT_VOILE, "");
    leverVoile();
    expect(racine.hasAttribute(ATTRIBUT_VOILE)).toBe(false);
  });
});

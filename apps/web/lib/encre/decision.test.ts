import { afterEach, describe, it, expect } from "vitest";
import {
  CLE_INTRO_VUE,
  deciderMode,
  introDejaVue,
  marquerIntroVue,
  stockageSession,
  type Contexte,
} from "./decision";

const base: Contexte = { mouvementReduit: false, webgl2: true, dejaVu: false, defilee: false };

describe("deciderMode", () => {
  it("joue l'intro à la première visite, en haut de page", () => {
    expect(deciderMode(base)).toBe("intro");
  });

  it("passe directement au halo animé à la visite suivante", () => {
    expect(deciderMode({ ...base, dejaVu: true })).toBe("halo-anime");
  });

  // Review Focus 1 : rechargement en milieu de page, défilement restauré.
  it("ne joue pas l'intro si la page est déjà défilée", () => {
    expect(deciderMode({ ...base, defilee: true })).toBe("halo-anime");
  });

  it("se contente du halo CSS avec le mouvement réduit, même à la première visite", () => {
    expect(deciderMode({ ...base, mouvementReduit: true })).toBe("halo-css");
  });

  it("se contente du halo CSS sans WebGL2", () => {
    expect(deciderMode({ ...base, webgl2: false, dejaVu: true })).toBe("halo-css");
  });
});

describe("drapeau « intro déjà vue »", () => {
  const descripteur = Object.getOwnPropertyDescriptor(window, "sessionStorage");

  afterEach(() => {
    if (descripteur) Object.defineProperty(window, "sessionStorage", descripteur);
    else delete (window as { sessionStorage?: Storage }).sessionStorage;
    window.sessionStorage.clear();
  });

  it("se lit et s'écrit dans le stockage", () => {
    expect(introDejaVue(window.sessionStorage)).toBe(false);
    marquerIntroVue(window.sessionStorage);
    expect(window.sessionStorage.getItem(CLE_INTRO_VUE)).toBe("1");
    expect(introDejaVue(window.sessionStorage)).toBe(true);
  });

  it("vaut « jamais vue » sans stockage ou si la lecture lève", () => {
    expect(introDejaVue(null)).toBe(false);
    const refus = {
      getItem: () => {
        throw new DOMException("refusé", "SecurityError");
      },
    };
    expect(introDejaVue(refus)).toBe(false);
  });

  it("n'échoue pas si l'écriture lève", () => {
    const plein = {
      setItem: () => {
        throw new DOMException("plein", "QuotaExceededError");
      },
    };
    expect(() => marquerIntroVue(plein)).not.toThrow();
    expect(() => marquerIntroVue(null)).not.toThrow();
  });

  it("renvoie null quand l'accès même au stockage lève (navigation privée stricte)", () => {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get() {
        throw new DOMException("refusé", "SecurityError");
      },
    });
    expect(stockageSession()).toBeNull();
  });
});

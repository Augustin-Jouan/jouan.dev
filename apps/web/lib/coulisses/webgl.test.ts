import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { oublierWebgl, renduAuProcesseur, webglDisponible } from "./webgl";

beforeEach(() => oublierWebgl());
afterEach(() => vi.restoreAllMocks());

describe("webglDisponible", () => {
  it("exige WebGL 2, comme Three.js : WebGL 1 seul ne suffit pas", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((type: string) => (type === "webgl" ? {} : null)) as never);
    expect(webglDisponible()).toBe(false);
  });

  it("libère aussitôt le contexte d'essai", () => {
    const loseContext = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ getExtension: () => ({ loseContext }) } as never);
    expect(webglDisponible()).toBe(true);
    expect(loseContext).toHaveBeenCalled();
  });
});

describe("renduAuProcesseur", () => {
  /** Contexte d'essai dont le moteur de rendu s'appelle `nom` (dans RENDERER, ou par l'extension comme Chrome). */
  function moteur(nom: string, { parExtension = false } = {}) {
    const RENDERER = 0x1f01;
    const NON_MASQUE = 0x9246;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      RENDERER,
      getParameter: (p: number) => (p === RENDERER ? (parExtension ? "WebKit WebGL" : nom) : p === NON_MASQUE ? nom : null),
      getExtension: (e: string) =>
        e === "WEBGL_debug_renderer_info" ? { UNMASKED_RENDERER_WEBGL: NON_MASQUE } : { loseContext: () => {} },
    } as never);
  }

  it("reconnaît les pilotes qui dessinent au processeur", () => {
    for (const nom of ["Google SwiftShader", "llvmpipe (LLVM 15.0.7, 256 bits)", "Microsoft Basic Render Driver"]) {
      oublierWebgl();
      moteur(nom);
      expect(renduAuProcesseur(), nom).toBe(true);
    }
  });

  it("lit le nom par l'extension quand le navigateur le masque (Chrome)", () => {
    moteur("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)", { parExtension: true });
    expect(renduAuProcesseur()).toBe(true);
  });

  it("carte graphique, nom illisible ou pas de WebGL : pas de rendu au processeur", () => {
    moteur("ANGLE (Intel, Mesa Intel(R) UHD Graphics 620, OpenGL 4.6)");
    expect(renduAuProcesseur()).toBe(false);
    oublierWebgl();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as never);
    expect(renduAuProcesseur()).toBe(false);
    oublierWebgl();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(renduAuProcesseur()).toBe(false);
  });
});

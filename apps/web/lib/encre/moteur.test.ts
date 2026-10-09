import { afterEach, describe, it, expect, vi } from "vitest";
import { creerMoteur, estRenduLogiciel, nomDuRendu, tailleRendu } from "./moteur";

afterEach(() => vi.restoreAllMocks());

describe("creerMoteur", () => {
  it("signale l'absence de WebGL2 et renvoie null", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const surEchec = vi.fn();
    const moteur = creerMoteur({
      canvas: document.createElement("canvas"),
      intro: true,
      tactile: false,
      surEchec,
    });
    expect(moteur).toBeNull();
    expect(surEchec).toHaveBeenCalledWith("webgl2-indisponible");
  });

  it("refuse un rendu WebGL logiciel (sans carte graphique) et libère le contexte", () => {
    const loseContext = vi.fn();
    const gl = {
      RENDERER: 0x1f01,
      // Chrome masque le nom du moteur de rendu derrière RENDERER…
      getParameter: (p: number) => (p === 0x1f01 ? "WebKit WebGL" : p === 0x9246 ? "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)" : null),
      getExtension: (nom: string) =>
        nom === "WEBGL_debug_renderer_info" ? { UNMASKED_RENDERER_WEBGL: 0x9246 } : nom === "WEBGL_lose_context" ? { loseContext } : null,
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl as unknown as WebGL2RenderingContext);
    const surEchec = vi.fn();
    const moteur = creerMoteur({ canvas: document.createElement("canvas"), intro: true, tactile: false, surEchec });
    expect(moteur).toBeNull();
    expect(surEchec).toHaveBeenCalledWith("rendu-logiciel");
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it.each([
    ["SwiftShader (Chrome)", "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)", true],
    ["llvmpipe (Mesa)", "llvmpipe (LLVM 15.0.7, 256 bits)", true],
    ["softpipe (Mesa)", "softpipe", true],
    ["pilote de base de Windows", "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11)", true],
    ["une carte Intel", "ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2), OpenGL 4.6)", false],
    ["un GPU Apple", "Apple GPU", false],
  ])("reconnaît %s", (_cas, nom, logiciel) => {
    expect(estRenduLogiciel(nom)).toBe(logiciel);
  });

  it("lit le nom du moteur de rendu sans l'extension quand RENDERER le donne déjà (Firefox)", () => {
    const getExtension = vi.fn();
    const gl = { RENDERER: 0x1f01, getParameter: () => "llvmpipe (LLVM 15.0.7, 256 bits)", getExtension };
    expect(nomDuRendu(gl as unknown as WebGL2RenderingContext)).toBe("llvmpipe (LLVM 15.0.7, 256 bits)");
    // Firefox avertit dans la console quand on demande cette extension, devenue inutile.
    expect(getExtension).not.toHaveBeenCalledWith("WEBGL_debug_renderer_info");
  });

  it("libère le contexte WebGL à l'arrêt, sans le signaler comme un échec", () => {
    const loseContext = vi.fn();
    // Faux contexte : chaque appel réussit ; seuls ceux qui comptent sont fixés.
    const fixes: Record<string, unknown> = {
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      isContextLost: () => false,
      getExtension: (nom: string) => (nom === "WEBGL_lose_context" ? { loseContext } : null),
    };
    const gl = new Proxy(fixes, { get: (cible, cle: string) => cible[cle] ?? (() => ({})) });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl as unknown as WebGL2RenderingContext);
    const surEchec = vi.fn();
    const moteur = creerMoteur({
      canvas: document.createElement("canvas"),
      intro: true,
      tactile: false,
      surEchec,
    });
    expect(moteur).not.toBeNull();
    moteur!.arreter();
    expect(loseContext).toHaveBeenCalledOnce();
    expect(surEchec).not.toHaveBeenCalled();
  });
});

describe("tailleRendu", () => {
  it("dessine à demi-résolution CSS, quelle que soit la densité de l'écran", () => {
    // Le shader tourne pour chaque pixel : sans carte graphique (rendu
    // logiciel), la pleine résolution bloque le fil principal à chaque image.
    expect(tailleRendu(1440, 900)).toEqual({ largeur: 720, hauteur: 450 });
    expect(tailleRendu(375, 667)).toEqual({ largeur: 188, hauteur: 334 });
  });

  it("garde au moins un pixel", () => {
    expect(tailleRendu(0, 0)).toEqual({ largeur: 1, hauteur: 1 });
  });
});

import { afterEach, describe, it, expect, vi } from "vitest";
import { creerMoteur, estRenduLogiciel, nomDuRendu, tailleRendu } from "./moteur";
import { semerTraits } from "./nuage";

afterEach(() => vi.restoreAllMocks());

describe("creerMoteur", () => {
  it("signale l'absence de WebGL2 et renvoie null", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const surEchec = vi.fn();
    const moteur = creerMoteur({
      canvas: document.createElement("canvas"),
      intro: true,
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
    const moteur = creerMoteur({ canvas: document.createElement("canvas"), intro: true, surEchec });
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
      surEchec,
    });
    expect(moteur).not.toBeNull();
    moteur!.arreter();
    expect(loseContext).toHaveBeenCalledOnce();
    expect(surEchec).not.toHaveBeenCalled();
  });
});

describe("tailleRendu", () => {
  it("dessine à la densité de l'écran, pour des traits de 2 px nets", () => {
    expect(tailleRendu(1440, 900, 1)).toEqual({ largeur: 1440, hauteur: 900 });
    expect(tailleRendu(1440, 900, 2)).toEqual({ largeur: 2880, hauteur: 1800 });
  });

  it("plafonne la densité à 2", () => {
    expect(tailleRendu(1440, 900, 3)).toEqual({ largeur: 2880, hauteur: 1800 });
  });

  it("garde au moins un pixel", () => {
    expect(tailleRendu(0, 0)).toEqual({ largeur: 1, hauteur: 1 });
  });
});

describe("dessin du nuage", () => {
  /** Faux contexte qui note les appels de dessin ; tout le reste réussit sans rien faire. */
  function fauxContexte() {
    const appels = { drawArrays: vi.fn(), drawArraysInstanced: vi.fn(), bufferData: vi.fn() };
    const fixes: Record<string, unknown> = {
      ...appels,
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      isContextLost: () => false,
      getExtension: () => null,
    };
    const gl = new Proxy(fixes, { get: (cible, cle: string) => cible[cle] ?? (() => ({})) });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl as unknown as WebGL2RenderingContext);
    return appels;
  }

  function canvasDe(largeur: number, hauteur: number) {
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "clientWidth", { configurable: true, get: () => largeur });
    Object.defineProperty(canvas, "clientHeight", { configurable: true, get: () => hauteur });
    return canvas;
  }

  const image = () => new Promise((resoudre) => requestAnimationFrame(() => resoudre(null)));

  it("sans intro, dessine le nuage posé en un seul appel, un exemplaire par trait, sans goutte", async () => {
    const appels = fauxContexte();
    const moteur = creerMoteur({ canvas: canvasDe(1280, 800), intro: false })!;
    moteur.demarrer();
    await image();
    expect(appels.drawArraysInstanced).toHaveBeenCalledWith(expect.anything(), 0, 6, semerTraits(1280, 800).length);
    expect(appels.drawArrays).not.toHaveBeenCalled();
    moteur.arreter();
  });

  // Relecture finale (I2) : la goutte plein écran (bruit fractal par pixel) ne
  // se calcule pas à la densité de l'écran ; les traits, si.
  it("dessine la goutte de l'intro à densité 1, puis le nuage à la densité de l'écran", async () => {
    fauxContexte();
    vi.stubGlobal("devicePixelRatio", 2);
    const avecIntro = canvasDe(1280, 800);
    const intro = creerMoteur({ canvas: avecIntro, intro: true })!;
    intro.demarrer();
    await image();
    expect(avecIntro.width).toBe(1280);
    intro.arreter();
    const sansIntro = canvasDe(1280, 800);
    const nuage = creerMoteur({ canvas: sansIntro, intro: false })!;
    nuage.demarrer();
    await image();
    expect(sansIntro.width).toBe(2560);
    nuage.arreter();
    vi.unstubAllGlobals();
  });

  // Le voile de l'intro se lève sous la goutte, une fois l'écran couvert.
  it("signale une seule fois que la goutte couvre l'écran, à la fin de l'étalement", () => {
    fauxContexte();
    const images: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (rappel: FrameRequestCallback) => images.push(rappel));
    const surCouvert = vi.fn();
    const moteur = creerMoteur({ canvas: canvasDe(1280, 800), intro: true, surCouvert })!;
    try {
      moteur.demarrer();
      const avancer = (t: number) => images.shift()?.(t);
      avancer(1000);
      avancer(1500);
      expect(surCouvert).not.toHaveBeenCalled();
      avancer(1950);
      expect(surCouvert).toHaveBeenCalledTimes(1);
      avancer(2500);
      expect(surCouvert).toHaveBeenCalledTimes(1);
    } finally {
      moteur.arreter();
      vi.unstubAllGlobals();
    }
  });

  // Review Focus 1 : rotation ou redimensionnement pendant le nuage.
  it("ressème quand la taille change", async () => {
    const appels = fauxContexte();
    let largeur = 1280;
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "clientWidth", { configurable: true, get: () => largeur });
    Object.defineProperty(canvas, "clientHeight", { configurable: true, get: () => 800 });
    const moteur = creerMoteur({ canvas, intro: false })!;
    moteur.demarrer();
    await image();
    largeur = 390;
    moteur.suivrePointeur({ x: 0.5, y: 0.5 });
    await image();
    expect(appels.drawArraysInstanced).toHaveBeenLastCalledWith(expect.anything(), 0, 6, semerTraits(390, 800).length);
    moteur.arreter();
  });
});

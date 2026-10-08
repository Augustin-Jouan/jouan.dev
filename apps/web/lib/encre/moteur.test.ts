import { afterEach, describe, it, expect, vi } from "vitest";
import { creerMoteur } from "./moteur";

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

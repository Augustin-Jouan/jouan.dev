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
});

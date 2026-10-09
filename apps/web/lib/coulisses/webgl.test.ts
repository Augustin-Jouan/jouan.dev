import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { oublierWebgl, webglDisponible } from "./webgl";

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

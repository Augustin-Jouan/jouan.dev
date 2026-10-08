import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";

// Morceau de JS du moteur introuvable (réseau coupé, déploiement en cours) :
// l'import dynamique est rejeté.
vi.mock("@/lib/encre/moteur", () => {
  throw new Error("Morceau du moteur introuvable");
});

import { IntroEncre } from "./IntroEncre";

afterEach(() => vi.unstubAllGlobals());

describe("IntroEncre, import du moteur rejeté", () => {
  it("revient au halo CSS, sans intro ni canvas", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    vi.stubGlobal("WebGL2RenderingContext", class {});
    const { container } = render(<IntroEncre />);
    const fond = container.querySelector(".fond-accueil")!;
    await waitFor(() => expect(fond).toHaveAttribute("data-encre", "repli"));
    expect(fond).toHaveAttribute("data-mode", "halo-css");
    expect(fond).not.toHaveAttribute("data-intro");
    expect(container.querySelector("canvas")).toBeNull();
  });
});

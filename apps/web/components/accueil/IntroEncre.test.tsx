import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import type { OptionsMoteur } from "@/lib/encre/moteur";
import { CLE_INTRO_VUE } from "@/lib/encre/decision";

const { creerMoteur, moteur } = vi.hoisted(() => ({
  creerMoteur: vi.fn(),
  moteur: { demarrer: vi.fn(), sauter: vi.fn(), suivreSouris: vi.fn(), arreter: vi.fn() },
}));
vi.mock("@/lib/encre/moteur", () => ({ creerMoteur }));

import { IntroEncre } from "./IntroEncre";

function navigateur({ mouvementReduit = false, webgl2 = true } = {}) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce") ? mouvementReduit : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
  if (webgl2) vi.stubGlobal("WebGL2RenderingContext", class {});
}

const fond = (container: HTMLElement) => container.querySelector(".fond-accueil")!;
const options = (): OptionsMoteur => creerMoteur.mock.calls[0][0];

beforeEach(() => {
  window.localStorage.clear();
  creerMoteur.mockReset();
  creerMoteur.mockImplementation(() => moteur);
  Object.values(moteur).forEach((fn) => fn.mockReset());
});

afterEach(() => vi.unstubAllGlobals());

describe("IntroEncre", () => {
  it("se contente du halo CSS avec le mouvement réduit, sans charger le moteur", async () => {
    navigateur({ mouvementReduit: true });
    const { container } = render(<IntroEncre />);
    await act(async () => {});
    expect(fond(container)).toHaveAttribute("data-mode", "halo-css");
    expect(container.querySelector("canvas")).toBeNull();
    expect(creerMoteur).not.toHaveBeenCalled();
  });

  it("joue l'intro à la première visite et la marque comme vue", async () => {
    navigateur();
    const { container } = render(<IntroEncre />);
    await waitFor(() => expect(creerMoteur).toHaveBeenCalled());
    expect(options()).toMatchObject({ intro: true, tactile: false });
    expect(moteur.demarrer).toHaveBeenCalled();
    expect(fond(container)).toHaveAttribute("data-mode", "intro");

    act(() => options().surPret?.());
    expect(fond(container)).toHaveAttribute("data-intro", "en-cours");
    expect(fond(container)).toHaveAttribute("data-encre", "actif");

    act(() => options().surFinIntro?.());
    expect(fond(container)).toHaveAttribute("data-intro", "terminee");
    expect(window.localStorage.getItem(CLE_INTRO_VUE)).toBe("1");
  });

  it("passe l'intro au premier clic", async () => {
    navigateur();
    render(<IntroEncre />);
    await waitFor(() => expect(moteur.demarrer).toHaveBeenCalled());
    fireEvent.pointerDown(window);
    expect(moteur.sauter).toHaveBeenCalled();
  });

  it("pose directement le halo animé quand l'intro a déjà été vue", async () => {
    navigateur();
    window.localStorage.setItem(CLE_INTRO_VUE, "1");
    const { container } = render(<IntroEncre />);
    await waitFor(() => expect(creerMoteur).toHaveBeenCalled());
    expect(options()).toMatchObject({ intro: false });
    expect(fond(container)).toHaveAttribute("data-mode", "halo-anime");
  });

  it("revient au halo CSS quand le moteur échoue", async () => {
    navigateur();
    creerMoteur.mockImplementation((o: OptionsMoteur) => {
      o.surEchec?.("shader");
      return null;
    });
    const { container } = render(<IntroEncre />);
    await waitFor(() => expect(fond(container)).toHaveAttribute("data-encre", "repli"));
    expect(fond(container)).toHaveAttribute("data-mode", "halo-css");
    expect(fond(container)).not.toHaveAttribute("data-intro");
  });
});

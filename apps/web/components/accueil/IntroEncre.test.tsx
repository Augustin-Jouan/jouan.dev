import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import type { OptionsMoteur } from "@/lib/encre/moteur";
import { EVENEMENT_REJOUER_INTRO } from "@/lib/commandes/evenements";
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
  window.sessionStorage.clear();
  creerMoteur.mockReset();
  creerMoteur.mockImplementation(() => moteur);
  Object.values(moteur).forEach((fn) => fn.mockReset());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  defiler(0);
});

/** Position de défilement vue par le composant (jsdom ne défile pas). */
function defiler(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
}

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
    expect(window.sessionStorage.getItem(CLE_INTRO_VUE)).toBe("1");
  });

  it("affiche le nom et, dessous, le métier, qui apparaissent et s'effacent ensemble", async () => {
    navigateur();
    const { container } = render(<IntroEncre />);
    await waitFor(() => expect(creerMoteur).toHaveBeenCalled());
    const nom = options().nom!;
    expect(nom).toBe(container.querySelector(".fond-accueil__nom"));
    expect(nom.firstChild?.textContent).toBe("Augustin Jouan");
    expect(nom.querySelector(".fond-accueil__metier")).toHaveTextContent("Développeur full stack");
  });

  it("ne ramène jamais l'intro en arrière si elle se termine avant la première image", async () => {
    navigateur();
    const { container } = render(<IntroEncre />);
    await waitFor(() => expect(creerMoteur).toHaveBeenCalled());
    act(() => options().surFinIntro?.());
    act(() => options().surPret?.());
    expect(fond(container)).toHaveAttribute("data-intro", "terminee");
  });

  it("passe l'intro au premier clic", async () => {
    navigateur();
    render(<IntroEncre />);
    await waitFor(() => expect(moteur.demarrer).toHaveBeenCalled());
    fireEvent.pointerDown(window);
    expect(moteur.sauter).toHaveBeenCalled();
  });

  it("pose directement le halo animé quand l'intro a déjà été vue dans cet onglet", async () => {
    navigateur();
    window.sessionStorage.setItem(CLE_INTRO_VUE, "1");
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

  // Revue finale, Important 1 : le moteur arrive après un import dynamique ;
  // un geste fait pendant ce délai ne doit pas être perdu.
  describe("geste fait avant l'arrivée du moteur", () => {
    it("un clic avant l'arrivée du moteur annule l'intro", async () => {
      navigateur();
      const { container } = render(<IntroEncre />);
      fireEvent.pointerDown(window);
      await waitFor(() => expect(creerMoteur).toHaveBeenCalled());
      expect(options()).toMatchObject({ intro: false });

      act(() => options().surPret?.());
      expect(fond(container)).toHaveAttribute("data-intro", "terminee");
      expect(fond(container)).toHaveAttribute("data-encre", "actif");
    });

    it("un défilement compte comme un geste (glisser de la barre de défilement)", async () => {
      navigateur();
      const { container } = render(<IntroEncre />);
      fireEvent.scroll(window);
      await waitFor(() => expect(creerMoteur).toHaveBeenCalled());
      expect(options()).toMatchObject({ intro: false });
      act(() => options().surPret?.());
      expect(fond(container)).not.toHaveAttribute("data-intro", "en-cours");
    });

    it("ne joue pas l'intro si la page a défilé avant l'arrivée du moteur", async () => {
      navigateur();
      const { container } = render(<IntroEncre />);
      defiler(600);
      await waitFor(() => expect(creerMoteur).toHaveBeenCalled());
      expect(options()).toMatchObject({ intro: false });
      act(() => options().surPret?.());
      expect(fond(container)).not.toHaveAttribute("data-intro", "en-cours");
    });

    it("ne joue pas l'intro si le moteur arrive trop tard après l'affichage", async () => {
      navigateur();
      let maintenant = 1000;
      vi.spyOn(performance, "now").mockImplementation(() => maintenant);
      const { container } = render(<IntroEncre />);
      maintenant += 5000;
      await waitFor(() => expect(creerMoteur).toHaveBeenCalled());
      expect(options()).toMatchObject({ intro: false });
      act(() => options().surPret?.());
      expect(fond(container)).not.toHaveAttribute("data-intro", "en-cours");
    });

    it("joue l'intro quand le moteur arrive à temps, page en haut, sans geste", async () => {
      navigateur();
      let maintenant = 1000;
      vi.spyOn(performance, "now").mockImplementation(() => maintenant);
      render(<IntroEncre />);
      maintenant += 1000;
      await waitFor(() => expect(creerMoteur).toHaveBeenCalled());
      expect(options()).toMatchObject({ intro: true });
    });
  });

  // Revue finale, Minor 5 : cycle de vie et échecs.
  describe("cycle de vie", () => {
    it("ne crée pas le moteur si le composant est démonté pendant le chargement", async () => {
      navigateur();
      const { unmount } = render(<IntroEncre />);
      unmount();
      await act(async () => {});
      await new Promise((resoudre) => setTimeout(resoudre, 0));
      expect(creerMoteur).not.toHaveBeenCalled();
    });

    it("arrête le moteur et retire les écouteurs au démontage pendant l'intro", async () => {
      navigateur();
      const { unmount } = render(<IntroEncre />);
      await waitFor(() => expect(moteur.demarrer).toHaveBeenCalled());
      unmount();
      expect(moteur.arreter).toHaveBeenCalled();
      fireEvent.pointerDown(window);
      fireEvent.pointerMove(window);
      expect(moteur.sauter).not.toHaveBeenCalled();
      expect(moteur.suivreSouris).not.toHaveBeenCalled();
    });

    it("revient au halo CSS quand le moteur échoue après la première image", async () => {
      navigateur();
      const { container } = render(<IntroEncre />);
      await waitFor(() => expect(creerMoteur).toHaveBeenCalled());
      act(() => options().surPret?.());
      expect(fond(container)).toHaveAttribute("data-intro", "en-cours");

      act(() => options().surEchec?.("contexte-perdu"));
      expect(moteur.arreter).toHaveBeenCalled();
      expect(fond(container)).toHaveAttribute("data-encre", "repli");
      expect(fond(container)).toHaveAttribute("data-mode", "halo-css");
      expect(fond(container)).not.toHaveAttribute("data-intro");
      expect(container.querySelector("canvas")).toBeNull();
    });
  });

  it("« Rejouer l'intro » : retour en haut, puis l'intro repart sur un canvas neuf", async () => {
    navigateur();
    const defilerVers = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { container } = render(<IntroEncre />);
    await waitFor(() => expect(creerMoteur).toHaveBeenCalledTimes(1));
    act(() => options().surFinIntro?.());
    const ancien = container.querySelector("canvas");

    act(() => void window.dispatchEvent(new Event(EVENEMENT_REJOUER_INTRO)));
    expect(defilerVers).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
    await waitFor(() => expect(creerMoteur).toHaveBeenCalledTimes(2));
    expect(moteur.arreter).toHaveBeenCalled();
    expect(creerMoteur.mock.calls[1][0]).toMatchObject({ intro: true });
    expect(container.querySelector("canvas")).not.toBe(ancien);
    expect(fond(container)).toHaveAttribute("data-mode", "intro");
    expect(fond(container)).not.toHaveAttribute("data-intro");
  });

  it("ne rejoue rien avec le mouvement réduit", async () => {
    navigateur({ mouvementReduit: true });
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { container } = render(<IntroEncre />);
    await act(async () => {});
    await act(async () => {
      window.dispatchEvent(new Event(EVENEMENT_REJOUER_INTRO));
      await new Promise((fin) => requestAnimationFrame(() => fin(undefined)));
    });
    expect(fond(container)).toHaveAttribute("data-mode", "halo-css");
    expect(creerMoteur).not.toHaveBeenCalled();
  });
});

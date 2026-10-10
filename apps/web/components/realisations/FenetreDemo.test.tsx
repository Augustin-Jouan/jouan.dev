import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FenetreDemo, SOURCE_DEMO } from "./FenetreDemo";

const apercu = { src: "/apercu.webp", alt: "Aperçu de la démo", largeur: 1280, hauteur: 720 };

let declencher: (visible: boolean) => void = () => {};

class ObservateurFactice {
  constructor(private rappel: (entrees: { isIntersecting: boolean }[]) => void) {
    declencher = (visible) => this.rappel([{ isIntersecting: visible }]);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

function simulerEcran(large: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: large,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe("FenetreDemo", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", ObservateurFactice);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("charge l'iframe quand la fenêtre approche sur un grand écran", () => {
    simulerEcran(true);
    render(<FenetreDemo apercu={apercu} />);
    expect(screen.queryByTitle("Démo interactive : suivi de marchés de travaux")).toBeNull();
    expect(screen.getByAltText(apercu.alt)).toBeInTheDocument();
    act(() => declencher(true));
    const iframe = screen.getByTitle("Démo interactive : suivi de marchés de travaux");
    expect(iframe).toHaveAttribute("src", SOURCE_DEMO);
    expect(SOURCE_DEMO).toContain("?theme=sombre");
    // Invisible jusqu'à son chargement : pas d'éclair clair avant le passage en sombre.
    expect(iframe).toHaveClass("opacity-0");
    fireEvent.load(iframe);
    expect(iframe).toHaveClass("opacity-100");
    expect(screen.queryByAltText(apercu.alt)).toBeNull();
  });

  it("garde l'aperçu sur un petit écran et propose le plein écran", () => {
    simulerEcran(false);
    render(<FenetreDemo apercu={apercu} />);
    act(() => declencher(true));
    expect(screen.queryByTitle("Démo interactive : suivi de marchés de travaux")).toBeNull();
    expect(screen.getByAltText(apercu.alt)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Ouvrir la démo en plein écran\s*\(nouvel onglet\)$/ })).toHaveAttribute(
      "href",
      SOURCE_DEMO,
    );
  });

  it("annonce des données fictives, oubliées à la fermeture de l'onglet", () => {
    simulerEcran(true);
    render(<FenetreDemo apercu={apercu} />);
    expect(
      screen.getByText("Chantiers, entreprises et montants fictifs. Vos modifications sont oubliées à la fermeture de l'onglet."),
    ).toBeInTheDocument();
  });
});

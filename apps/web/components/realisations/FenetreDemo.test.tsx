import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Demo } from "@/data/realisations";
import { FenetreDemo } from "./FenetreDemo";

const apercu = { src: "/apercu.webp", alt: "Aperçu de la démo", largeur: 1280, hauteur: 720 };
const demo: Demo = {
  source: "/demo/essai/index.html?theme=sombre",
  barre: "Essai — démo",
  titre: "Démo interactive : essai",
  legende: "Données fictives.",
  apercu,
};

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
    render(<FenetreDemo demo={demo} />);
    expect(screen.queryByTitle("Démo interactive : essai")).toBeNull();
    expect(screen.getByAltText(apercu.alt)).toBeInTheDocument();
    act(() => declencher(true));
    const iframe = screen.getByTitle("Démo interactive : essai");
    expect(iframe).toHaveAttribute("src", demo.source);
    // Invisible jusqu'à son chargement : pas d'éclair clair avant le passage en sombre.
    expect(iframe).toHaveClass("opacity-0");
    fireEvent.load(iframe);
    expect(iframe).toHaveClass("opacity-100");
    expect(screen.queryByAltText(apercu.alt)).toBeNull();
  });

  it("garde l'aperçu sur un petit écran et propose le plein écran", () => {
    simulerEcran(false);
    render(<FenetreDemo demo={demo} />);
    act(() => declencher(true));
    expect(screen.queryByTitle("Démo interactive : essai")).toBeNull();
    expect(screen.getByAltText(apercu.alt)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Ouvrir la démo en plein écran\s*\(nouvel onglet\)$/ })).toHaveAttribute(
      "href",
      demo.source,
    );
  });

  it("affiche la barre et la légende de sa démo", () => {
    simulerEcran(true);
    render(<FenetreDemo demo={demo} />);
    expect(screen.getByText("Essai — démo")).toBeInTheDocument();
    expect(screen.getByText("Données fictives.")).toBeInTheDocument();
  });

  it("sous 768 px, une note conseille l'ordinateur ; l'astérisque du bouton ne change pas son nom", () => {
    simulerEcran(false);
    render(<FenetreDemo demo={demo} />);
    const note = screen.getByText("* Pour tester la démo, mieux vaut visiter le site sur un ordinateur.");
    expect(note).toHaveClass("md:hidden");
    expect(screen.getByRole("link", { name: /Ouvrir la démo/ })).toHaveAccessibleName(/^Ouvrir la démo en plein écran\s*\(nouvel onglet\)$/);
  });
});

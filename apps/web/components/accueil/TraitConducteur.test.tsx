import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const charge = vi.hoisted(() => ({ demarre: 0, arrete: 0 }));
vi.mock("@/lib/trait/trait-conducteur", () => ({
  demarrerTrait: () => {
    charge.demarre++;
    return () => {
      charge.arrete++;
    };
  },
}));

import { TraitConducteur } from "./TraitConducteur";

/** `matchMedia` factice ; `changer(true)` simule le passage au mouvement réduit pendant la visite. */
function medias(reduit: boolean) {
  const ecouteurs = new Set<() => void>();
  const requete = { matches: reduit, media: "(prefers-reduced-motion: reduce)" };
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return requete.matches;
    },
    media: requete.media,
    addEventListener: (_: string, f: () => void) => ecouteurs.add(f),
    removeEventListener: (_: string, f: () => void) => ecouteurs.delete(f),
  }));
  return {
    changer(valeur: boolean) {
      requete.matches = valeur;
      act(() => ecouteurs.forEach((f) => f()));
    },
  };
}

function defiler(y: number) {
  vi.stubGlobal("scrollY", y);
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

async function attendreTempsLibre() {
  await act(async () => {
    vi.advanceTimersByTime(1_500);
    await vi.dynamicImportSettled();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("scrollY", 0);
  charge.demarre = 0;
  charge.arrete = 0;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("TraitConducteur", () => {
  it("ne charge rien tant qu'on n'a pas défilé, démarre au premier défilement, et s'arrête au démontage", async () => {
    medias(false);
    const { container, unmount } = render(<TraitConducteur />);
    expect(container.innerHTML).toBe("");
    await attendreTempsLibre();
    expect(charge.demarre).toBe(0);
    defiler(40);
    await attendreTempsLibre();
    expect(charge.demarre).toBe(1);
    defiler(400);
    await attendreTempsLibre();
    expect(charge.demarre).toBe(1);
    unmount();
    expect(charge.arrete).toBe(1);
  });

  it("page déjà défilée à l'affichage (lien vers #contact, défilement restauré) : démarre sans attendre", async () => {
    medias(false);
    vi.stubGlobal("scrollY", 3_000);
    render(<TraitConducteur />);
    await attendreTempsLibre();
    expect(charge.demarre).toBe(1);
  });

  it("mouvement réduit : rien n'est chargé, même en défilant", async () => {
    medias(true);
    render(<TraitConducteur />);
    defiler(400);
    await attendreTempsLibre();
    expect(charge.demarre).toBe(0);
  });

  it("passage au mouvement réduit pendant la visite : le trait s'arrête", async () => {
    const { changer } = medias(false);
    render(<TraitConducteur />);
    defiler(40);
    await attendreTempsLibre();
    expect(charge.demarre).toBe(1);
    changer(true);
    expect(charge.arrete).toBe(1);
  });
});

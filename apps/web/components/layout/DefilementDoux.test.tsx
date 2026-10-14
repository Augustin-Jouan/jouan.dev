import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const charge = vi.hoisted(() => ({ demarre: 0, arrete: 0 }));
vi.mock("@/lib/defilement-lenis", () => ({
  demarrerDefilement: () => {
    charge.demarre++;
    return () => {
      charge.arrete++;
    };
  },
}));

import { DefilementDoux } from "./DefilementDoux";

function medias(correspondances: Record<string, boolean>) {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: correspondances[q] ?? false, media: q, addEventListener() {}, removeEventListener() {} }));
}

async function attendreTempsLibre() {
  await act(async () => {
    vi.advanceTimersByTime(1_500);
    await vi.dynamicImportSettled();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  charge.demarre = 0;
  charge.arrete = 0;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("DefilementDoux", () => {
  it("avec une souris, démarre le défilement doux après l'affichage, et l'arrête au démontage", async () => {
    medias({});
    const { unmount } = render(<DefilementDoux />);
    expect(charge.demarre).toBe(0);
    await attendreTempsLibre();
    expect(charge.demarre).toBe(1);
    unmount();
    expect(charge.arrete).toBe(1);
  });

  it("mouvement réduit : rien n'est chargé", async () => {
    medias({ "(prefers-reduced-motion: reduce)": true });
    render(<DefilementDoux />);
    await attendreTempsLibre();
    expect(charge.demarre).toBe(0);
  });

  it("écran tactile seul (téléphone) : rien n'est chargé, le défilement natif y est déjà fluide", async () => {
    medias({ "(hover: none) and (pointer: coarse)": true });
    render(<DefilementDoux />);
    await attendreTempsLibre();
    expect(charge.demarre).toBe(0);
  });
});

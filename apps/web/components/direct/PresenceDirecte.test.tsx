import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MessageServeur } from "@/lib/direct/protocole";

const fausse = vi.hoisted(() => ({
  rappels: null as null | { surMessage(m: MessageServeur): void; surFermeture(): void },
  envoyer: vi.fn(),
  construite: 0,
}));
vi.mock("@/lib/direct/connexion", () => ({
  MARQUEUR_DIRECT: "connexion-direct:v1",
  ConnexionDirecte: class {
    constructor(_url: string, rappels: typeof fausse.rappels) {
      fausse.rappels = rappels;
      fausse.construite++;
    }
    ouvrir() {}
    envoyer = fausse.envoyer;
    surVisibilite() {}
    arreter() {}
  },
}));

import { CompteurPresents } from "./CompteurPresents";
import { PresenceDirecte } from "./PresenceDirecte";

function pointeur(fin: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: fin && q === "(pointer: fine)",
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function rendre() {
  render(
    <PresenceDirecte>
      <section data-direct-section="accroche">
        <CompteurPresents />
        <p>Accroche</p>
      </section>
    </PresenceDirecte>,
  );
}

/** Temps libre écoulé, puis module de connexion chargé (import différé). */
async function demarrer() {
  await act(async () => {
    vi.advanceTimersByTime(1_500);
    await vi.dynamicImportSettled();
  });
}

const recevoir = (m: MessageServeur) =>
  act(() => {
    fausse.rappels!.surMessage(m);
  });

const bienvenue = (presents: number): MessageServeur => ({ type: "bienvenue", id: "moi", couleur: "#c84a1f", presents, curseurs: [] });

beforeEach(() => {
  vi.useFakeTimers();
  fausse.rappels = null;
  fausse.construite = 0;
  fausse.envoyer.mockReset();
  window.localStorage.clear();
  pointeur(true);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 800, height: 600 } as DOMRect);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PresenceDirecte", () => {
  it("sans adresse de service : aucune connexion, place du compteur réservée et vide", async () => {
    vi.stubEnv("NEXT_PUBLIC_DIRECT_URL", "");
    rendre();
    await demarrer();
    expect(fausse.construite).toBe(0);
    const ligne = screen.getByTestId("compteur-presents");
    expect(ligne).toHaveClass("h-7");
    expect(ligne).toHaveTextContent("");
  });

  describe("avec le service", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_DIRECT_URL", "ws://127.0.0.1:3201/direct");
    });

    it("ne charge la connexion qu'après le temps libre", async () => {
      rendre();
      expect(fausse.construite).toBe(0);
      await demarrer();
      expect(fausse.construite).toBe(1);
    });

    it("masque le compteur quand on est seul, l'affiche à partir de deux", async () => {
      rendre();
      await demarrer();
      recevoir(bienvenue(1));
      expect(screen.queryByText(/regardent cette page/)).toBeNull();
      recevoir({ type: "presents", nombre: 3 });
      expect(screen.getByText("3 personnes regardent cette page")).toBeInTheDocument();
    });

    it("bouton visible dès la connexion, même seul, et absent avant", async () => {
      rendre();
      await demarrer();
      expect(screen.queryByRole("button", { name: /mon curseur/ })).toBeNull();
      recevoir(bienvenue(1));
      expect(screen.getByRole("button", { name: "Masquer mon curseur" })).toBeInTheDocument();
    });

    it("le bouton coupe le partage, envoie un masque et retient le choix", async () => {
      rendre();
      await demarrer();
      recevoir(bienvenue(1));
      fireEvent.click(screen.getByRole("button", { name: "Masquer mon curseur" }));
      expect(fausse.envoyer).toHaveBeenCalledWith({ type: "masque" });
      expect(window.localStorage.getItem("direct:partage")).toBe("non");
      expect(screen.getByRole("button", { name: "Montrer mon curseur" })).toBeInTheDocument();
    });

    it("partage actif : la souris dans une section envoie une position", async () => {
      rendre();
      await demarrer();
      recevoir(bienvenue(1));
      // fireEvent.mouseMove ne remplit pas pageX sous jsdom : MouseEvent + clientX.
      document.dispatchEvent(new MouseEvent("mousemove", { clientX: 400, clientY: 150, bubbles: true }));
      expect(fausse.envoyer).toHaveBeenCalledWith({ type: "position", s: 0, x: 0.5, y: 0.25 });
    });

    it("partage coupé : la souris n'envoie plus de position", async () => {
      window.localStorage.setItem("direct:partage", "non");
      rendre();
      await demarrer();
      fireEvent.mouseMove(document, { pageX: 400, pageY: 150 });
      expect(fausse.envoyer).not.toHaveBeenCalledWith(expect.objectContaining({ type: "position" }));
    });

    it("sans pointeur fin : ni bouton ni envoi de position", async () => {
      pointeur(false);
      rendre();
      await demarrer();
      recevoir(bienvenue(2));
      expect(screen.getByText("2 personnes regardent cette page")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /mon curseur/ })).toBeNull();
      fireEvent.mouseMove(document, { pageX: 400, pageY: 150 });
      expect(fausse.envoyer).not.toHaveBeenCalled();
    });

    it("dessine les curseurs reçus dans un calque ignoré des lecteurs d'écran", async () => {
      rendre();
      await demarrer();
      recevoir({ type: "positions", curseurs: [["a", "#2f6f6a", 0, 0.5, 0.5]] });
      const curseur = document.body.querySelector("[data-curseur]");
      expect(curseur).not.toBeNull();
      expect(curseur!.closest("[aria-hidden='true']")).not.toBeNull();
    });

    it("connexion perdue : plus de compteur, de bouton ni de curseurs", async () => {
      rendre();
      await demarrer();
      recevoir(bienvenue(2));
      recevoir({ type: "positions", curseurs: [["a", "#2f6f6a", 0, 0.5, 0.5]] });
      act(() => fausse.rappels!.surFermeture());
      expect(screen.queryByText(/regardent cette page/)).toBeNull();
      expect(screen.queryByRole("button", { name: /mon curseur/ })).toBeNull();
      expect(document.body.querySelector("[data-curseur]")).toBeNull();
    });
  });
});

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MessageServeur } from "@/lib/direct/protocole";

const fausse = vi.hoisted(() => ({
  rappels: null as null | { surMessage(m: MessageServeur): void; surFermeture(): void },
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
    surVisibilite() {}
    arreter() {}
  },
}));

import { CompteurPresents } from "./CompteurPresents";
import { PresenceDirecte } from "./PresenceDirecte";

function rendre() {
  render(
    <PresenceDirecte>
      <section>
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

const bienvenue = (presents: number): MessageServeur => ({ type: "bienvenue", presents });

beforeEach(() => {
  vi.useFakeTimers();
  fausse.rappels = null;
  fausse.construite = 0;
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

    describe("seul sur la page", () => {
      const copier = vi.fn<(texte: string) => Promise<void>>();
      beforeEach(() => {
        copier.mockReset();
        vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: copier } });
        window.history.replaceState(null, "", "/?pour=exemple-0000");
      });
      afterEach(() => window.history.replaceState(null, "", "/"));

      it("invite à copier le lien de l'accueil public, jamais celui du prospect", async () => {
        copier.mockResolvedValue();
        rendre();
        await demarrer();
        recevoir(bienvenue(1));
        expect(screen.getByText("Vous êtes seul ici.")).toBeInTheDocument();
        await act(async () => {
          fireEvent.click(screen.getByRole("button", { name: "Inviter quelqu'un" }));
        });
        expect(copier).toHaveBeenCalledWith(`${window.location.origin}/`);
        expect(screen.getByText("Lien copié : envoyez-le, le compteur passera à 2.")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Inviter quelqu'un" })).toBeNull();
      });

      it("copie refusée : affiche le lien, à sélectionner", async () => {
        copier.mockRejectedValue(new Error("refusé"));
        rendre();
        await demarrer();
        recevoir(bienvenue(1));
        await act(async () => {
          fireEvent.click(screen.getByRole("button", { name: "Inviter quelqu'un" }));
        });
        expect(screen.getByText(`${window.location.origin}/`)).toBeInTheDocument();
      });

      it("plus d'invitation dès qu'une autre personne arrive, de nouveau proposée quand elle part", async () => {
        copier.mockResolvedValue();
        rendre();
        await demarrer();
        recevoir(bienvenue(1));
        await act(async () => {
          fireEvent.click(screen.getByRole("button", { name: "Inviter quelqu'un" }));
        });
        recevoir({ type: "presents", nombre: 2 });
        expect(screen.getByText("2 personnes regardent cette page")).toBeInTheDocument();
        expect(screen.queryByText(/seul ici|Lien copié/)).toBeNull();
        recevoir({ type: "presents", nombre: 1 });
        expect(screen.getByRole("button", { name: "Inviter quelqu'un" })).toBeInTheDocument();
      });

      it("invite aussi sur téléphone, sans souris", async () => {
        vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {} }));
        rendre();
        await demarrer();
        recevoir(bienvenue(1));
        expect(screen.getByText("Vous êtes seul ici.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Inviter quelqu'un" })).toBeInTheDocument();
      });
    });

    it("n'affiche ni curseur ni bouton de curseur, et ne garde rien dans le navigateur", async () => {
      rendre();
      await demarrer();
      recevoir(bienvenue(2));
      document.dispatchEvent(new MouseEvent("mousemove", { clientX: 400, clientY: 150, bubbles: true }));
      expect(screen.queryByRole("button", { name: /curseur/ })).toBeNull();
      expect(document.body.querySelector("[data-curseur]")).toBeNull();
      expect(window.localStorage.length).toBe(0);
    });

    it("connexion perdue : plus de compteur ni d'invitation", async () => {
      rendre();
      await demarrer();
      recevoir(bienvenue(2));
      act(() => fausse.rappels!.surFermeture());
      expect(screen.queryByText(/regardent cette page/)).toBeNull();
      expect(screen.queryByText("Vous êtes seul ici.")).toBeNull();
      expect(screen.queryByRole("button")).toBeNull();
    });
  });
});

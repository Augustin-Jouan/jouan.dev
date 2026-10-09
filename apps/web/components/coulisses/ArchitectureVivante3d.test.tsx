import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { oublierWebgl } from "@/lib/coulisses/webgl";

const scene = vi.hoisted(() => ({
  creerScene: vi.fn(),
  choisir: vi.fn(),
  arreter: vi.fn(),
}));
vi.mock("@/lib/coulisses/scene3d", () => ({ MARQUEUR_3D: "scene-3d:v1", creerScene: scene.creerScene }));

import { ArchitectureVivante } from "./ArchitectureVivante";

function webgl(present: boolean) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue((present ? {} : null) as never);
}

beforeEach(() => {
  oublierWebgl();
  vi.spyOn(Document.prototype, "visibilityState", "get").mockReturnValue("visible");
  vi.stubEnv("NEXT_PUBLIC_DIRECT_URL", "");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ base: 1, serveur: 2 })));
  scene.creerScene.mockReset();
  scene.creerScene.mockImplementation(() => ({ marqueur: "scene-3d:v1", choisir: scene.choisir, arreter: scene.arreter }));
  scene.choisir.mockReset();
  scene.arreter.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ArchitectureVivante, vue 3D", () => {
  it("sans WebGL : bouton 3D invisible et hors de l'arbre d'accessibilité, sa place gardée", () => {
    webgl(false);
    render(<ArchitectureVivante />);
    expect(screen.queryByRole("button", { name: "Voir en 3D" })).toBeNull();
    const cache = screen.getByText("Voir en 3D");
    expect(cache).toHaveClass("invisible");
    expect(cache).toHaveAttribute("tabindex", "-1");
  });

  it("charge la scène au clic, dans le même cadre, puis revient en 2D", async () => {
    webgl(true);
    render(<ArchitectureVivante />);
    expect(scene.creerScene).not.toHaveBeenCalled();
    const bouton = screen.getByRole("button", { name: "Voir en 3D" });
    bouton.focus();
    fireEvent.click(bouton);
    expect(screen.getByRole("button", { name: "Chargement…" })).toHaveAttribute("aria-disabled", "true");
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalledTimes(1));
    // Le même bouton, devenu « Revenir en 2D », garde le focus.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Revenir en 2D" }));
    const options = scene.creerScene.mock.calls[0]![0] as { conteneur: HTMLElement; mouvementReduit: boolean };
    expect(options.conteneur).toBe(screen.getByTestId("scene-3d"));
    expect(options.conteneur).toHaveAttribute("aria-hidden", "true");
    expect(options.mouvementReduit).toBe(false);
    expect(screen.queryByRole("group", { name: "Schéma de l'architecture" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Revenir en 2D" }));
    expect(scene.arreter).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("group", { name: "Schéma de l'architecture" })).toHaveLength(2);
  });

  it("en 3D, la rangée « Nœuds » garde le choix au clavier et le transmet à la scène", async () => {
    webgl(true);
    render(<ArchitectureVivante />);
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalled());
    const rangee = screen.getByRole("group", { name: "Nœuds" });
    fireEvent.click(within(rangee).getByRole("button", { name: "Base" }));
    expect(within(rangee).getByRole("button", { name: "Base" })).toHaveAttribute("aria-pressed", "true");
    expect(scene.choisir).toHaveBeenLastCalledWith("base");
    expect(screen.getByRole("heading", { level: 3, name: "Base" })).toBeInTheDocument();
  });

  it("un clic sur un bloc de la scène choisit le nœud", async () => {
    webgl(true);
    render(<ArchitectureVivante />);
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalled());
    const { surChoix } = scene.creerScene.mock.calls[0]![0] as { surChoix(id: string): void };
    act(() => surChoix("proxy"));
    expect(screen.getByRole("heading", { level: 3, name: "Proxy" })).toBeInTheDocument();
  });

  it("WebGL qui échoue à la création : retour en 2D avec un message", async () => {
    webgl(true);
    scene.creerScene.mockImplementation(() => {
      throw new Error("contexte WebGL perdu");
    });
    render(<ArchitectureVivante />);
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    expect(await screen.findByText("3D indisponible sur cet appareil.")).toBeInTheDocument();
    expect(screen.getAllByRole("group", { name: "Schéma de l'architecture" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Voir en 3D" })).toBeEnabled();
  });

  it("contexte WebGL perdu une fois la scène montée : retour en 2D avec un message", async () => {
    webgl(true);
    render(<ArchitectureVivante />);
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalled());
    const { surPerte } = scene.creerScene.mock.calls[0]![0] as { surPerte(): void };
    act(() => surPerte());
    expect(screen.getByText("3D indisponible sur cet appareil.")).toBeInTheDocument();
    expect(scene.arreter).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("group", { name: "Schéma de l'architecture" })).toHaveLength(2);
  });

  it("mouvement réduit : transmis à la scène", async () => {
    webgl(true);
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q === "(prefers-reduced-motion: reduce)",
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(<ArchitectureVivante />);
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalled());
    expect((scene.creerScene.mock.calls[0]![0] as { mouvementReduit: boolean }).mouvementReduit).toBe(true);
  });
});

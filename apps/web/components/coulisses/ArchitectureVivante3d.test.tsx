import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { oublierWebgl } from "@/lib/coulisses/webgl";

const scene = vi.hoisted(() => ({
  creerScene: vi.fn(),
  choisir: vi.fn(),
  arreter: vi.fn(),
}));
vi.mock("@/lib/coulisses/scene3d", () => ({ MARQUEUR_3D: "scene-3d:v1", creerScene: scene.creerScene }));

import { ArchitectureVivante, oublierChoix2d } from "./ArchitectureVivante";

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
  sessionStorage.clear();
  oublierChoix2d();
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
    // Le même bouton, devenu « Voir en 2D », garde le focus.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Voir en 2D" }));
    const options = scene.creerScene.mock.calls[0]![0] as { conteneur: HTMLElement; mouvementReduit: boolean };
    expect(options.conteneur).toBe(screen.getByTestId("scene-3d"));
    expect(options.conteneur).toHaveAttribute("aria-hidden", "true");
    expect(options.mouvementReduit).toBe(false);
    expect(screen.queryByRole("group", { name: "Schéma de l'architecture" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Voir en 2D" }));
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

  it("la zone d'état existe avant l'échec : le message y est écrit, donc annoncé", async () => {
    webgl(true);
    scene.creerScene.mockImplementation(() => {
      throw new Error("contexte WebGL perdu");
    });
    render(<ArchitectureVivante />);
    const zone = screen.getByTestId("etat-3d");
    expect(zone).toHaveAttribute("role", "status");
    expect(zone).toBeEmptyDOMElement();
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    await waitFor(() => expect(zone).toHaveTextContent("3D indisponible sur cet appareil."));
    expect(screen.getByTestId("etat-3d")).toBe(zone);
  });

  it("contexte perdu, le focus dans la rangée « Nœuds » : il revient sur le bouton 3D", async () => {
    webgl(true);
    render(<ArchitectureVivante />);
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalled());
    within(screen.getByRole("group", { name: "Nœuds" })).getByRole("button", { name: "Base" }).focus();
    const { surPerte } = scene.creerScene.mock.calls[0]![0] as { surPerte(): void };
    act(() => surPerte());
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Voir en 3D" }));
  });

  it("scène recréée (mouvement réduit changé) : le nœud choisi reste surligné", async () => {
    webgl(true);
    let reduit = false;
    const ecouteurs: (() => void)[] = [];
    vi.stubGlobal("matchMedia", (q: string) => ({
      get matches() {
        return q === "(prefers-reduced-motion: reduce)" && reduit;
      },
      media: q,
      addEventListener: (_t: string, fn: () => void) => ecouteurs.push(fn),
      removeEventListener: () => {},
    }));
    render(<ArchitectureVivante />);
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalledTimes(1));
    fireEvent.click(within(screen.getByRole("group", { name: "Nœuds" })).getByRole("button", { name: "Base" }));
    reduit = true;
    act(() => ecouteurs.forEach((fn) => fn()));
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalledTimes(2));
    expect(scene.creerScene.mock.calls[1]![0]).toMatchObject({ mouvementReduit: true, choisi: "base" });
  });

  it("disposition du cadre transmise à la scène (large dès `sm`), qui est recréée quand elle change", async () => {
    webgl(true);
    let large = true;
    const ecouteurs: (() => void)[] = [];
    vi.stubGlobal("matchMedia", (q: string) => ({
      get matches() {
        return q === "(width >= 40rem)" && large;
      },
      media: q,
      addEventListener: (_t: string, fn: () => void) => ecouteurs.push(fn),
      removeEventListener: () => {},
    }));
    render(<ArchitectureVivante />);
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalledTimes(1));
    expect(scene.creerScene.mock.calls[0]![0]).toMatchObject({ disposition: "large" });
    large = false;
    act(() => ecouteurs.forEach((fn) => fn()));
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalledTimes(2));
    expect(scene.creerScene.mock.calls[1]![0]).toMatchObject({ disposition: "etroite" });
    expect(scene.arreter).toHaveBeenCalledTimes(1);
  });

  it("avec ?vue=3d, la 3D s'ouvre d'elle-même", async () => {
    window.history.replaceState(null, "", "/coulisses?vue=3d");
    try {
      webgl(true);
      render(<ArchitectureVivante />);
      await waitFor(() => expect(scene.creerScene).toHaveBeenCalledTimes(1));
      expect(screen.getByRole("button", { name: "Voir en 2D" })).toBeInTheDocument();
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });

  it("avec ?vue=3d mais sans WebGL, le schéma 2D reste", async () => {
    window.history.replaceState(null, "", "/coulisses?vue=3d");
    try {
      webgl(false);
      render(<ArchitectureVivante />);
      await act(async () => {});
      expect(scene.creerScene).not.toHaveBeenCalled();
      expect(screen.getAllByRole("group", { name: "Schéma de l'architecture" }).length).toBeGreaterThan(0);
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });
});

/** Contexte WebGL 2 d'essai dont le moteur de rendu s'appelle `nom`. */
function moteur(nom: string) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    RENDERER: 1,
    getParameter: (p: number) => (p === 1 ? nom : null),
    getExtension: () => null,
  } as never);
}

const geste = () => fireEvent.pointerMove(window, { clientX: 10, clientY: 10 });

describe("ArchitectureVivante, la 3D d'emblée", () => {
  it("la page arrive en 2D ; au premier geste, la 3D se charge et remplace la 2D, sans prendre le focus", async () => {
    webgl(true);
    render(<ArchitectureVivante />);
    expect(screen.getAllByRole("group", { name: "Schéma de l'architecture" })).toHaveLength(2);
    expect(scene.creerScene).not.toHaveBeenCalled();
    geste();
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Voir en 2D" })).not.toHaveFocus();
    expect(screen.queryByRole("group", { name: "Schéma de l'architecture" })).toBeNull();
    expect(screen.getByTestId("etat-3d")).toBeEmptyDOMElement();
  });

  for (const [nom, evenement] of [
    ["un appui", () => fireEvent.pointerDown(window)],
    ["un toucher", () => fireEvent.touchStart(window)],
    ["la molette", () => fireEvent.wheel(window)],
    ["un défilement", () => fireEvent.scroll(window)],
  ] as const) {
    it(`${nom} compte aussi comme premier geste`, async () => {
      webgl(true);
      render(<ArchitectureVivante />);
      evenement();
      await waitFor(() => expect(scene.creerScene).toHaveBeenCalledTimes(1));
    });
  }

  it("une touche du clavier ne compte pas : la 2D, parcourable au clavier, reste", async () => {
    webgl(true);
    render(<ArchitectureVivante />);
    fireEvent.keyDown(window, { key: "Tab" });
    await act(async () => {});
    expect(scene.creerScene).not.toHaveBeenCalled();
  });

  it("focus dans la figure : pas de bascule tant qu'il y est", async () => {
    webgl(true);
    render(<ArchitectureVivante />);
    const noeud = within(screen.getAllByRole("group", { name: "Schéma de l'architecture" })[0]!).getAllByRole("button")[0]!;
    noeud.focus();
    geste();
    await act(async () => {});
    expect(scene.creerScene).not.toHaveBeenCalled();
    noeud.blur();
    geste();
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalledTimes(1));
  });

  it("mouvement réduit, économie de données ou rendu au processeur : la 2D reste, la 3D reste proposée", async () => {
    const cas: [string, () => void][] = [
      [
        "mouvement réduit",
        () =>
          vi.stubGlobal("matchMedia", (q: string) => ({
            matches: q === "(prefers-reduced-motion: reduce)",
            media: q,
            addEventListener: () => {},
            removeEventListener: () => {},
          })),
      ],
      ["économie de données", () => vi.stubGlobal("navigator", { ...navigator, connection: { saveData: true } })],
      ["rendu au processeur", () => moteur("Google SwiftShader")],
    ];
    for (const [nom, preparer] of cas) {
      oublierWebgl();
      webgl(true);
      preparer();
      const { unmount } = render(<ArchitectureVivante />);
      geste();
      await act(async () => {});
      expect(scene.creerScene, nom).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Voir en 3D" }), nom).toBeInTheDocument();
      unmount();
      vi.unstubAllGlobals();
      vi.stubGlobal("fetch", vi.fn(async () => Response.json({ base: 1, serveur: 2 })));
    }
  });

  it("après « Voir en 2D », la 3D ne revient plus d'elle-même pendant la session", async () => {
    webgl(true);
    const { unmount } = render(<ArchitectureVivante />);
    geste();
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Voir en 2D" }));
    expect(sessionStorage.getItem("jouan.dev:coulisses-vue")).toBe("2d");
    unmount();
    render(<ArchitectureVivante />);
    geste();
    await act(async () => {});
    expect(scene.creerScene).toHaveBeenCalledTimes(1);
  });

  it("sans stockage de session, le choix « Voir en 2D » vaut pour la page", async () => {
    webgl(true);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("stockage bloqué");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("stockage bloqué");
    });
    const { unmount } = render(<ArchitectureVivante />);
    geste();
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Voir en 2D" }));
    unmount();
    render(<ArchitectureVivante />);
    geste();
    await act(async () => {});
    expect(scene.creerScene).toHaveBeenCalledTimes(1);
  });

  it("une bascule automatique qui échoue ramène à la 2D sans message ; la 3D reste proposée", async () => {
    webgl(true);
    scene.creerScene.mockImplementation(() => {
      throw new Error("contexte WebGL perdu");
    });
    render(<ArchitectureVivante />);
    geste();
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalled());
    expect(screen.getByTestId("etat-3d")).toBeEmptyDOMElement();
    expect(screen.getAllByRole("group", { name: "Schéma de l'architecture" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Voir en 3D" })).toBeInTheDocument();
  });

  it("avec ?vue=3d, la 3D s'ouvre sans geste, même au processeur : c'est une demande explicite", async () => {
    window.history.replaceState(null, "", "/coulisses?vue=3d");
    try {
      moteur("Google SwiftShader");
      render(<ArchitectureVivante />);
      await waitFor(() => expect(scene.creerScene).toHaveBeenCalledTimes(1));
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });
});

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adresseSonde, ArchitectureVivante } from "./ArchitectureVivante";

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom ne se dit pas toujours « visible » : le releveur ne mesurerait rien.
  vi.spyOn(Document.prototype, "visibilityState", "get").mockReturnValue("visible");
  vi.stubEnv("NEXT_PUBLIC_DIRECT_URL", "");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ base: 1, serveur: 2 })));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ArchitectureVivante", () => {
  it("montre d'abord le navigateur, puis le nœud choisi", () => {
    render(<ArchitectureVivante />);
    expect(screen.getByRole("heading", { level: 3, name: "Navigateur" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /^Proxy/ })[0]!);
    expect(screen.getByRole("heading", { level: 3, name: "Proxy" })).toBeInTheDocument();
  });

  it("ne mesure qu'après le chargement ; sans service, le temps réel est indisponible", async () => {
    render(<ArchitectureVivante />);
    expect(fetch).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1_500);
    });
    expect(fetch).toHaveBeenCalledWith("/api/coulisses/mesure", expect.anything());
    expect(screen.getByTestId("mesure-tempsReel")).toHaveTextContent("indisponible");
  });

  it("déduit l'adresse de la sonde de celle du service", () => {
    expect(adresseSonde("wss://direct.exemple.dev/direct")).toBe("wss://direct.exemple.dev/sonde");
    expect(adresseSonde("ws://127.0.0.1:3201/direct")).toBe("ws://127.0.0.1:3201/sonde");
  });
});

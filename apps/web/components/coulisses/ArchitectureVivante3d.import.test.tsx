import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { oublierWebgl } from "@/lib/coulisses/webgl";

// Morceau 3D introuvable (réseau coupé, déploiement en cours) : l'import dynamique est rejeté.
vi.mock("@/lib/coulisses/scene3d", () => {
  throw new Error("Morceau 3D introuvable");
});

import { ArchitectureVivante } from "./ArchitectureVivante";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ArchitectureVivante, morceau 3D introuvable", () => {
  it("reste en 2D et le dit", async () => {
    oublierWebgl();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as never);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ base: 1, serveur: 2 })));
    render(<ArchitectureVivante />);
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    expect(await screen.findByText("3D indisponible sur cet appareil.")).toBeInTheDocument();
    expect(screen.getAllByRole("group", { name: "Schéma de l'architecture" })).toHaveLength(2);
  });
});

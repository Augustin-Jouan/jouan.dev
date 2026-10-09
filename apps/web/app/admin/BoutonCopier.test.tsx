import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BoutonCopier } from "./BoutonCopier";

function simulerPressePapiers(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

describe("BoutonCopier", () => {
  afterEach(() => vi.restoreAllMocks());

  it("confirme la copie", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    simulerPressePapiers(writeText);
    render(<BoutonCopier texte="https://exemple.test/?pour=x" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copier le lien" }));
    });
    expect(writeText).toHaveBeenCalledWith("https://exemple.test/?pour=x");
    expect(screen.getByRole("button", { name: "Copié" })).toBeInTheDocument();
  });

  it("signale l'échec de la copie", async () => {
    simulerPressePapiers(vi.fn().mockRejectedValue(new Error("refusé")));
    render(<BoutonCopier texte="x" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copier le lien" }));
    });
    expect(screen.getByRole("button", { name: "Copie impossible" })).toBeInTheDocument();
  });
});

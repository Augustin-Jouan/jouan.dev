import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Morceau de JS de la palette introuvable (réseau coupé, déploiement en cours).
vi.mock("./PaletteCommandes", () => {
  throw new Error("Morceau de la palette introuvable");
});

import { RaccourciCommandes } from "./RaccourciCommandes";

afterEach(() => vi.restoreAllMocks());

describe("RaccourciCommandes, import de la palette rejeté", () => {
  it("prévient dans la console, sans rien afficher ni planter", async () => {
    const avertir = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(<RaccourciCommandes commandes={[]} />);
    await act(async () => {
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      await vi.dynamicImportSettled();
    });
    expect(avertir).toHaveBeenCalledWith(
      "Palette de commandes indisponible ; nouvel essai au prochain appel.",
      expect.any(Error),
    );
    expect(container).toBeEmptyDOMElement();
  });
});

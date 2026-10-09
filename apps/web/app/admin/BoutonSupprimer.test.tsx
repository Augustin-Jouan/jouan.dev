import { act, createEvent, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const supprimerLienAction = vi.hoisted(() => vi.fn());
vi.mock("./actions", () => ({ supprimerLienAction }));
import { BoutonSupprimer } from "./BoutonSupprimer";

async function envoyer() {
  const { container } = render(<BoutonSupprimer id="l1" nom="Boulangerie Martin" />);
  const formulaire = container.querySelector("form")!;
  const evenement = createEvent.submit(formulaire);
  await act(async () => {
    fireEvent(formulaire, evenement);
  });
  return evenement;
}

describe("BoutonSupprimer", () => {
  afterEach(() => vi.restoreAllMocks());

  // React empêche toujours l'envoi natif d'un formulaire à action fonction : on vérifie donc
  // que l'action serveur part (confirmation acceptée) ou non (refusée).
  it("n'appelle pas l'action si la confirmation est refusée", async () => {
    const confirmer = vi.spyOn(window, "confirm").mockReturnValue(false);
    const evenement = await envoyer();
    expect(evenement.defaultPrevented).toBe(true);
    expect(confirmer).toHaveBeenCalledWith("Supprimer le lien de Boulangerie Martin et ses visites ?");
    expect(supprimerLienAction).not.toHaveBeenCalled();
  });

  it("appelle l'action avec l'identifiant si la confirmation est acceptée", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await envoyer();
    expect(supprimerLienAction).toHaveBeenCalledTimes(1);
    expect((supprimerLienAction.mock.calls[0][0] as FormData).get("id")).toBe("l1");
  });
});

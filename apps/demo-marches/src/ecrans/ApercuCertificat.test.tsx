import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";

const espaces = (t: string | null) => (t ?? "").replace(/[\u00a0\u202f]/g, " ");

async function ouvrirCertificat() {
  render(<App />);
  await userEvent.click(screen.getByRole("button", { name: "Carrelage — faïence" }));
  await userEvent.click(screen.getByRole("button", { name: "Certificat de paiement" }));
  return screen.getByRole("dialog", { name: "Certificat de paiement n° 03 — Lot 07" });
}
const mandate = (apercu: HTMLElement) => espaces(within(apercu).getByTestId("mandate").textContent);

describe("Aperçu du certificat", () => {
  it("calcule le cas de référence à la frappe", async () => {
    const apercu = await ouvrirCertificat();
    await userEvent.type(within(apercu).getByLabelText("Cumul des travaux réalisés HT"), "9 850,00");
    expect(mandate(apercu)).toBe("3 021,00 €");
    expect(espaces(screen.getByRole("status").textContent)).toContain("3 021,00 €");
  });

  it("supprime la retenue avec la caution bancaire", async () => {
    const apercu = await ouvrirCertificat();
    await userEvent.type(within(apercu).getByLabelText("Cumul des travaux réalisés HT"), "9850");
    await userEvent.click(within(apercu).getByRole("switch", { name: "Caution bancaire" }));
    expect(mandate(apercu)).toBe("3 180,00 €");
  });

  it("garde le dernier calcul valide et explique l'erreur", async () => {
    const apercu = await ouvrirCertificat();
    const champ = within(apercu).getByLabelText("Cumul des travaux réalisés HT");
    await userEvent.type(champ, "9850");
    await userEvent.clear(champ);
    await userEvent.type(champ, "7 000");
    expect(champ).toHaveAttribute("aria-invalid", "true");
    expect(champ).toHaveAccessibleDescription("Le présent acompte doit être positif.");
    expect(mandate(apercu)).toBe("3 021,00 €");
  });

  it("recalcule le dernier cumul valide avec la caution courante quand la saisie est invalide", async () => {
    const apercu = await ouvrirCertificat();
    const champ = within(apercu).getByLabelText("Cumul des travaux réalisés HT");
    await userEvent.type(champ, "9850");
    await userEvent.clear(champ);
    await userEvent.type(champ, "7 000");
    await userEvent.click(within(apercu).getByRole("switch", { name: "Caution bancaire" }));
    expect(mandate(apercu)).toBe("3 180,00 €");
    expect(champ).toHaveAttribute("aria-invalid", "true");
    expect(champ).toHaveAccessibleDescription("Le présent acompte doit être positif.");
    expect(espaces(screen.getByRole("status").textContent)).toContain("3 180,00 €");
  });

  it("affiche des tirets tant qu'aucun calcul n'est valide", async () => {
    const apercu = await ouvrirCertificat();
    expect(mandate(apercu)).toBe("—");
  });

  it("Échap ne ferme que l'aperçu et rend le focus au bouton", async () => {
    await ouvrirCertificat();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /Certificat de paiement n°/ })).toBeNull();
    expect(screen.getByRole("dialog", { name: /Lot 07/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Certificat de paiement" })).toHaveFocus();
  });

  it("n'annonce le montant que s'il change", async () => {
    const apercu = await ouvrirCertificat();
    const champ = within(apercu).getByLabelText("Cumul des travaux réalisés HT");
    await userEvent.type(champ, "9850");
    const statut = screen.getByRole("status");
    const avant = statut.textContent;
    await userEvent.type(champ, ",0", { skipClick: true });
    expect(statut.textContent).toBe(avant);
  });

  it("présente les montants alignés à droite en chiffres", async () => {
    const apercu = await ouvrirCertificat();
    expect(within(apercu).getByTestId("mandate")).toHaveAttribute("data-droite");
  });
});

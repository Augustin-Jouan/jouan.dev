import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";

const espaces = (t: string | null) => (t ?? "").replace(/[\u00a0\u202f]/g, " ").replace(/\u200b/g, "");
const ligne = (intitule: string) => screen.getByRole("button", { name: intitule }).closest("tr")!;
const total = () => screen.getByRole("row", { name: /Total du chantier/ });

describe("Écran Marchés", () => {
  it("liste les 8 lots et le total du chantier", () => {
    render(<App />);
    expect(screen.getAllByRole("row")).toHaveLength(1 + 8 + 1);
    expect(espaces(total().textContent)).toContain("496 480,00 €");
  });

  it("un avenant ajouté change la ligne, le total et le panneau", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Carrelage — faïence" }));
    const panneau = screen.getByRole("dialog", { name: "Lot 07 — Carrelage — faïence" });
    await userEvent.type(within(panneau).getByLabelText("Libellé"), "Plinthes");
    await userEvent.type(within(panneau).getByLabelText("Montant HT"), "1 000");
    await userEvent.click(within(panneau).getByRole("button", { name: "Ajouter" }));
    expect(within(panneau).getByText("Avenant n° 02")).toBeInTheDocument();
    expect(espaces(ligne("Carrelage — faïence").textContent)).toContain("14 450,00 €");
    expect(espaces(total().textContent)).toContain("497 480,00 €");
    expect(espaces(screen.getByRole("status").textContent)).toContain("14 450,00 €");
  });

  it("refuse un avenant invalide avec un message relié au champ", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Carrelage — faïence" }));
    const panneau = screen.getByRole("dialog");
    await userEvent.click(within(panneau).getByRole("button", { name: "Ajouter" }));
    const libelle = within(panneau).getByLabelText("Libellé");
    expect(libelle).toHaveAttribute("aria-invalid", "true");
    expect(libelle).toHaveAccessibleDescription("Donnez un libellé à l'avenant.");
  });

  it("supprime un avenant sans réutiliser son numéro", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Carrelage — faïence" }));
    const panneau = screen.getByRole("dialog");
    await userEvent.click(within(panneau).getByRole("button", { name: "Supprimer l'avenant n° 01" }));
    expect(espaces(ligne("Carrelage — faïence").textContent)).toContain("12 600,00 €");
    await userEvent.type(within(panneau).getByLabelText("Libellé"), "Autre");
    await userEvent.type(within(panneau).getByLabelText("Montant HT"), "500");
    await userEvent.click(within(panneau).getByRole("button", { name: "Ajouter" }));
    expect(within(panneau).getByText("Avenant n° 02")).toBeInTheDocument();
  });

  it("Échap ferme le panneau et rend le focus au lot", async () => {
    render(<App />);
    const bouton = screen.getByRole("button", { name: "Carrelage — faïence" });
    await userEvent.click(bouton);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(bouton).toHaveFocus();
  });

  it("« Réinitialiser la démo » remet les données d'origine", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Carrelage — faïence" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Supprimer l'avenant n° 01" }));
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Réinitialiser la démo" }));
    expect(espaces(total().textContent)).toContain("496 480,00 €");
  });

  it("l'erreur d'un champ disparaît dès qu'on le corrige", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Carrelage — faïence" }));
    const panneau = screen.getByRole("dialog");
    await userEvent.click(within(panneau).getByRole("button", { name: "Ajouter" }));
    const libelle = within(panneau).getByLabelText("Libellé");
    expect(libelle).toHaveAttribute("aria-invalid", "true");
    await userEvent.type(libelle, "P");
    expect(libelle).not.toHaveAttribute("aria-invalid");
    expect(libelle).not.toHaveAccessibleDescription("Donnez un libellé à l'avenant.");
  });

  it("après la suppression du seul avenant, le focus va au champ Libellé", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Carrelage — faïence" }));
    const panneau = screen.getByRole("dialog");
    await userEvent.click(within(panneau).getByRole("button", { name: "Supprimer l'avenant n° 01" }));
    expect(within(panneau).getByLabelText("Libellé")).toHaveFocus();
  });

  it("après la suppression du premier de deux avenants, le focus va au suivant", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Carrelage — faïence" }));
    const panneau = screen.getByRole("dialog");
    await userEvent.type(within(panneau).getByLabelText("Libellé"), "Autre");
    await userEvent.type(within(panneau).getByLabelText("Montant HT"), "500");
    await userEvent.click(within(panneau).getByRole("button", { name: "Ajouter" }));
    await userEvent.click(within(panneau).getByRole("button", { name: "Supprimer l'avenant n° 01" }));
    expect(within(panneau).getByRole("button", { name: "Supprimer l'avenant n° 02" })).toHaveFocus();
  });

  it("après la suppression du dernier avenant, le focus va au précédent", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Carrelage — faïence" }));
    const panneau = screen.getByRole("dialog");
    await userEvent.type(within(panneau).getByLabelText("Libellé"), "Autre");
    await userEvent.type(within(panneau).getByLabelText("Montant HT"), "500");
    await userEvent.click(within(panneau).getByRole("button", { name: "Ajouter" }));
    await userEvent.click(within(panneau).getByRole("button", { name: "Supprimer l'avenant n° 02" }));
    expect(within(panneau).getByRole("button", { name: "Supprimer l'avenant n° 01" })).toHaveFocus();
  });

  it("l'avancement du lot 07 est un indicateur à 54 %", () => {
    render(<App />);
    const m = screen.getByRole("meter", { name: "Avancement du lot 07" });
    expect(m).toHaveAttribute("aria-valuenow", "54");
  });

  it("une même annonce répétée est ré-annoncée", async () => {
    render(<App />);
    const region = screen.getByRole("status");
    const vues: string[] = [];
    const obs = new MutationObserver(() => vues.push(region.textContent ?? ""));
    obs.observe(region, { childList: true, characterData: true, subtree: true });
    await userEvent.click(screen.getByRole("button", { name: "Réinitialiser la démo" }));
    await new Promise((r) => setTimeout(r, 50));
    const apres1 = vues.length;
    await userEvent.click(screen.getByRole("button", { name: "Réinitialiser la démo" }));
    await new Promise((r) => setTimeout(r, 50));
    obs.disconnect();
    expect(apres1).toBeGreaterThan(0);
    expect(vues.length).toBeGreaterThan(apres1);
    expect(region.textContent).toContain("Démo réinitialisée.");
  });
});

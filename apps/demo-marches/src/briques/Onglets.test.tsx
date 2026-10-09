import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Onglets, PanneauOnglet } from "./Onglets";

function Exemple() {
  const [actif, setActif] = useState("marches");
  const onglets = [{ id: "marches", titre: "Marchés" }, { id: "planning", titre: "Planning" }];
  return (
    <>
      <Onglets libelle="Vues du chantier" onglets={onglets} actif={actif} surChangement={setActif} />
      <PanneauOnglet id="marches" actif={actif}>Contenu marchés</PanneauOnglet>
      <PanneauOnglet id="planning" actif={actif}>Contenu planning</PanneauOnglet>
    </>
  );
}

describe("Onglets", () => {
  it("se pilotent aux flèches et n'affichent que le panneau actif", async () => {
    render(<Exemple />);
    const marches = screen.getByRole("tab", { name: "Marchés" });
    expect(marches).toHaveAttribute("aria-selected", "true");
    marches.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Planning" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Contenu planning");
  });

  it("n'met que l'onglet actif dans l'ordre de tabulation et gère Début et Fin", async () => {
    render(<Exemple />);
    expect(screen.getByRole("tab", { name: "Marchés" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Planning" })).toHaveAttribute("tabindex", "-1");
    screen.getByRole("tab", { name: "Marchés" }).focus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Planning" })).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Marchés" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Marchés" })).toHaveAttribute("aria-selected", "true");
  });
});

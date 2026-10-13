import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Parcours } from "./Parcours";

describe("Parcours", () => {
  it("affiche le logo de l'employeur et de l'école dans leur lien, avant leur nom", () => {
    render(<Parcours />);
    for (const [nom, fichier] of [
      ["SCR Informatique", "/parcours/scr-informatique.webp"],
      ["Epitech", "/parcours/epitech.webp"],
    ]) {
      const lien = screen.getByRole("link", { name: nom });
      const logo = lien.querySelector("img");
      expect(logo?.getAttribute("src")).toBe(fichier);
      // Décoratif : le nom est écrit juste à côté, il donne déjà son nom au lien.
      expect(logo?.getAttribute("alt")).toBe("");
      expect(lien.firstElementChild).toBe(logo?.parentElement);
    }
  });

  it("n'affiche aucun logo sur la ligne sans lien", () => {
    render(<Parcours />);
    const ligne = screen.getByText(/Indépendant : applications métier/);
    expect(ligne.querySelector("img")).toBeNull();
  });
});

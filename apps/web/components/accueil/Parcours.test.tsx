import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Parcours } from "./Parcours";

describe("Parcours", () => {
  it("met en avant les logos de l'employeur et de l'école à côté des trois lignes, liés à leur site", () => {
    render(<Parcours />);
    const enseignes = screen.getByRole("list", { name: "Employeur et école" });
    for (const [nom, fichier, site] of [
      ["SCR Informatique", "/parcours/scr-informatique.webp", "https://www.scrinfo.net/"],
      ["Epitech", "/parcours/epitech.webp", "https://www.epitech.eu/"],
    ]) {
      const logo = within(enseignes).getByRole("img", { name: nom });
      expect(logo.getAttribute("src")).toBe(fichier);
      expect(logo.closest("a")?.getAttribute("href")).toBe(site);
    }
  });

  it("garde les trois lignes en texte, sans logo dans les phrases", () => {
    render(<Parcours />);
    const lignes = screen.getByRole("list", { name: "Parcours" });
    expect(within(lignes).getAllByRole("listitem")).toHaveLength(3);
    expect(lignes.querySelector("img")).toBeNull();
  });
});

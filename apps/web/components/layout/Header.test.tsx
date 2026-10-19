import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Header } from "./Header";
import { siteName } from "@/data/site";

describe("Header", () => {
  it("affiche le nom vers l'accueil et les liens vers les sections", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: siteName })).toHaveAttribute("href", "/");
    const nav = screen.getByRole("navigation", { name: "Navigation principale" });
    expect(within(nav).getByRole("link", { name: "Réalisations" })).toHaveAttribute("href", "/realisations");
    expect(within(nav).getByRole("link", { name: "Coulisses" })).toHaveAttribute("href", "/coulisses");
    expect(within(nav).getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/#contact");
    expect(within(nav).getByRole("link", { name: "À propos" })).toHaveAttribute("href", "/a-propos");
  });

  it("range les liens dans l'ordre Réalisations, À propos, Coulisses, Contact", () => {
    render(<Header />);
    const nav = screen.getByRole("navigation", { name: "Navigation principale" });
    expect(within(nav).getAllByRole("link").map((a) => a.textContent)).toEqual(["Réalisations", "À propos", "Coulisses", "Contact"]);
  });
});

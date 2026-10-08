import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Header } from "./Header";
import { siteName } from "@/data/site";

describe("Header", () => {
  it("affiche le nom vers l'accueil et les liens vers les sections", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: siteName })).toHaveAttribute("href", "/");
    const nav = screen.getByRole("navigation", { name: "Navigation principale" });
    expect(within(nav).getByRole("link", { name: "Réalisations" })).toHaveAttribute(
      "href",
      "/#realisations"
    );
    expect(within(nav).getByRole("link", { name: "Offre" })).toHaveAttribute("href", "/#offre");
    expect(within(nav).getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/#contact");
  });
});

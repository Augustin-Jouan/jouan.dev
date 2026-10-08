import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Header } from "./Header";
import { siteName } from "@/data/site";

describe("Header", () => {
  it("affiche le nom du site vers l'accueil et la navigation", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: siteName })).toHaveAttribute("href", "/");
    expect(screen.getByRole("navigation", { name: "Navigation principale" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
  });

  it("marque la page courante (l'accueil dans les tests)", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Contact" })).not.toHaveAttribute("aria-current");
  });
});

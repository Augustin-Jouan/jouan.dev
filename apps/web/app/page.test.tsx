import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "./page";
import { siteName, siteDescription } from "@/data/site";

describe("HomePage", () => {
  it("affiche le nom et la description du site en attendant le vrai contenu", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: siteName })).toBeInTheDocument();
    expect(screen.getByText(siteDescription)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /contact/i })).toHaveAttribute("href", "/contact");
  });
});

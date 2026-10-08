import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MentionsLegalesPage from "./page";
import { A_COMPLETER } from "@/data/legal";
import { siteName } from "@/data/site";

describe("MentionsLegalesPage", () => {
  it("affiche l'éditeur, son statut, l'hébergeur et le médiateur", () => {
    render(<MentionsLegalesPage />);
    expect(screen.getByRole("heading", { level: 1, name: /mentions légales/i })).toBeInTheDocument();
    expect(screen.getAllByText(siteName).length).toBeGreaterThan(0);
    expect(screen.getByText(/entrepreneur individuel/i)).toBeInTheDocument();
    expect(screen.getByText("OVH SAS")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /médiation de la consommation/i })
    ).toBeInTheDocument();
  });

  it("signale visiblement les champs à compléter", () => {
    render(<MentionsLegalesPage />);
    const placeholders = screen.getAllByText(A_COMPLETER);
    expect(placeholders.length).toBeGreaterThan(0);
    placeholders.forEach((el) => expect(el).toHaveClass("italic"));
  });
});

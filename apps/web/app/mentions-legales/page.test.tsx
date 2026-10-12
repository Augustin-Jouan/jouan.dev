import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MentionsLegalesPage, { metadata } from "./page";
import { siteName } from "@/data/site";

describe("MentionsLegalesPage", () => {
  it("affiche l'éditeur, son statut, l'hébergeur et la clientèle professionnelle", () => {
    render(<MentionsLegalesPage />);
    expect(screen.getByRole("heading", { level: 1, name: /mentions légales/i })).toBeInTheDocument();
    expect(screen.getAllByText(siteName).length).toBeGreaterThan(0);
    expect(screen.getByText(/entrepreneur individuel/i)).toBeInTheDocument();
    expect(screen.getByText("OVH SAS")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /clientèle professionnelle/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/réservées aux professionnels/i)).toBeInTheDocument();
  });

  it("affiche le SIREN et la franchise de TVA", () => {
    render(<MentionsLegalesPage />);
    expect(screen.getByText("109 461 350")).toBeInTheDocument();
    expect(screen.getByText(/293 B du CGI/)).toBeInTheDocument();
  });

  it("n'est pas indexée par les moteurs de recherche (téléphone et SIREN hors des résultats)", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});

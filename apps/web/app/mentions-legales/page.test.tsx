import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MentionsLegalesPage from "./page";
import { A_COMPLETER, type MentionsLegales } from "@/data/legal";
import { siteName } from "@/data/site";

describe("MentionsLegalesPage", () => {
  it("affiche l'éditeur, l'hébergeur et le médiateur", () => {
    render(<MentionsLegalesPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /mentions légales/i })
    ).toBeInTheDocument();
    expect(screen.getByText(siteName)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /hébergement/i })).toBeInTheDocument();
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

  it("n'affiche la section assurance que si elle est renseignée", () => {
    render(<MentionsLegalesPage />);
    expect(
      screen.queryByRole("heading", { name: /assurance professionnelle/i })
    ).not.toBeInTheDocument();
  });

  it("affiche la section assurance quand elle est renseignée", async () => {
    vi.resetModules();
    vi.doMock("@/data/legal", async (importOriginal) => {
      const reel = await importOriginal<typeof import("@/data/legal")>();
      const assurance: NonNullable<MentionsLegales["assurance"]> = {
        assureur: "Assureur Exemple",
        adresse: "1 rue Exemple, 75000 Paris",
        contrat: "123456",
        garanties: "Responsabilité civile professionnelle",
        couvertureGeographique: "France",
      };
      return {
        ...reel,
        mentionsLegales: { ...reel.mentionsLegales, assurance },
      };
    });

    const { default: PageAvecAssurance } = await import("./page");
    render(<PageAvecAssurance />);

    expect(
      screen.getByRole("heading", { name: /assurance professionnelle/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Assureur Exemple")).toBeInTheDocument();

    vi.doUnmock("@/data/legal");
    vi.resetModules();
  });
});

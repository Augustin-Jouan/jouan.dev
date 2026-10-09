import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PolitiqueConfidentialitePage from "./page";
import { contact } from "@/data/contact";

describe("PolitiqueConfidentialitePage", () => {
  it("affiche le titre et les sections RGPD clés", () => {
    render(<PolitiqueConfidentialitePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /politique de confidentialité/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /données collectées/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /vos droits/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: contact.email })).toHaveAttribute(
      "href",
      `mailto:${contact.email}`
    );
  });

  it("indique la base légale précontractuelle, la portabilité et les journaux", () => {
    render(<PolitiqueConfidentialitePage />);
    expect(screen.getByText(/mesures précontractuelles/i)).toBeInTheDocument();
    expect(screen.getByText(/portabilité/i)).toBeInTheDocument();
    expect(screen.getByText(/adresse IP/i)).toBeInTheDocument();
  });

  it("indique l'hébergement en France sans transfert hors UE", () => {
    render(<PolitiqueConfidentialitePage />);
    expect(
      screen.getByText(/ne sont pas transférées hors de l'Union européenne/i)
    ).toBeInTheDocument();
  });

  it("décrit la mesure d'audience Umami sans cookie ni consentement", () => {
    render(<PolitiqueConfidentialitePage />);
    expect(
      screen.getByRole("heading", { name: /cookies et mesure d'audience/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/umami/i)).toBeInTheDocument();
  });

  it("décrit les liens personnalisés et leur durée de conservation", () => {
    render(<PolitiqueConfidentialitePage />);
    expect(screen.getByRole("heading", { name: /liens personnalisés/i })).toBeInTheDocument();
    expect(screen.getByText(/douze mois/i)).toBeInTheDocument();
  });

  it("précise que le seul cookie est celui de la session d'administration", () => {
    render(<PolitiqueConfidentialitePage />);
    expect(screen.getByText(/session d'administration/i)).toBeInTheDocument();
  });
});

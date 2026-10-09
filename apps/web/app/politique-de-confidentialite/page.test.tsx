import { render, screen, within } from "@testing-library/react";
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
    expect(screen.getByText(/adresse IP est utilisée/i)).toBeInTheDocument();
    expect(screen.getByText(/Ni adresse IP/)).toBeInTheDocument();
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
    expect(
      screen.getByText(/conservés tant que le lien existe, et les e-mails de notification restent dans ma boîte de réception/i)
    ).toBeInTheDocument();
  });

  it("précise que le seul cookie est celui de la session d'administration", () => {
    render(<PolitiqueConfidentialitePage />);
    expect(screen.getByText(/session d'administration/i)).toBeInTheDocument();
  });

  it("décrit les mesures des coulisses", () => {
    render(<PolitiqueConfidentialitePage />);
    const coulisses = screen.getByRole("heading", { name: "Coulisses" }).closest("div");
    expect(coulisses).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Coulisses" })).toBeInTheDocument();
    expect(within(coulisses!).getByText(/ne sont ni enregistrées ni transmises/)).toBeInTheDocument();
    expect(within(coulisses!).getByText(/le temps de la connexion/)).toBeInTheDocument();
  });

  it("décrit la présence en direct, sa base légale et le bouton d'opposition", () => {
    render(<PolitiqueConfidentialitePage />);
    expect(screen.getByRole("heading", { name: "Présence en direct" })).toBeInTheDocument();
    expect(screen.getAllByText(/article 6\.1\.f/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/les autres visiteurs présents au même moment/)).toBeInTheDocument();
    expect(screen.getByText(/Masquer mon curseur/)).toBeInTheDocument();
  });
});


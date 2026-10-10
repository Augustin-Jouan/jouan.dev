import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { etudesDeCas } from "@/data/realisations";
import RealisationsPage, { metadata } from "./page";

describe("page des réalisations", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });

  it("montre les deux études complètes à la suite : le suivi de marchés, puis le site d'artisan", () => {
    render(<RealisationsPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Quelques projets récents");
    const etudes = screen.getAllByRole("article");
    expect(etudes.map((etude) => etude.id)).toEqual(["suivi-de-marches", "site-vitrine"]);
    etudes.forEach((article, i) => {
      const etude = etudesDeCas[i];
      expect(within(article).getByRole("heading", { level: 2 })).toHaveTextContent(etude.titre);
      for (const chiffre of etude.chiffres) expect(within(article).getByText(chiffre.libelle)).toBeInTheDocument();
      expect(within(article).getAllByRole("heading", { level: 3 }).slice(0, 4).map((h) => h.textContent)).toEqual([
        "Le besoin",
        etude.media.type === "demo" ? "La démo" : "Le résultat",
        "Ce que j'ai livré",
        "Sous le capot",
      ]);
    });
    expect(within(etudes[0]).queryByRole("link", { name: "Voir le site" })).toBeNull();
    expect(within(etudes[0]).getByRole("link", { name: /Ouvrir la démo en plein écran/ })).toBeInTheDocument();
    expect(within(etudes[1]).getByText("Site vitrine · SARL Dufourd Jérôme, électricien-plombier à Châteaubriant")).toBeInTheDocument();
    expect(within(etudes[1]).getByRole("link", { name: "Voir le site" })).toHaveAttribute("href", "https://sdj-elec.jouan.dev/");
    expect(screen.getAllByRole("link", { name: "Parlons-en" })).toHaveLength(1);
  });

  it("déclare son titre, sa description et son adresse canonique", () => {
    expect(metadata.title).toBe("Réalisations");
    expect(metadata.description).toBeTruthy();
    expect(metadata.alternates?.canonical).toBe("/realisations");
  });
});

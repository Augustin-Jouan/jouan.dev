import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RealisationsPage, { metadata } from "./page";

describe("page des réalisations", () => {
  it("montre le suivi de marchés puis le site d'artisan, chacun vers son étude de cas", () => {
    render(<RealisationsPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Quelques projets récents");
    const cartes = screen.getAllByRole("article");
    expect(cartes.map((carte) => within(carte).getByRole("heading", { level: 2 }).textContent)).toEqual([
      "Suivi de marchés de travaux",
      "Site vitrine d'artisan",
    ]);
    expect(within(cartes[0]).getByRole("link", { name: "Suivi de marchés de travaux" })).toHaveAttribute(
      "href",
      "/realisations/suivi-de-marches",
    );
    expect(within(cartes[1]).getByRole("link", { name: "Site vitrine d'artisan" })).toHaveAttribute(
      "href",
      "/realisations/site-artisan",
    );
    expect(within(cartes[1]).getByRole("link", { name: "Voir le site" })).toHaveAttribute(
      "href",
      "https://sdj-elec.jouan.dev/",
    );
    expect(within(cartes[0]).queryByRole("link", { name: "Voir le site" })).toBeNull();
  });

  it("déclare son titre et son adresse canonique", () => {
    expect(metadata.title).toBe("Réalisations");
    expect(metadata.alternates?.canonical).toBe("/realisations");
  });
});

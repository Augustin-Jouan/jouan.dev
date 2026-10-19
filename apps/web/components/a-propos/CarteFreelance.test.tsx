import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { cheminEtude, etudesDeCas } from "@/data/realisations";
import { CarteFreelance } from "./CarteFreelance";

describe("CarteFreelance", () => {
  it("résume une étude et renvoie vers elle sur /realisations", () => {
    const etude = etudesDeCas.find((e) => e.slug === "site-artisan")!;
    render(<CarteFreelance slug="site-artisan" />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(etude.titre);
    expect(screen.getByText(etude.sousTitre)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Voir l'étude/ })).toHaveAttribute("href", cheminEtude("site-artisan"));
  });
});

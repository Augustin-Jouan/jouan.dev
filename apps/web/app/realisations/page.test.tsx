import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { etudesDeCas } from "@/data/realisations";
import RealisationsPage, { metadata } from "./page";

describe("page des réalisations", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });

  it("range les études sous deux onglets : le suivi de marchés en application métier, le site d'artisan en site vitrine", () => {
    render(<RealisationsPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Quelques projets récents");
    expect(screen.getAllByRole("tab").map((o) => o.textContent)).toEqual(["Application métier", "Site vitrine"]);
    expect(within(screen.getByRole("tabpanel", { name: "Application métier" })).getByRole("article")).toHaveAttribute("id", "suivi-de-marches");
  });

  it("chaque étude est complète (les deux restent dans la page : sans JavaScript, elles se suivent)", () => {
    render(<RealisationsPage />);
    const etudes = screen.getAllByRole("article");
    expect(etudes.map((etude) => etude.id)).toEqual(["suivi-de-marches", "site-vitrine"]);
    etudes.forEach((article, i) => {
      const etude = etudesDeCas[i];
      expect(within(article).getByRole("heading", { level: 2 })).toHaveTextContent(etude.titre);
      // Plus de chiffres clés : la démo, puis directement le besoin.
      expect(article.querySelector("dl")).toBeNull();
      expect(within(article).getAllByRole("heading", { level: 3 }).slice(0, 4).map((h) => h.textContent)).toEqual([
        // La démo d'abord (intitulé réservé aux lecteurs d'écran), puis les explications.
        etude.media.type === "demo" ? "La démo" : "Le résultat",
        "Le besoin",
        "Ce que j'ai livré",
        "Sous le capot",
      ]);
    });
    expect(within(etudes[0]).queryByRole("link", { name: /^Voir le site\s*\(nouvel onglet\)$/ })).toBeNull();
    expect(within(etudes[0]).getByRole("link", { name: /Ouvrir la démo en plein écran/ })).toBeInTheDocument();
    expect(within(etudes[1]).getByText("Site vitrine · SARL Dufourd Jérôme, électricien-plombier à Châteaubriant")).toBeInTheDocument();
    expect(within(etudes[1]).getByRole("link", { name: /^Voir le site\s*\(nouvel onglet\)$/ })).toHaveAttribute("href", "https://sdj-elec.jouan.dev/");
    expect(screen.getAllByRole("link", { name: "Parlons-en" })).toHaveLength(1);
  });

  it("déclare son titre, sa description et son adresse canonique", () => {
    expect(metadata.title).toBe("Réalisations");
    expect(metadata.description).toBeTruthy();
    expect(metadata.alternates?.canonical).toBe("/realisations");
  });
});

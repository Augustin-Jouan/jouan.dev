import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Accueil } from "./Accueil";

describe("Accueil", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  });

  it("sans personnalisation : pas de salutation, offre application d'abord, pas de champ pour", () => {
    const { container } = render(<Accueil />);
    expect(screen.queryByText(/^Bonjour/)).toBeNull();
    const offres = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(offres[0]).toBe("Application métier sur mesure");
    expect(container.querySelector('input[name="pour"]')).toBeNull();
  });

  it("montre le portrait d'Augustin avant le titre, sans surtitre, pour qu'on voie tout de suite à qui l'on parle", () => {
    render(<Accueil />);
    const portrait = screen.getByRole("img", { name: "Augustin Jouan" });
    expect(portrait.getAttribute("src")).toContain("augustin-jouan.webp");
    const titre = screen.getByRole("heading", { level: 1 });
    expect(portrait.compareDocumentPosition(titre) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText("Développeur full stack · indépendant")).toBeNull();
  });

  it("angle vitrine : salutation échappée, accroche, offre et étude vitrine d'abord, champ caché", () => {
    const { container } = render(
      <Accueil personnalisation={{ nom: "<b>Boulangerie</b> 🍞", angle: "vitrine", jeton: "boulangerie-k7f3" }} />,
    );
    expect(screen.getByText("Bonjour <b>Boulangerie</b> 🍞,")).toBeInTheDocument();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Un site vitrine qui vous ressemble");
    const titres = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titres.indexOf("Site vitrine")).toBeLessThan(titres.indexOf("Application métier sur mesure"));
    // Chaque offre emporte son exemple : celui du site d'artisan vient donc en premier.
    const exemples = screen.getAllByRole("link", { name: /^Voir l'exemple : / }).map((a) => a.getAttribute("href"));
    expect(exemples).toEqual(["/realisations#site-vitrine", "/realisations#suivi-de-marches"]);
    expect(container.querySelector('input[name="pour"]')).toHaveValue("boulangerie-k7f3");
    expect(within(container).getByText("Mon cœur de métier").closest("article")).toHaveTextContent("Site vitrine");
    // Plus de repère de section pour les curseurs du direct : seul le compteur reste.
    expect(container.querySelector("[data-direct-section]")).toBeNull();
    const ligne = screen.getByTestId("compteur-presents");
    const salut = screen.getByText("Bonjour <b>Boulangerie</b> 🍞,");
    expect(ligne.compareDocumentPosition(salut) & Node.DOCUMENT_POSITION_FOLLOWING).toBeGreaterThan(0);
  });
});


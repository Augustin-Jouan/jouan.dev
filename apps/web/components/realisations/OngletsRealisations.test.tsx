import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { OngletsRealisations } from "./OngletsRealisations";

const panneaux = { "application-metier": <p>Étude métier</p>, "site-vitrine": <p>Étude vitrine</p> };

function afficher(hash = "") {
  window.history.replaceState(null, "", `/realisations${hash}`);
  const rendu = render(<OngletsRealisations panneaux={panneaux} />);
  const racine = rendu.container.firstElementChild as HTMLElement;
  return { ...rendu, racine };
}

const onglet = (nom: string) => screen.getByRole("tab", { name: nom });

afterEach(() => window.history.replaceState(null, "", "/"));

describe("onglets de /realisations", () => {
  it("deux onglets ; sans ancre, l'application métier est choisie", () => {
    const { racine } = afficher();
    expect(screen.getAllByRole("tab").map((o) => o.textContent)).toEqual(["Application métier", "Site vitrine"]);
    expect(onglet("Application métier")).toHaveAttribute("aria-selected", "true");
    expect(onglet("Site vitrine")).toHaveAttribute("aria-selected", "false");
    expect(racine).toHaveAttribute("data-categorie", "application-metier");
  });

  it("au rendu serveur, aucun onglet n'est choisi : sans JavaScript, onglets cachés et études à la suite", () => {
    expect(renderToString(<OngletsRealisations panneaux={panneaux} />)).not.toContain("data-categorie");
  });

  it("chaque panneau porte son étude, relié à son onglet", () => {
    afficher();
    const panneau = screen.getByRole("tabpanel", { name: "Application métier" });
    expect(panneau).toHaveTextContent("Étude métier");
    expect(onglet("Application métier")).toHaveAttribute("aria-controls", panneau.id);
    // L'autre panneau est masqué par le CSS (data-categorie), pas retiré du DOM : sans JavaScript, tout reste lisible.
    expect(screen.getByText("Étude vitrine")).toBeInTheDocument();
  });

  it("l'ancre d'une étude ouvre son onglet (lien de l'accueil vers #site-vitrine)", () => {
    const { racine } = afficher("#site-vitrine");
    expect(onglet("Site vitrine")).toHaveAttribute("aria-selected", "true");
    expect(racine).toHaveAttribute("data-categorie", "site-vitrine");
  });

  it("un clic change d'onglet et inscrit son ancre dans l'adresse, sans ajouter d'entrée à l'historique", () => {
    const { racine } = afficher();
    const longueur = window.history.length;
    fireEvent.click(onglet("Site vitrine"));
    expect(onglet("Site vitrine")).toHaveAttribute("aria-selected", "true");
    expect(racine).toHaveAttribute("data-categorie", "site-vitrine");
    expect(window.location.hash).toBe("#site-vitrine");
    expect(window.history.length).toBe(longueur);
  });

  it("au clavier : les flèches passent d'un onglet à l'autre, en boucle, et y portent le focus", () => {
    afficher();
    onglet("Application métier").focus();
    fireEvent.keyDown(onglet("Application métier"), { key: "ArrowRight" });
    expect(onglet("Site vitrine")).toHaveFocus();
    expect(onglet("Site vitrine")).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(onglet("Site vitrine"), { key: "ArrowRight" });
    expect(onglet("Application métier")).toHaveFocus();
    fireEvent.keyDown(onglet("Application métier"), { key: "End" });
    expect(onglet("Site vitrine")).toHaveFocus();
    fireEvent.keyDown(onglet("Site vitrine"), { key: "Home" });
    expect(onglet("Application métier")).toHaveFocus();
  });

  it("seul l'onglet choisi est dans l'ordre de tabulation", () => {
    afficher();
    expect(onglet("Application métier")).toHaveAttribute("tabindex", "0");
    expect(onglet("Site vitrine")).toHaveAttribute("tabindex", "-1");
  });

  it("suit l'ancre quand elle change sur la page (palette de commandes, retour arrière)", () => {
    const { racine } = afficher();
    act(() => {
      window.history.pushState(null, "", "/realisations#site-vitrine");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(onglet("Site vitrine")).toHaveAttribute("aria-selected", "true");
    expect(racine).toHaveAttribute("data-categorie", "site-vitrine");
  });
});

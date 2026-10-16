import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Offre } from "./Offre";

const choix = () => screen.getByRole("radiogroup", { name: "Type d'offre" });

describe("Offre : onglets sur téléphone", () => {
  it("deux choix, l'offre mise en avant cochée : sans JavaScript, le CSS ne montre que sa carte", () => {
    render(<Offre />);
    const [application, vitrine] = within(choix()).getAllByRole("radio");
    expect(within(choix()).getAllByRole("radio")).toHaveLength(2);
    expect(application).toHaveAccessibleName("Application métier");
    expect(vitrine).toHaveAccessibleName("Site vitrine");
    expect(application).toBeChecked();
    expect(vitrine).not.toBeChecked();
    // Les deux cartes restent dans la page : sur ordinateur, elles sont côte à côte, sans onglets.
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("lien personnalisé orienté site vitrine : son onglet vient en premier, coché", () => {
    render(<Offre angle="vitrine" />);
    const [premier] = within(choix()).getAllByRole("radio");
    expect(premier).toHaveAccessibleName("Site vitrine");
    expect(premier).toBeChecked();
  });

  it("choisir l'autre onglet le coche, sans toucher à l'adresse", () => {
    window.history.replaceState(null, "", "/");
    render(<Offre />);
    const vitrine = screen.getByRole("radio", { name: "Site vitrine" });
    fireEvent.click(vitrine);
    expect(vitrine).toBeChecked();
    expect(screen.getByRole("radio", { name: "Application métier" })).not.toBeChecked();
    expect(window.location.hash).toBe("");
  });

  it("chaque carte se masque quand l'autre onglet est choisi, seulement tant qu'elles sont empilées", () => {
    render(<Offre />);
    const [application, vitrine] = screen.getAllByRole("article");
    expect(application!.className).toContain("max-lg:group-has-[#offre-choix-vitrine:checked]/offres:hidden");
    expect(vitrine!.className).toContain("max-lg:group-has-[#offre-choix-application:checked]/offres:hidden");
  });
});

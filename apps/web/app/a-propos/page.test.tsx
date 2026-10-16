import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AProposPage, { metadata } from "./page";

describe("page /a-propos", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  });

  it("un seul h1, puis les projets avant le parcours", () => {
    render(<AProposPage />);
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Augustin Jouan"]);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Projets", "Parcours"]);
  });

  it("les projets d'école dans l'ordre, puis les deux études freelance", () => {
    render(<AProposPage />);
    const projets = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(projets.slice(0, 3)).toEqual(["Time Manager", "EpitChat", "JOJA"]);
    expect(screen.getAllByRole("link", { name: /Voir l'étude/ })).toHaveLength(2);
  });

  it("titre et adresse canonique propres à la page", () => {
    expect(metadata.title).toBe("À propos");
    expect(metadata.alternates?.canonical).toBe("/a-propos");
  });
});

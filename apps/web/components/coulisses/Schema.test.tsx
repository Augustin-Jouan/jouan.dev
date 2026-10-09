import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MagasinMesures } from "@/lib/coulisses/magasin";
import { Schema } from "./Schema";

function rendre(choisi: "navigateur" | "proxy" = "navigateur") {
  const magasin = new MagasinMesures();
  magasin.ajouter("site", 42);
  magasin.indisponible("tempsReel");
  const choisir = vi.fn();
  render(<Schema choisi={choisi} choisir={choisir} mesures={magasin.etat()} />);
  // jsdom n'applique pas les media queries : les deux variantes sont présentes, la première est la large.
  const [large] = screen.getAllByRole("group", { name: "Schéma de l'architecture" });
  return { choisir, large: within(large!) };
}

describe("Schema", () => {
  it("rend deux variantes (large et étroite) des mêmes nœuds", () => {
    rendre();
    expect(screen.getAllByRole("group", { name: "Schéma de l'architecture" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^Proxy/ })).toHaveLength(2);
  });

  it("indique le nœud choisi par aria-pressed", () => {
    const { large } = rendre("proxy");
    expect(large.getByRole("button", { name: /^Proxy/ })).toHaveAttribute("aria-pressed", "true");
    expect(large.getByRole("button", { name: /^Navigateur/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("choisit un nœud au clic, à Entrée et à Espace", () => {
    const { choisir, large } = rendre();
    const base = large.getByRole("button", { name: /^Base/ });
    fireEvent.click(base);
    fireEvent.keyDown(base, { key: "Enter" });
    fireEvent.keyDown(base, { key: " " });
    expect(choisir.mock.calls).toEqual([["base"], ["base"], ["base"]]);
  });

  it("chaque nœud est atteignable au clavier", () => {
    const { large } = rendre();
    for (const b of large.getAllByRole("button")) expect(b).toHaveAttribute("tabindex", "0");
  });

  it("affiche les mesures sur les liaisons", () => {
    const { large } = rendre();
    expect(large.getByText("42\u00a0ms", { collapseWhitespace: false })).toBeInTheDocument();
    expect(large.getByText("indisponible")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MagasinMesures } from "@/lib/coulisses/magasin";
import { PanneauEnDirect } from "./PanneauEnDirect";

describe("PanneauEnDirect", () => {
  it("donne la dernière valeur et la médiane de chaque série, ou son indisponibilité", () => {
    const m = new MagasinMesures();
    for (const v of [10, 30, 20]) m.ajouter("site", v);
    m.indisponible("tempsReel");
    render(<PanneauEnDirect mesures={m.etat()} />);
    expect(screen.getByTestId("mesure-site")).toHaveTextContent("Vous → site");
    // toHaveTextContent normalise le NBSP ; on affirme le caractère dans le DOM.
    expect(screen.getByTestId("mesure-site").textContent).toContain("20\u00a0ms");
    expect(screen.getByTestId("mesure-site").textContent).toContain("médiane 20\u00a0ms");
    expect(screen.getByTestId("mesure-base")).toHaveTextContent("…");
    expect(screen.getByTestId("mesure-tempsReel")).toHaveTextContent("indisponible");
  });

  it("n'annonce pas les valeurs qui changent toutes les 2 s", () => {
    render(<PanneauEnDirect mesures={new MagasinMesures().etat()} />);
    expect(screen.getByTestId("mesure-site").closest("[aria-live]")).toBeNull();
  });
});

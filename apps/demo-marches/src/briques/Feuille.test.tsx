import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Feuille } from "./Feuille";
import { Tableau } from "./Tableau";

describe("Feuille", () => {
  it("est un document sur fond de papier, avec un placement", () => {
    render(<Feuille aria-label="Certificat" className="self-stretch">contenu</Feuille>);
    const f = screen.getByRole("article", { name: "Certificat" });
    expect(f).toHaveClass("bg-feuille", "text-feuille-encre", "border-feuille-trait", "self-stretch");
  });

  it("le tableau « certificat » porte ses lignes et son total par attributs", () => {
    render(<Tableau variante="certificat"><tbody><tr data-total><th scope="row">Total</th><td data-droite>1</td></tr></tbody></Tableau>);
    const t = screen.getByRole("table").className;
    expect(t).toContain("[&_tr[data-total]]:font-semibold");
    expect(t).toContain("[&_[data-droite]]:text-right");
    expect(t).not.toContain("min-w-");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Champ } from "./Champ";

describe("Champ", () => {
  it("relie le libellé à la saisie", () => {
    render(<Champ libelle="Montant" aide="En euros" />);
    expect(screen.getByLabelText("Montant")).toHaveAccessibleDescription("En euros");
  });
  it("annonce l'erreur", () => {
    render(<Champ libelle="Montant" erreur="Valeur invalide" />);
    const saisie = screen.getByLabelText("Montant");
    expect(saisie).toHaveAttribute("aria-invalid", "true");
    expect(saisie).toHaveAccessibleDescription("Valeur invalide");
  });
});

describe("Champ : aide et erreur", () => {
  it("référence les deux dans aria-describedby", () => {
    render(<Champ libelle="Montant" aide="En euros" erreur="Valeur invalide" />);
    const saisie = screen.getByLabelText("Montant");
    expect(saisie.getAttribute("aria-describedby")!.split(" ")).toHaveLength(2);
    expect(saisie).toHaveAccessibleDescription("Valeur invalide En euros");
  });
  it("applique className au conteneur", () => {
    const { container } = render(<Champ libelle="M" className="col-span-2" />);
    expect(container.firstChild).toHaveClass("col-span-2");
  });
});

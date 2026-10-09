import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tableau } from "./Tableau";

describe("Tableau lots", () => {
  it("la colonne figée et le pied passent par des attributs data-*", () => {
    render(
      <Tableau variante="lots">
        <thead><tr><th data-colle>Lot</th></tr></thead>
        <tbody><tr><td data-colle>x</td></tr></tbody>
        <tfoot><tr><th data-colle scope="row">Total</th></tr></tfoot>
      </Tableau>,
    );
    const t = screen.getByRole("table").className;
    expect(t).toContain("[&_[data-colle]]:sticky");
    expect(t).toContain("[&_tfoot_th]:py-2.5");
  });
});

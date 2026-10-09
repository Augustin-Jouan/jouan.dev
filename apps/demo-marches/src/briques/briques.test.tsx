import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CleValeur } from "./CleValeur";
import { Etiquette } from "./Etiquette";
import { Tableau } from "./Tableau";
import { cx } from "./cx";

describe("briques simples", () => {
  it("cx ignore les valeurs vides", () => {
    expect(cx("a", false, null, undefined, "", "b")).toBe("a b");
  });
  it("Etiquette affiche son texte", () => {
    render(<Etiquette ton="alerte">Retard</Etiquette>);
    expect(screen.getByText("Retard")).toBeInTheDocument();
  });
  it("CleValeur associe clé et valeur", () => {
    render(<CleValeur cle="Cumul" valeur="12" />);
    expect(screen.getByText("Cumul").tagName).toBe("DT");
    expect(screen.getByText("12").tagName).toBe("DD");
  });
  it("Tableau rend une table", () => {
    render(<Tableau variante="lots"><tbody><tr data-ouvert><td data-droite>1</td></tr></tbody></Tableau>);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});

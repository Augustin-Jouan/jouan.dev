import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Carte } from "./Carte";

describe("Carte", () => {
  it("encadre son contenu et accepte un placement", () => {
    render(<Carte className="self-start">contenu</Carte>);
    const c = screen.getByText("contenu");
    expect(c).toHaveClass("rounded-md", "border", "bg-surface", "self-start");
  });
});

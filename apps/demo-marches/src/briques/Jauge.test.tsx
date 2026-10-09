import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Jauge } from "./Jauge";

describe("Jauge", () => {
  it("est un indicateur nommé de 0 à 100", () => {
    render(<Jauge libelle="Avancement" valeur={54} />);
    const m = screen.getByRole("meter", { name: "Avancement" });
    expect(m).toHaveAttribute("aria-valuemin", "0");
    expect(m).toHaveAttribute("aria-valuemax", "100");
    expect(m).toHaveAttribute("aria-valuenow", "54");
  });
  it("borne la valeur", () => {
    const { rerender } = render(<Jauge libelle="J" valeur={140} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
    rerender(<Jauge libelle="J" valeur={-5} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
  });
});

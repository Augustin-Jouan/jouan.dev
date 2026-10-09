import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Bouton } from "./Bouton";

describe("Bouton", () => {
  it("est secondaire et de type button par défaut", () => {
    render(<Bouton>Valider</Bouton>);
    const b = screen.getByRole("button", { name: "Valider" });
    expect(b).toHaveAttribute("type", "button");
    expect(b).toHaveClass("bg-raise");
  });
  it("principal prend l'accent", () => {
    render(<Bouton variante="principal">Valider</Bouton>);
    expect(screen.getByRole("button")).toHaveClass("bg-accent");
  });
  it("désactivé, il ne réagit pas", async () => {
    const f = vi.fn();
    render(<Bouton disabled onClick={f}>Valider</Bouton>);
    await userEvent.click(screen.getByRole("button"));
    expect(f).not.toHaveBeenCalled();
  });
});

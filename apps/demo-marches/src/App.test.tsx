import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("affiche le nom de la démo et le bandeau des données fictives", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "Suivi de marchés" })).toBeInTheDocument();
    expect(screen.getByText("Démo — données fictives")).toBeInTheDocument();
  });

  it("propose les onglets Marchés et Planning, flèche droite ouvre le planning", async () => {
    render(<App />);
    expect(screen.getByRole("tab", { name: "Marchés", selected: true })).toBeInTheDocument();
    const planning = screen.getByRole("tab", { name: "Planning" });
    expect(planning).toHaveAttribute("aria-selected", "false");
    screen.getByRole("tab", { name: "Marchés" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tabpanel", { name: "Planning" })).toBeVisible();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("affiche le nom de la démo et le bandeau des données fictives", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "Suivi de marchés" })).toBeInTheDocument();
    expect(screen.getByText("Démo — données fictives")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Coquille } from "./Coquille";

describe("Coquille", () => {
  it("affiche le bandeau, le titre, le chantier et le contenu", () => {
    render(
      <Coquille enTete={<p>onglets</p>} surReinitialisation={() => {}}>
        <p>contenu</p>
      </Coquille>,
    );
    expect(screen.getByText("Démo — données fictives")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Suivi de marchés" })).toBeInTheDocument();
    expect(screen.getByText("Réhabilitation de 12 logements")).toBeInTheDocument();
    expect(screen.getByText("Rue des Tilleuls")).toBeInTheDocument();
    expect(screen.getByText("onglets")).toBeInTheDocument();
    expect(screen.getByText("contenu")).toBeInTheDocument();
  });

  it("le bouton de réinitialisation appelle le rappel", async () => {
    const rappel = vi.fn();
    render(<Coquille enTete={null} surReinitialisation={rappel}>x</Coquille>);
    await userEvent.click(screen.getByRole("button", { name: "Réinitialiser la démo" }));
    expect(rappel).toHaveBeenCalledOnce();
  });
});

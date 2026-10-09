import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CHANTIER } from "../donnees/chantier";
import { etatInitial } from "../donnees/etat";
import { Planning } from "./Planning";

describe("Planning", () => {
  it("place une barre par lot sur la frise des semaines", () => {
    render(<Planning lots={etatInitial().lots} />);
    expect(screen.getAllByRole("button", { name: /^Lot \d{2} — / })).toHaveLength(CHANTIER.lots.length);
    expect(screen.getAllByRole("columnheader")).toHaveLength(1 + 21); // Lot + 21 semaines (7 sept. → 25 janv.)
  });

  it("met un lot en évidence et affiche son détail au clic", async () => {
    render(<Planning lots={etatInitial().lots} />);
    const barre = screen.getByTestId("barre-l7");
    await userEvent.click(barre);
    expect(barre).toHaveAttribute("data-actif");
    const detail = screen.getByRole("region", { name: "Détail du lot" });
    expect(within(detail).getByText("Carrelages Morel")).toBeInTheDocument();
    expect(detail).toHaveTextContent("du lundi 7 décembre 2026 au vendredi 8 janvier 2027");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "Détail du lot" })).not.toBeInTheDocument();
  });

  it("nomme chaque barre avec ses dates courtes", () => {
    render(<Planning lots={etatInitial().lots} />);
    expect(screen.getByRole("button", { name: "Lot 07 — Carrelage — faïence, du 7 déc. au 8 janv." })).toBeInTheDocument();
  });

  it("efface le détail au second clic sur la même barre", async () => {
    render(<Planning lots={etatInitial().lots} />);
    const barre = screen.getByTestId("barre-l7");
    await userEvent.click(barre);
    await userEvent.click(barre);
    expect(screen.queryByRole("region", { name: "Détail du lot" })).not.toBeInTheDocument();
  });

  it("marque la ligne et la barre au survol", async () => {
    render(<Planning lots={etatInitial().lots} />);
    const barre = screen.getByTestId("barre-l2");
    await userEvent.hover(barre);
    expect(barre).toHaveAttribute("data-actif");
    expect(barre.closest("tr")).toHaveAttribute("data-actif");
    await userEvent.unhover(barre);
    expect(barre).not.toHaveAttribute("data-actif");
  });
});

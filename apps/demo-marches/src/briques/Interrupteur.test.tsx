import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Interrupteur } from "./Interrupteur";

function Exemple() {
  const [actif, setActif] = useState(false);
  return <Interrupteur libelle="Avenants" actif={actif} surChangement={setActif} />;
}

describe("Interrupteur", () => {
  it("bascule au clic et à Espace", async () => {
    render(<Exemple />);
    const bouton = screen.getByRole("switch", { name: "Avenants" });
    expect(bouton).toHaveAttribute("aria-checked", "false");
    await userEvent.click(bouton);
    expect(bouton).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard(" ");
    expect(bouton).toHaveAttribute("aria-checked", "false");
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Surcouche } from "./Surcouche";

function Exemple() {
  const [panneau, setPanneau] = useState(false);
  const [apercu, setApercu] = useState(false);
  return (
    <>
      <button onClick={() => setPanneau(true)}>Ouvrir</button>
      <Surcouche ouverte={panneau} titre="Lot 07" variante="panneau" surFermeture={() => setPanneau(false)}>
        <button onClick={() => setApercu(true)}>Certificat</button>
        <Surcouche ouverte={apercu} titre="Certificat" variante="apercu" surFermeture={() => setApercu(false)}>
          <input aria-label="Cumul" />
        </Surcouche>
      </Surcouche>
    </>
  );
}

describe("Surcouche", () => {
  it("Échap ferme la plus haute et rend le focus à son déclencheur", async () => {
    render(<Exemple />);
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    expect(screen.getByRole("dialog", { name: "Lot 07" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Certificat" }));
    expect(screen.getByRole("dialog", { name: "Certificat" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Certificat" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Lot 07" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Certificat" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Ouvrir" })).toHaveFocus();
  });

  it("garde le focus à l'intérieur", async () => {
    render(<Exemple />);
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    for (let i = 0; i < 5; i += 1) await userEvent.tab();
    expect(screen.getByRole("dialog", { name: "Lot 07" })).toContainElement(document.activeElement as HTMLElement);
    for (let i = 0; i < 5; i += 1) await userEvent.tab({ shift: true });
    expect(screen.getByRole("dialog", { name: "Lot 07" })).toContainElement(document.activeElement as HTMLElement);
  });

  it("est modale, déplace le focus à l'ouverture et fige la page", async () => {
    render(<Exemple />);
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    const dialogue = screen.getByRole("dialog", { name: "Lot 07" });
    expect(dialogue).toHaveAttribute("aria-modal", "true");
    expect(dialogue).toContainElement(document.activeElement as HTMLElement);
    expect(document.querySelector("[data-verrou-defilement]")).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    expect(document.querySelector("[data-verrou-defilement]")).toBeNull();
  });
});

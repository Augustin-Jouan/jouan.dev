import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { etapes } from "@/data/accueil";
import { Methode } from "./Methode";

describe("Methode", () => {
  it("garde les cinq étapes lisibles, dans l'ordre, numérotées pour l'œil seulement", () => {
    const { container } = render(<Methode />);
    const liste = screen.getByRole("list");
    const lignes = within(liste).getAllByRole("listitem");
    expect(lignes.map((li) => within(li).getByRole("heading", { level: 3 }).textContent)).toEqual(etapes.map((e) => e.titre));
    const numeros = [...container.querySelectorAll(".methode-num")];
    expect(numeros.map((n) => n.textContent)).toEqual(["01", "02", "03", "04", "05"]);
    for (const n of numeros) expect(n).toHaveAttribute("aria-hidden", "true");
  });

  it("dessine le fil, son remplissage et le paquet de lumière, ignorés des lecteurs d'écran", () => {
    const { container } = render(<Methode />);
    const fil = container.querySelector(".methode-fil");
    expect(fil).toHaveAttribute("aria-hidden", "true");
    expect(fil!.querySelector(".methode-fil__plein")).not.toBeNull();
    expect(fil!.querySelector(".methode-paquet")).not.toBeNull();
    expect(container.querySelectorAll(".methode-noeud")).toHaveLength(etapes.length);
  });

  it("donne à chaque étape son rang : le fil l'allume à son passage", () => {
    render(<Methode />);
    const lignes = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(lignes.map((li) => li.style.getPropertyValue("--i"))).toEqual(["0", "1", "2", "3", "4"]);
  });
});

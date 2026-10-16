import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { etapesParcours } from "@/data/a-propos";
import { FriseParcours } from "./FriseParcours";

describe("FriseParcours", () => {
  it("une entrée par étape, dans l'ordre, avec son année et son récit", () => {
    render(<FriseParcours etapes={etapesParcours} />);
    const entrees = within(screen.getByRole("list", { name: "Parcours" })).getAllByRole("listitem");
    expect(entrees).toHaveLength(etapesParcours.length);
    entrees.forEach((entree, i) => {
      const etape = etapesParcours[i]!;
      expect(within(entree).getByRole("heading", { level: 3 })).toHaveTextContent(etape.titre);
      expect(entree).toHaveTextContent(etape.annee);
      expect(entree).toHaveTextContent(etape.recit);
    });
  });

  it("les sites de l'école et de l'employeur s'ouvrent dans un nouvel onglet", () => {
    render(<FriseParcours etapes={etapesParcours} />);
    const externes = screen.getAllByRole("link", { name: /nouvel onglet/ });
    expect(externes.length).toBeGreaterThan(0);
    for (const lien of externes) {
      expect(lien).toHaveAttribute("target", "_blank");
      expect(lien).toHaveAttribute("rel", "noopener");
    }
    expect(screen.getAllByRole("link", { name: /SCR Informatique/ })[0]).toHaveAttribute("href", "https://www.scrinfo.net/");
  });

  it("l'étape Indépendant renvoie vers les réalisations", () => {
    render(<FriseParcours etapes={etapesParcours} />);
    expect(screen.getByRole("link", { name: /Voir les réalisations/ })).toHaveAttribute("href", "/realisations");
  });
});

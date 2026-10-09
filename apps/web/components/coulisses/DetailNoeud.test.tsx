import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { noeudDe } from "@/data/architecture";
import { MagasinMesures } from "@/lib/coulisses/magasin";
import { DetailNoeud } from "./DetailNoeud";

describe("DetailNoeud", () => {
  it("donne le rôle, la technologie et le pourquoi, annoncés aux lecteurs d'écran", () => {
    render(<DetailNoeud noeud={noeudDe("proxy")} mesures={new MagasinMesures().etat()} />);
    const titre = screen.getByRole("heading", { level: 3, name: "Proxy" });
    expect(titre.closest("[aria-live='polite']")).not.toBeNull();
    expect(screen.getByText(noeudDe("proxy").pourquoi)).toBeInTheDocument();
    expect(screen.queryByText("Mesure en direct")).toBeNull();
  });

  it("montre la mesure du nœud hors de la zone annoncée (pas d'annonce toutes les 2 s)", () => {
    const magasin = new MagasinMesures();
    magasin.ajouter("base", 1.2);
    render(<DetailNoeud noeud={noeudDe("base")} mesures={magasin.etat()} />);
    const mesure = screen.getByText("1,2\u00a0ms", { collapseWhitespace: false });
    expect(mesure.closest("[aria-live]")).toBeNull();
  });
});

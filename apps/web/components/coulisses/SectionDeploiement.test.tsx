import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { INFOS_EXEMPLE } from "@/lib/coulisses/outils-test";
import { SectionDeploiement } from "./SectionDeploiement";

describe("SectionDeploiement", () => {
  it("donne le commit, sa date et les preuves de qualité mesurées par la CI", () => {
    render(<SectionDeploiement infos={INFOS_EXEMPLE} />);
    expect(screen.getByRole("heading", { level: 2, name: "Dernier déploiement" })).toBeInTheDocument();
    expect(screen.getByText("0123456")).toBeInTheDocument();
    expect(screen.getByText(INFOS_EXEMPLE.titre)).toBeInTheDocument();
    expect(screen.getByText(/412 tests unitaires et d'intégration/)).toBeInTheDocument();
    expect(screen.getByText(/68 de bout en bout/)).toBeInTheDocument();
    expect(screen.getByText(/Performance 97/)).toBeInTheDocument();
    expect(screen.getByText(/155\u00a0Ko/, { collapseWhitespace: false })).toBeInTheDocument();
    expect(screen.getByText(/Mesurés par la CI sur ce commit/)).toBeInTheDocument();
    expect(screen.getByText(/la plus basse des 5 pages mesurées/)).toBeInTheDocument();
    const date = document.querySelector("time")!;
    expect(date).toHaveAttribute("dateTime", INFOS_EXEMPLE.date);
  });

  it("sans infos (build local) : le dit simplement", () => {
    render(<SectionDeploiement infos={null} />);
    expect(screen.getByText("Build local : pas de mesures CI.")).toBeInTheDocument();
  });
});

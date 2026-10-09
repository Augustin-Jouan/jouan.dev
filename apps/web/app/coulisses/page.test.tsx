import { vi } from "vitest";
// Un build-info.json local (ignoré par Git) ne doit pas changer le test.
vi.mock("@/lib/coulisses/build-info", () => ({ lireBuildInfo: () => null }));
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CoulissesPage, { metadata } from "./page";

describe("page /coulisses", () => {
  it("a son titre, sa phrase d'introduction et son adresse canonique", () => {
    render(<CoulissesPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Coulisses" })).toBeInTheDocument();
    expect(screen.getByText(/construit, hébergé et mesuré/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Architecture vivante" })).toBeInTheDocument();
    expect(metadata.alternates?.canonical).toBe("/coulisses");
    expect(screen.getByText("Build local : pas de mesures CI.")).toBeInTheDocument();
  });
});


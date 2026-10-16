import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { projetsEcole } from "@/data/a-propos";
import { BlocProjet } from "./BlocProjet";

const [timeManager, , joja] = projetsEcole;

describe("BlocProjet", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  });

  it("titre en h3, contexte, description, « Ma part » et une pastille par technologie", () => {
    render(<BlocProjet projet={timeManager!} inverse={false} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Time Manager");
    expect(screen.getByText(timeManager!.contexte)).toBeInTheDocument();
    expect(screen.getByText(timeManager!.description)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "Ma part" })).toBeInTheDocument();
    expect(screen.getByText(timeManager!.part)).toBeInTheDocument();
    const pastilles = within(screen.getByRole("list", { name: "Technologies" })).getAllByRole("listitem");
    expect(pastilles.map((p) => p.textContent)).toEqual(timeManager!.stack);
  });

  it("le média vient d'abord ; inversé, il passe en second sur ordinateur", () => {
    const { container, rerender } = render(<BlocProjet projet={timeManager!} inverse={false} />);
    const media = () => container.querySelector("[data-media]")!;
    expect(media()).not.toHaveClass("md:order-last");
    expect(media().querySelector("video")).not.toBeNull();
    rerender(<BlocProjet projet={timeManager!} inverse />);
    expect(media()).toHaveClass("md:order-last");
  });

  it("des graphiques : une image par entrée, avec son texte alternatif", () => {
    render(<BlocProjet projet={joja!} inverse={false} />);
    if (joja!.media.type !== "graphiques") throw new Error("JOJA doit avoir des graphiques");
    for (const image of joja!.media.images) expect(screen.getByAltText(image.alt)).toBeInTheDocument();
  });
});

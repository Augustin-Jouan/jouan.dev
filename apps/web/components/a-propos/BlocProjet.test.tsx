import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { projetsEcole } from "@/data/a-propos";
import { BlocProjet } from "./BlocProjet";

const [timeManager, epitchat] = projetsEcole;

describe("BlocProjet", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  });

  it("titre en h3, contexte, description et une pastille par technologie, sans « Ma part »", () => {
    render(<BlocProjet projet={epitchat!} inverse={false} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("EpitChat");
    expect(screen.getByText(epitchat!.contexte)).toBeInTheDocument();
    expect(screen.getByText(epitchat!.description)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 4 })).toBeNull();
    expect(screen.queryByText("Ma part")).toBeNull();
    const pastilles = within(screen.getByRole("list", { name: "Technologies" })).getAllByRole("listitem");
    expect(pastilles.map((p) => p.textContent)).toEqual(epitchat!.stack);
  });

  it("le média vient d'abord ; inversé, il passe en second sur ordinateur", () => {
    const { container, rerender } = render(<BlocProjet projet={timeManager!} inverse={false} />);
    const media = () => container.querySelector("[data-media]")!;
    expect(media()).not.toHaveClass("md:order-last");
    expect(media().querySelector("video")).not.toBeNull();
    rerender(<BlocProjet projet={timeManager!} inverse />);
    expect(media()).toHaveClass("md:order-last");
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ prefetch, ...reste }: ComponentProps<"a"> & { prefetch?: boolean | null }) => (
    <a data-prechargement={String(prefetch)} {...reste} />
  ),
}));

import { LienAuSurvol } from "./LienAuSurvol";

describe("LienAuSurvol", () => {
  it("ne précharge pas à l'affichage (le JS de la page d'arrivée ne compte pas dans celui de la page)", () => {
    render(<LienAuSurvol href="/">Accueil</LienAuSurvol>);
    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("data-prechargement", "false");
  });

  it.each([
    ["survol", (lien: HTMLElement) => fireEvent.mouseEnter(lien)],
    ["focus au clavier", (lien: HTMLElement) => fireEvent.focus(lien)],
    ["toucher", (lien: HTMLElement) => fireEvent.touchStart(lien)],
  ])("précharge dès une intention (%s)", (_nom, intention) => {
    const surFocus = vi.fn();
    render(
      <LienAuSurvol href="/" onFocus={surFocus}>
        Accueil
      </LienAuSurvol>,
    );
    const lien = screen.getByRole("link", { name: "Accueil" });
    intention(lien);
    expect(lien).toHaveAttribute("data-prechargement", "null");
  });

  it("garde les gestionnaires passés par l'appelant", () => {
    const surFocus = vi.fn();
    render(
      <LienAuSurvol href="/" onFocus={surFocus}>
        Accueil
      </LienAuSurvol>,
    );
    fireEvent.focus(screen.getByRole("link", { name: "Accueil" }));
    expect(surFocus).toHaveBeenCalled();
  });
});

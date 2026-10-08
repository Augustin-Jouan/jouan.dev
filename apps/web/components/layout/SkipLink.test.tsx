import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { SkipLink, CONTENU_ID } from "./SkipLink";

describe("SkipLink", () => {
  it("mène au contenu principal", () => {
    render(<SkipLink />);
    const lien = screen.getByRole("link", { name: "Aller au contenu" });
    expect(lien).toHaveAttribute("href", `#${CONTENU_ID}`);
  });

  it("reste hors écran tant qu'il n'a pas le focus clavier", async () => {
    render(<SkipLink />);
    const lien = screen.getByRole("link", { name: "Aller au contenu" });

    expect(lien).toHaveClass("sr-only");
    await userEvent.tab();
    expect(lien).toHaveFocus();
    expect(lien).toHaveClass("focus:not-sr-only");
  });
});

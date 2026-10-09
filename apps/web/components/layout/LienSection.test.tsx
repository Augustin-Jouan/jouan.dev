import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LienSection } from "./LienSection";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("LienSection", () => {
  it("sur l'accueil, change seulement le hash et garde la recherche", () => {
    window.history.replaceState(null, "", "/?pour=boulangerie-k7f3");
    render(<LienSection href="/#contact">Contact</LienSection>);
    const lien = screen.getByRole("link", { name: "Contact" });
    expect(fireEvent.click(lien)).toBe(false); // navigation du Link empêchée
    expect(window.location.search).toBe("?pour=boulangerie-k7f3");
    expect(window.location.hash).toBe("#contact");
  });

  it("ailleurs, laisse le Link naviguer", () => {
    window.history.replaceState(null, "", "/mentions-legales");
    render(<LienSection href="/#contact">Contact</LienSection>);
    const lien = screen.getByRole("link", { name: "Contact" });
    fireEvent.click(lien);
    expect(window.location.pathname).toBe("/mentions-legales");
    expect(window.location.hash).toBe("");
  });
});

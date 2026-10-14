import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { brancherDefilement } from "@/lib/defilement";
import { LienSection } from "./LienSection";

afterEach(() => {
  brancherDefilement(null);
  document.body.innerHTML = "";
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

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }])(
    "laisse le navigateur gérer un clic avec modificateur (%o) : nouvel onglet ou fenêtre",
    (modificateur) => {
      window.history.replaceState(null, "", "/?pour=boulangerie-k7f3");
      render(<LienSection href="/#contact">Contact</LienSection>);
      const lien = screen.getByRole("link", { name: "Contact" });
      expect(fireEvent.click(lien, modificateur)).toBe(true);
      expect(window.location.hash).toBe("");
    },
  );

  it("ailleurs, laisse le Link naviguer", () => {
    window.history.replaceState(null, "", "/mentions-legales");
    render(<LienSection href="/#contact">Contact</LienSection>);
    const lien = screen.getByRole("link", { name: "Contact" });
    fireEvent.click(lien);
    expect(window.location.pathname).toBe("/mentions-legales");
    expect(window.location.hash).toBe("");
  });

  it("avec le défilement doux, glisse jusqu'à la section au lieu de sauter", () => {
    const moteur = { scrollTo: vi.fn() };
    brancherDefilement(moteur);
    window.history.replaceState(null, "", "/?pour=boulangerie-k7f3");
    render(
      <>
        <LienSection href="/#contact">Contact</LienSection>
        <section id="contact" />
      </>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Contact" }));
    expect(moteur.scrollTo).toHaveBeenCalledWith(document.getElementById("contact"));
    expect(window.location.search).toBe("?pour=boulangerie-k7f3");
    expect(window.location.hash).toBe("#contact");
  });
});

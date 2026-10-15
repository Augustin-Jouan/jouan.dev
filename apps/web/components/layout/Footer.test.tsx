import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Footer } from "./Footer";
import { contact } from "@/data/contact";
import { navLinks } from "@/data/navigation";
import { EVENEMENT_OUVRIR_COMMANDES } from "@/lib/commandes/evenements";
import { hoteSite, siteName } from "@/data/site";

/** La colonne du pied de page titrée `titre` : son titre et ses liens, puis son indice. */
const colonne = (titre: string) => screen.getByRole("heading", { name: titre }).parentElement!.parentElement!;

describe("Footer", () => {
  it("range les liens en trois colonnes : Me joindre, Site, Légal", () => {
    render(<Footer />);
    const nav = screen.getByRole("navigation", { name: "Pied de page" });
    expect(within(nav).getAllByRole("heading").map((h) => h.textContent)).toEqual(["Me joindre", "Site", "Légal"]);

    const joindre = within(colonne("Me joindre"));
    expect(joindre.getByRole("link", { name: contact.email })).toHaveAttribute("href", `mailto:${contact.email}`);
    for (const [nom, href] of [
      ["GitHub", contact.github],
      ["LinkedIn", contact.linkedin],
    ] as const) {
      const lien = joindre.getByRole("link", { name: new RegExp(`^${nom}\\s*↗?\\s*\\(nouvel onglet\\)$`) });
      expect(lien).toHaveAttribute("href", href);
      // Le portfolio reste ouvert ; `me` relie le profil au site (rel=me).
      expect(lien).toHaveAttribute("target", "_blank");
      expect(lien).toHaveAttribute("rel", "me noopener");
    }

    const site = within(colonne("Site"));
    expect(site.getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual(
      navLinks.map((l) => [l.label, l.href]),
    );

    const legal = within(colonne("Légal"));
    expect(legal.getByRole("link", { name: "Mentions légales" })).toHaveAttribute("href", "/mentions-legales");
    expect(legal.getByRole("link", { name: "Politique de confidentialité" })).toHaveAttribute(
      "href",
      "/politique-de-confidentialite",
    );
  });

  it("n'est plus séparé de la page par un filet", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo").className).not.toMatch(/border-t/);
  });

  it("met un indice sous chaque colonne : curl, la palette de commandes, le ©", () => {
    const recu = vi.fn();
    window.addEventListener(EVENEMENT_OUVRIR_COMMANDES, recu);
    render(<Footer />);
    expect(within(colonne("Me joindre")).getByText(`curl -L ${hoteSite}`)).toBeInTheDocument();
    fireEvent.click(within(colonne("Site")).getByRole("button", { name: /pour naviguer/ }));
    window.removeEventListener(EVENEMENT_OUVRIR_COMMANDES, recu);
    expect(recu).toHaveBeenCalledTimes(1);
    expect(
      within(colonne("Légal")).getByText(`© ${new Date().getFullYear()} ${siteName}`),
    ).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Footer } from "./Footer";
import { contact } from "@/data/contact";
import { EVENEMENT_OUVRIR_COMMANDES } from "@/lib/commandes/evenements";
import { hoteSite, siteName } from "@/data/site";

describe("Footer", () => {
  it("donne l'e-mail, le GitHub et les pages légales", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: contact.email })).toHaveAttribute(
      "href",
      `mailto:${contact.email}`
    );
    const github = screen.getByRole("link", { name: /^GitHub\s*\(nouvel onglet\)$/ });
    expect(github).toHaveAttribute("href", contact.github);
    // Le portfolio reste ouvert ; `me` relie le profil au site (rel=me).
    expect(github).toHaveAttribute("target", "_blank");
    expect(github).toHaveAttribute("rel", "me noopener");
    expect(screen.getByRole("link", { name: "Mentions légales" })).toHaveAttribute(
      "href",
      "/mentions-legales"
    );
    expect(screen.getByRole("link", { name: "Politique de confidentialité" })).toHaveAttribute(
      "href",
      "/politique-de-confidentialite"
    );
    expect(screen.getByRole("link", { name: "Coulisses" })).toHaveAttribute("href", "/coulisses");
  });

  it("signe l'année en cours", () => {
    render(<Footer />);
    expect(screen.getByText(`© ${new Date().getFullYear()} ${siteName}`)).toBeInTheDocument();
  });

  it("indique la palette de commandes, qui s'ouvre au clic, et le CV par curl", () => {
    const recu = vi.fn();
    window.addEventListener(EVENEMENT_OUVRIR_COMMANDES, recu);
    render(<Footer />);
    fireEvent.click(screen.getByRole("button", { name: /pour naviguer/ }));
    window.removeEventListener(EVENEMENT_OUVRIR_COMMANDES, recu);
    expect(recu).toHaveBeenCalledTimes(1);
    expect(screen.getByText(`curl -L ${hoteSite}`)).toBeInTheDocument();
  });
});

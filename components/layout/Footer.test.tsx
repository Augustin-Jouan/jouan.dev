import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Footer } from "./Footer";
import { contact } from "@/data/contact";
import { siteName } from "@/data/site";

describe("Footer", () => {
  it("affiche les coordonnées cliquables", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: contact.telephone })).toHaveAttribute(
      "href",
      contact.telephoneLien
    );
    expect(screen.getByRole("link", { name: contact.email })).toHaveAttribute(
      "href",
      `mailto:${contact.email}`
    );
    expect(screen.getByText(contact.adresse)).toBeInTheDocument();
  });

  it("renvoie vers les pages légales et signe l'année en cours", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "Mentions légales" })).toHaveAttribute(
      "href",
      "/mentions-legales"
    );
    expect(
      screen.getByRole("link", { name: "Politique de confidentialité" })
    ).toHaveAttribute("href", "/politique-de-confidentialite");
    expect(
      screen.getByText(`© ${new Date().getFullYear()} ${siteName}`)
    ).toBeInTheDocument();
  });
});

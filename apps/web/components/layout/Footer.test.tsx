import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Footer } from "./Footer";
import { contact } from "@/data/contact";
import { siteName } from "@/data/site";

describe("Footer", () => {
  it("donne l'e-mail, le GitHub et les pages légales", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: contact.email })).toHaveAttribute(
      "href",
      `mailto:${contact.email}`
    );
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", contact.github);
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
});

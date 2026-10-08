import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ContactPage from "./page";
import { contact } from "@/data/contact";

describe("ContactPage", () => {
  it("affiche le formulaire et l'e-mail direct", () => {
    render(<ContactPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Contact" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nom")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: contact.email })).toHaveAttribute(
      "href",
      `mailto:${contact.email}`
    );
  });
});

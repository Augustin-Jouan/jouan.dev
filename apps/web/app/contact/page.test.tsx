import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ContactPage from "./page";
import { contact } from "@/data/contact";

describe("ContactPage", () => {
  it("affiche le formulaire et les coordonnées", () => {
    render(<ContactPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Contact" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nom")).toBeInTheDocument();
    expect(screen.getByText(contact.adresse)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: contact.telephone })).toHaveAttribute(
      "href",
      contact.telephoneLien
    );
  });
});

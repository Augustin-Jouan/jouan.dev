import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/contact/actions", () => ({
  submitContactForm: vi.fn(async () => ({
    status: "success",
    message: "Merci, votre message a bien été envoyé.",
  })),
}));

vi.mock("@/app/contact/limites", () => ({
  LIMITES: { nom: 80, email: 254, telephone: 30, message: 5000 },
}));

import { ContactForm } from "./ContactForm";

describe("ContactForm", () => {
  it("affiche les champs requis", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText("Nom")).toBeRequired();
    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText("Message")).toBeRequired();
  });

  it("informe au point de collecte : base légale, durée, droits et lien", () => {
    render(<ContactForm />);
    expect(screen.getByText(/mesures précontractuelles/i)).toBeInTheDocument();
    expect(screen.getByText(/trois ans/i)).toBeInTheDocument();
    expect(screen.getByText(/portabilité/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /politique de confidentialité/i })
    ).toHaveAttribute("href", "/politique-de-confidentialite");
  });

  it("affiche un message de succès après envoi", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Nom"), "Jean Dupont");
    await user.type(screen.getByLabelText("Email"), "jean@exemple.fr");
    await user.type(screen.getByLabelText("Message"), "Bonjour");
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Merci");
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, it, expect, vi } from "vitest";
import type { ContactFormState } from "@/app/contact/actions";

const { submitContactForm } = vi.hoisted(() => ({ submitContactForm: vi.fn() }));
vi.mock("@/app/contact/actions", () => ({ submitContactForm }));

const succes = async (): Promise<ContactFormState> => ({
  status: "success",
  message: "Merci, votre message a bien été envoyé.",
});

/** Refus du serveur qui renvoie la saisie, comme l'action réelle. */
const echec = async (_etat: ContactFormState, donnees: FormData): Promise<ContactFormState> => ({
  status: "error",
  message: "L'envoi a échoué. Merci de réessayer.",
  valeurs: {
    nom: String(donnees.get("nom")),
    email: String(donnees.get("email")),
    telephone: String(donnees.get("telephone")),
    message: String(donnees.get("message")),
  },
});

beforeEach(() => {
  submitContactForm.mockReset();
  submitContactForm.mockImplementation(succes);
});

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

  // Revue finale, Important 2 : React 19 réinitialise le formulaire avant
  // chaque action ; une erreur ne doit pas effacer la saisie.
  it("garde la saisie quand le serveur refuse l'envoi", async () => {
    submitContactForm.mockImplementation(echec);
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Nom"), "Jean Dupont");
    await user.type(screen.getByLabelText("Email"), "jean@exemple.fr");
    await user.type(screen.getByLabelText(/Téléphone/), "0612345678");
    await user.type(screen.getByLabelText("Message"), "Un long message à ne pas perdre.");
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("réessayer");
    expect(screen.getByLabelText("Nom")).toHaveValue("Jean Dupont");
    expect(screen.getByLabelText("Email")).toHaveValue("jean@exemple.fr");
    expect(screen.getByLabelText(/Téléphone/)).toHaveValue("0612345678");
    expect(screen.getByLabelText("Message")).toHaveValue("Un long message à ne pas perdre.");
  });

  it("vide le formulaire après un envoi réussi qui suit une erreur", async () => {
    submitContactForm.mockImplementationOnce(echec);
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Nom"), "Jean Dupont");
    await user.type(screen.getByLabelText("Email"), "jean@exemple.fr");
    await user.type(screen.getByLabelText("Message"), "Bonjour");
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Merci");
    expect(screen.getByLabelText("Nom")).toHaveValue("");
    expect(screen.getByLabelText("Message")).toHaveValue("");
  });
});

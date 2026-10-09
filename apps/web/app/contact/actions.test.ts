import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendContactEmail } = vi.hoisted(() => ({ sendContactEmail: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendContactEmail }));

const { lienPourAffichage } = vi.hoisted(() => ({ lienPourAffichage: vi.fn() }));
vi.mock("@/lib/liens/affichage", () => ({ lienPourAffichage }));

// L'action lit l'adresse de l'appelant pour la limitation de débit ; hors
// requête, on sert des en-têtes vides.
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

import { submitContactForm, type ContactFormState } from "./actions";
import { LIMITES } from "./limites";
import { reinitialiserLimites } from "@/lib/rate-limit";
import { contact } from "@/data/contact";

const idle: ContactFormState = { status: "idle", message: "" };

function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("submitContactForm", () => {
  beforeEach(() => {
    sendContactEmail.mockReset();
    sendContactEmail.mockResolvedValue(undefined);
    lienPourAffichage.mockReset();
    lienPourAffichage.mockResolvedValue(null);
    reinitialiserLimites();
  });

  it("envoie l'email quand les champs sont valides", async () => {
    const state = await submitContactForm(
      idle,
      buildFormData({ nom: "Jean", email: "jean@exemple.fr", telephone: "0612345678", message: "Bonjour" })
    );
    expect(sendContactEmail).toHaveBeenCalledOnce();
    expect(sendContactEmail.mock.calls[0][0]).toMatchObject({
      nom: "Jean",
      email: "jean@exemple.fr",
      telephone: "0612345678",
      message: "Bonjour",
    });
    expect(state.status).toBe("success");
  });

  it("rejette quand un champ obligatoire manque", async () => {
    const state = await submitContactForm(
      idle,
      buildFormData({ nom: "", email: "jean@exemple.fr", message: "Bonjour" })
    );
    expect(sendContactEmail).not.toHaveBeenCalled();
    expect(state.status).toBe("error");
  });

  it("rejette un email invalide", async () => {
    const state = await submitContactForm(
      idle,
      buildFormData({ nom: "Jean", email: "pas-un-email", message: "Bonjour" })
    );
    expect(sendContactEmail).not.toHaveBeenCalled();
    expect(state.status).toBe("error");
  });

  it("ignore silencieusement les bots quand le honeypot est rempli", async () => {
    const state = await submitContactForm(
      idle,
      buildFormData({ nom: "Jean", email: "jean@exemple.fr", message: "Bonjour", entreprise: "spam" })
    );
    expect(sendContactEmail).not.toHaveBeenCalled();
    expect(state.status).toBe("success");
  });

  it("signale le champ fautif au formulaire", async () => {
    const state = await submitContactForm(
      idle,
      buildFormData({ nom: "Jean", email: "pas-un-email", message: "Bonjour" })
    );
    expect(state.champ).toBe("email");
  });

  it("rejette un message plus long que la limite", async () => {
    const state = await submitContactForm(
      idle,
      buildFormData({
        nom: "Jean",
        email: "jean@exemple.fr",
        message: "a".repeat(LIMITES.message + 1),
      })
    );
    expect(sendContactEmail).not.toHaveBeenCalled();
    expect(state.status).toBe("error");
    expect(state.champ).toBe("message");
  });

  it("bloque les envois répétés au-delà du plafond horaire", async () => {
    const envoyer = () =>
      submitContactForm(
        idle,
        buildFormData({ nom: "Jean", email: "jean@exemple.fr", message: "Bonjour" })
      );

    for (let i = 0; i < 5; i += 1) {
      expect((await envoyer()).status).toBe("success");
    }

    const bloque = await envoyer();
    expect(bloque.status).toBe("error");
    expect(bloque.message).toMatch(/réessayer/i);
    expect(sendContactEmail).toHaveBeenCalledTimes(5);
  });

  it("retourne une erreur si l'envoi échoue", async () => {
    sendContactEmail.mockRejectedValue(new Error("smtp down"));
    const state = await submitContactForm(
      idle,
      buildFormData({ nom: "Jean", email: "jean@exemple.fr", message: "Bonjour" })
    );
    expect(state.status).toBe("error");
    expect(state.message).toContain("smtp down");
  });

  it("indique le code de l'erreur SMTP dans le message d'échec", async () => {
    sendContactEmail.mockRejectedValue(
      Object.assign(new Error("Invalid login: 535 5.7.8"), {
        code: "EAUTH",
        responseCode: 535,
        command: "AUTH PLAIN",
        response: "535-5.7.8 Username and Password not accepted.\n535 5.7.8 https://support.google.com/mail/?p=BadCredentials",
      })
    );
    const state = await submitContactForm(
      idle,
      buildFormData({ nom: "Jean", email: "jean@exemple.fr", message: "Bonjour" })
    );
    expect(state.message).toContain(
      "EAUTH 535 AUTH PLAIN 535-5.7.8 Username and Password not accepted. 535 5.7.8"
    );
  });

  it("propose l'e-mail direct quand l'envoi échoue", async () => {
    sendContactEmail.mockRejectedValue(new Error("smtp down"));
    const state = await submitContactForm(
      idle,
      buildFormData({ nom: "Jean", email: "jean@exemple.fr", message: "Bonjour" })
    );
    expect(state.status).toBe("error");
    expect(state.message).toContain(contact.email);
  });

  it("propose l'e-mail direct quand la limite d'envois est atteinte", async () => {
    const envoyer = () =>
      submitContactForm(
        idle,
        buildFormData({ nom: "Jean", email: "jean@exemple.fr", message: "Bonjour" })
      );
    for (let i = 0; i < 5; i += 1) await envoyer();
    expect((await envoyer()).message).toContain(contact.email);
  });

  describe("lien personnalisé d'origine", () => {
    const base = { nom: "Jean", email: "jean@exemple.fr", message: "Bonjour" };

    it("indique le lien personnalisé d'origine", async () => {
      lienPourAffichage.mockResolvedValue({ nom: "Boulangerie Martin", angle: "vitrine" });
      await submitContactForm(idle, buildFormData({ ...base, pour: "boulangerie-martin-k7f3" }));
      expect(lienPourAffichage).toHaveBeenCalledWith("boulangerie-martin-k7f3");
      expect(sendContactEmail).toHaveBeenCalledWith(
        expect.objectContaining({ lienPersonnalise: "Boulangerie Martin" })
      );
    });

    it("ignore un lien inconnu ou une base indisponible, sans bloquer l'envoi", async () => {
      lienPourAffichage.mockResolvedValue(null);
      const state = await submitContactForm(idle, buildFormData({ ...base, pour: "inconnu-0000" }));
      expect(sendContactEmail).toHaveBeenCalledWith(
        expect.objectContaining({ lienPersonnalise: undefined })
      );
      expect(state.status).toBe("success");
    });

    it("n'interroge pas la base sans jeton", async () => {
      await submitContactForm(idle, buildFormData(base));
      expect(lienPourAffichage).not.toHaveBeenCalled();
    });
  });

  // Revue finale, Important 2 : React vide le formulaire avant chaque action ;
  // l'état d'erreur renvoie la saisie pour la rétablir.
  describe("renvoie la saisie avec chaque erreur", () => {
    const saisie = {
      nom: "Jean",
      email: "jean@exemple.fr",
      telephone: "0612345678",
      message: "Bonjour,\nun long message à ne pas perdre.",
    };

    it("après une validation refusée", async () => {
      const state = await submitContactForm(idle, buildFormData({ ...saisie, email: "pas-un-email" }));
      expect(state.status).toBe("error");
      expect(state.valeurs).toEqual({ ...saisie, email: "pas-un-email" });
    });

    it("après la limite d'envois atteinte", async () => {
      for (let i = 0; i < 5; i += 1) await submitContactForm(idle, buildFormData(saisie));
      const state = await submitContactForm(idle, buildFormData(saisie));
      expect(state.status).toBe("error");
      expect(state.valeurs).toEqual(saisie);
    });

    it("après un échec d'envoi", async () => {
      sendContactEmail.mockRejectedValue(new Error("smtp down"));
      const state = await submitContactForm(idle, buildFormData(saisie));
      expect(state.status).toBe("error");
      expect(state.valeurs).toEqual(saisie);
    });

    it("mais pas après un envoi réussi", async () => {
      const state = await submitContactForm(idle, buildFormData(saisie));
      expect(state.status).toBe("success");
      expect(state.valeurs).toBeUndefined();
    });
  });
});


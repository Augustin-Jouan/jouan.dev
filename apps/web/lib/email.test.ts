import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMail = vi.fn();
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail })),
  },
}));

import { envoyerMail, sendContactEmail } from "./email";

describe("sendContactEmail", () => {
  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: "test" });
    process.env.SMTP_HOST = "smtp.test";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "true";
    process.env.SMTP_USER = "user@test";
    process.env.SMTP_PASS = "secret";
    process.env.CONTACT_TO = "dest@test";
    process.env.CONTACT_FROM = "from@test";
  });

  it("envoie un email avec to, from et replyTo corrects", async () => {
    await sendContactEmail({
      nom: "Jean Dupont",
      email: "jean@exemple.fr",
      telephone: "0612345678",
      message: "Bonjour, je souhaite un devis.",
    });

    expect(sendMail).toHaveBeenCalledOnce();
    const arg = sendMail.mock.calls[0][0];
    expect(arg.to).toBe("dest@test");
    expect(arg.from).toBe("from@test");
    expect(arg.replyTo).toBe("jean@exemple.fr");
    expect(arg.subject).toContain("Jean Dupont");
    expect(arg.text).toContain("0612345678");
    expect(arg.text).toContain("Bonjour, je souhaite un devis.");
  });

  it("omet la ligne téléphone quand il est absent", async () => {
    await sendContactEmail({
      nom: "Jean",
      email: "jean@exemple.fr",
      message: "Bonjour",
    });

    const arg = sendMail.mock.calls[0][0];
    expect(arg.text).not.toContain("Téléphone");
  });

  it("lance une erreur si une variable SMTP manque", async () => {
    delete process.env.SMTP_HOST;
    await expect(
      sendContactEmail({ nom: "Jean", email: "jean@exemple.fr", message: "Bonjour" })
    ).rejects.toThrow("SMTP_HOST");
  });

  it("mentionne le lien personnalisé d'origine", async () => {
    await sendContactEmail({ nom: "Jean", email: "jean@exemple.fr", message: "Bonjour", lienPersonnalise: "Boulangerie Martin" });
    expect(sendMail.mock.calls[0][0].text).toMatch(/^Message envoyé depuis le lien de Boulangerie Martin\n\n/);
  });

  it("envoie un mail libre sans adresse de réponse", async () => {
    await envoyerMail({ sujet: "Sujet", texte: "Corps" });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Sujet", text: "Corps", to: "dest@test", replyTo: undefined }),
    );
  });
});

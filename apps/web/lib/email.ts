import nodemailer from "nodemailer";

export type ContactEmailData = {
  nom: string;
  email: string;
  telephone?: string;
  message: string;
  lienPersonnalise?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return value;
}

export type Mail = { sujet: string; texte: string; repondreA?: string };

/** Envoie un mail à CONTACT_TO par le SMTP du site. */
export async function envoyerMail({ sujet, texte, repondreA }: Mail): Promise<void> {
  const host = requireEnv("SMTP_HOST");
  const port = Number(requireEnv("SMTP_PORT"));
  const secure = process.env.SMTP_SECURE === "true";
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASS");
  const to = requireEnv("CONTACT_TO");
  const from = requireEnv("CONTACT_FROM");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to, replyTo: repondreA, subject: sujet, text: texte });
}

export async function sendContactEmail(data: ContactEmailData): Promise<void> {
  const ligneTelephone = data.telephone ? `Téléphone: ${data.telephone}\n` : "";
  const origine = data.lienPersonnalise
    ? `Message envoyé depuis le lien de ${data.lienPersonnalise}\n\n`
    : "";

  await envoyerMail({
    sujet: `Demande de contact — ${data.nom}`,
    texte: `${origine}Nom: ${data.nom}\nEmail: ${data.email}\n${ligneTelephone}\n${data.message}`,
    repondreA: data.email,
  });
}

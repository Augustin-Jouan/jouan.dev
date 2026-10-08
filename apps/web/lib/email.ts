import nodemailer from "nodemailer";

export type ContactEmailData = {
  nom: string;
  email: string;
  telephone?: string;
  message: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return value;
}

export async function sendContactEmail(data: ContactEmailData): Promise<void> {
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

  const ligneTelephone = data.telephone ? `Téléphone: ${data.telephone}\n` : "";

  await transporter.sendMail({
    from,
    to,
    replyTo: data.email,
    subject: `Demande de contact — ${data.nom}`,
    text: `Nom: ${data.nom}\nEmail: ${data.email}\n${ligneTelephone}\n${data.message}`,
  });
}

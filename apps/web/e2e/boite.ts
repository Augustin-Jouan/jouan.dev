import { readFileSync } from "node:fs";
import { simpleParser } from "mailparser";
import { FICHIER_MAILS } from "./smtp-factice";

export type MailRecu = { sujet: string; texte: string };

export async function mailsRecus(): Promise<MailRecu[]> {
  const lignes = readFileSync(FICHIER_MAILS, "utf8").split("\n").filter(Boolean);
  return Promise.all(
    lignes.map(async (ligne) => {
      const mail = await simpleParser(JSON.parse(ligne) as string);
      return { sujet: mail.subject ?? "", texte: mail.text ?? "" };
    }),
  );
}

/** Attend (5 s au plus) un mail qui satisfait `filtre` : l'envoi se fait après la réponse. */
export async function attendreMail(filtre: (m: MailRecu) => boolean): Promise<MailRecu> {
  for (let i = 0; i < 50; i++) {
    const trouve = (await mailsRecus()).find(filtre);
    if (trouve) return trouve;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Mail attendu non reçu");
}

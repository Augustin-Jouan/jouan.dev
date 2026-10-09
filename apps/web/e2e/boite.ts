import { readFileSync } from "node:fs";
import { simpleParser } from "mailparser";
import { FICHIER_MAILS } from "./smtp-factice";

export type MailRecu = { sujet: string; texte: string };

export async function mailsRecus(): Promise<MailRecu[]> {
  const lignes = readFileSync(FICHIER_MAILS, "utf8").split("\n").filter(Boolean);
  const mails = await Promise.all(
    lignes.map(async (ligne) => {
      let brut: string;
      try {
        brut = JSON.parse(ligne) as string;
      } catch {
        return null; // écriture partielle en cours : lue au prochain passage
      }
      const mail = await simpleParser(brut);
      return { sujet: mail.subject ?? "", texte: mail.text ?? "" };
    }),
  );
  return mails.filter((m): m is MailRecu => m !== null);
}

/** Attend (10 s au plus) un mail qui satisfait `filtre` : l'envoi se fait après la réponse. */
export async function attendreMail(filtre: (m: MailRecu) => boolean): Promise<MailRecu> {
  for (let i = 0; i < 100; i++) {
    const trouve = (await mailsRecus()).find(filtre);
    if (trouve) return trouve;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Mail attendu non reçu");
}

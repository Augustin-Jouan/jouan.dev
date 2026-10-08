import { SMTPServer } from "smtp-server";

/** Un message qui contient ce mot est refusé : sert à tester le message d'échec. */
export const MOT_REFUS = "REFUS-SMTP";
export const PORT_SMTP = 2525;

/** Démarré avant les tests (globalSetup) ; la fonction renvoyée l'arrête. */
export default async function demarrerSmtpFactice() {
  const serveur = new SMTPServer({
    authOptional: true,
    allowInsecureAuth: true,
    disabledCommands: ["STARTTLS"],
    logger: false,
    onAuth(_auth, _session, rappel) {
      rappel(null, { user: "test" });
    },
    onData(flux, _session, rappel) {
      let contenu = "";
      flux.on("data", (morceau: Buffer) => {
        contenu += morceau.toString();
      });
      flux.on("end", () => {
        if (!contenu.includes(MOT_REFUS)) return rappel();
        rappel(Object.assign(new Error("Message refusé"), { responseCode: 550 }));
      });
    },
  });

  await new Promise<void>((resoudre) => serveur.listen(PORT_SMTP, "127.0.0.1", resoudre));
  return () => new Promise<void>((resoudre) => serveur.close(() => resoudre()));
}

/**
 * Teste la connexion et l'authentification SMTP avec les variables
 * d'environnement du formulaire de contact, sans envoyer de mail.
 *
 * Usage : node --env-file=.env.local scripts/verifier-smtp.mjs
 *         (ou, dans le conteneur : node scripts/verifier-smtp.mjs)
 *
 * Le mot de passe n'est jamais affiché. En cas d'échec, le code d'erreur
 * de nodemailer et la réponse du serveur indiquent la cause :
 *   EAUTH      identifiants refusés (mot de passe, compte bloqué)
 *   ECONNECTION / ETIMEDOUT   hôte injoignable, port filtré par l'hébergeur
 *   ESOCKET    TLS : SMTP_SECURE ne correspond pas au port (465 = true)
 */
import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, CONTACT_TO, CONTACT_FROM } =
  process.env;

const manquantes = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "CONTACT_TO", "CONTACT_FROM"]
  .filter((nom) => !process.env[nom]);
if (manquantes.length > 0) {
  console.error(`Variables manquantes : ${manquantes.join(", ")}`);
  process.exit(1);
}

console.log(`Serveur   : ${SMTP_HOST}:${SMTP_PORT} (secure=${SMTP_SECURE === "true"})`);
console.log(`Compte    : ${SMTP_USER} (mot de passe : ${SMTP_PASS.length} caractères)`);
console.log(`Expéditeur: ${CONTACT_FROM} → destinataire : ${CONTACT_TO}`);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === "true",
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  connectionTimeout: 15_000,
});

try {
  await transporter.verify();
  console.log("OK : connexion et authentification acceptées.");
} catch (erreur) {
  console.error("ÉCHEC");
  console.error(`  code     : ${erreur.code ?? "?"}`);
  if (erreur.responseCode) console.error(`  réponse  : ${erreur.responseCode}`);
  if (erreur.command) console.error(`  commande : ${erreur.command}`);
  console.error(`  message  : ${String(erreur.message).replaceAll(SMTP_PASS, "***")}`);
  process.exit(1);
}

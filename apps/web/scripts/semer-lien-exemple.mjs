/**
 * Crée le lien d'exemple mesuré par Lighthouse en CI (`/?pour=exemple-0000`).
 * Idempotent. Prérequis : DATABASE_URL et les migrations appliquées.
 */
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(
  `INSERT INTO "Lien" (id, jeton, nom, angle) VALUES ('lien-exemple', 'exemple-0000', 'Exemple', 'application')
   ON CONFLICT (jeton) DO UPDATE SET actif = true`,
);
await client.end();
console.log("Lien d'exemple prêt : /?pour=exemple-0000");

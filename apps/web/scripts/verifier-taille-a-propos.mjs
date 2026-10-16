/**
 * Budget des médias de /a-propos (vidéos, affiches, graphiques de public/a-propos/) :
 * 2 Mio au plus sur le disque. Les vidéos ne se chargent qu'à l'approche, mais le
 * dépôt et l'image Docker les embarquent toutes.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dossier = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "a-propos");
const ko = (o) => (o / 1024).toFixed(1);
const LIMITE = 2 * 1024 * 1024;

if (!existsSync(dossier)) {
  console.error("Médias de /a-propos introuvables : public/a-propos/.");
  process.exit(1);
}
const octets = readdirSync(dossier, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile())
  .reduce((total, e) => total + statSync(join(e.parentPath, e.name)).size, 0);
console.log(`Médias de /a-propos : ${ko(octets)} Ko, limite ${ko(LIMITE)} Ko.`);
if (octets > LIMITE) process.exit(1);

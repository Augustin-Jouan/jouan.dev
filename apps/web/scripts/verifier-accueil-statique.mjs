/**
 * Vérifie, après `pnpm build`, que l'accueil `/` est toujours prérendu :
 * les liens personnalisés passent par le proxy et ne doivent pas le rendre
 * dynamique.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifeste = JSON.parse(readFileSync(join(app, ".next/prerender-manifest.json"), "utf8"));
if (!manifeste.routes?.["/"]) {
  console.error("L'accueil `/` n'est plus prérendu (statique).");
  process.exit(1);
}
console.log("Accueil `/` prérendu : OK.");

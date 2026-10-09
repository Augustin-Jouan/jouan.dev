/**
 * Vérifie, après `pnpm build`, que les pages qui doivent rester statiques sont
 * toujours prérendues : l'accueil `/` (les liens personnalisés passent par le
 * proxy) et les coulisses `/coulisses` (build-info.json est lu au build).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PAGES = ["/", "/coulisses"];
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifeste = JSON.parse(readFileSync(join(app, ".next/prerender-manifest.json"), "utf8"));
const dynamiques = PAGES.filter((page) => !manifeste.routes?.[page]);
if (dynamiques.length > 0) {
  console.error(`Pages qui ne sont plus prérendues (statiques) : ${dynamiques.join(", ")}.`);
  process.exit(1);
}
console.log(`Pages prérendues : ${PAGES.join(", ")} : OK.`);

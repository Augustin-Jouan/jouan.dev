/**
 * Budgets des démos des études de cas.
 * - « Suivi de marchés » : son fichier (HTML, CSS et JavaScript intégrés),
 *   compressé, doit tenir sous 110 Kio. Les polices n'y comptent pas.
 * - Copie du site de l'artisan : 5 Mio au plus sur le disque, et ses onze pages
 *   plus la 404 présentes (scripts/fabriquer-demo-site-artisan.mjs).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const ko = (o) => (o / 1024).toFixed(1);
let echec = false;

const LIMITE = 110 * 1024;
const fichier = join(publicDir, "demo/suivi-de-marches/index.html");
if (!existsSync(fichier)) {
  console.error("Démo introuvable : public/demo/suivi-de-marches/index.html.");
  process.exit(1);
}
const taille = gzipSync(readFileSync(fichier)).length;
console.log(`Démo : ${ko(taille)} Ko compressés, limite ${ko(LIMITE)} Ko.`);
if (taille > LIMITE) echec = true;

const LIMITE_ARTISAN = 5 * 1024 * 1024;
const copie = join(publicDir, "demo/site-artisan");
const PAGES = [
  "index",
  "services",
  "services/electricite",
  "services/plomberie",
  "services/chauffage",
  "services/domotique",
  "realisations",
  "a-propos",
  "contact",
  "mentions-legales",
  "politique-de-confidentialite",
  "404",
];
const manquantes = PAGES.filter((page) => !existsSync(join(copie, `${page}.html`)));
if (manquantes.length > 0) {
  console.error(`Copie du site de l'artisan : pages manquantes (${manquantes.join(", ")}). Relancer pnpm fabriquer-demo-site-artisan.`);
  echec = true;
} else {
  const octets = readdirSync(copie, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .reduce((total, e) => total + statSync(join(e.parentPath, e.name)).size, 0);
  console.log(`Copie du site de l'artisan : ${ko(octets)} Ko, limite ${ko(LIMITE_ARTISAN)} Ko.`);
  if (octets > LIMITE_ARTISAN) echec = true;
}

if (echec) process.exit(1);
